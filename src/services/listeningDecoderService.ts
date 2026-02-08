/**
 * Listening Decoder Service
 * 
 * Handles:
 * 1. iFlytek TTS audio generation
 * 2. DeepSeek distractor generation
 * 3. Firebase integration for questions and error log
 */

import { db } from '../config/firebase';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    limit,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import CryptoJS from 'crypto-js';

// ===================== TYPES =====================

export interface Distractors {
    phonetic: string[];
    semantic: string[];
    grammatical: string[];
    explanation_cn?: string;
}

export interface QuestionSegment {
    word: string;
    role: 'Question' | 'Auxiliary' | 'Subject' | 'Verb' | 'Object' | 'Adjective' | 'Other';
    distractors: Distractors;
}

export interface ListeningQuestion {
    id: string;
    text: string;
    audioUrl: string;
    segments: QuestionSegment[];
    difficulty: 'Level 1' | 'Level 2' | 'Level 3';
    accent: 'British' | 'American';
    createdAt?: Timestamp;
}

export interface ListeningError {
    id?: string;
    correctWord: string;
    confusedWith: string;
    errorType: 'Phonetic' | 'Semantic' | 'Grammar';
    questionId: string;
    timestamp: Timestamp;
    reviewCount: number;
}

// ===================== IFLYTEK TTS =====================

const XFYUN_TTS_URL = 'wss://tts-api.xfyun.cn/v2/tts';
const XFYUN_APPID = import.meta.env.VITE_XFYUN_APPID || 'bb34e7a1';
const XFYUN_API_KEY = import.meta.env.VITE_XFYUN_API_KEY || 'ff81d665c8c0bbc141e0209637f5f4e0';
const XFYUN_API_SECRET = import.meta.env.VITE_XFYUN_API_SECRET || 'YmQwYmU0YTA4NzQ2OGEyY2NiYjFhOTQx';

/**
 * Generate HMAC-SHA256 signature for iFlytek authentication
 */
function generateXfyunAuthUrl(): string {
    const host = 'tts-api.xfyun.cn';
    const date = new Date().toUTCString();
    const requestLine = 'GET /v2/tts HTTP/1.1';

    // Build signature origin
    const signatureOrigin = `host: ${host}\ndate: ${date}\n${requestLine}`;

    // HMAC-SHA256 signature
    const signatureSha = CryptoJS.HmacSHA256(signatureOrigin, XFYUN_API_SECRET);
    const signature = CryptoJS.enc.Base64.stringify(signatureSha);

    // Authorization header
    const authorizationOrigin = `api_key="${XFYUN_API_KEY}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
    const authorization = btoa(authorizationOrigin);

    // Build final URL
    const url = new URL(XFYUN_TTS_URL);
    url.searchParams.set('authorization', authorization);
    url.searchParams.set('date', date);
    url.searchParams.set('host', host);

    return url.toString();
}

/**
 * Synthesize speech using iFlytek TTS WebSocket API
 * Returns audio as ArrayBuffer (PCM format)
 */
export async function synthesizeSpeech(
    text: string,
    options?: {
        vcn?: string;  // Voice name: 'xiaoyan', 'aisjiuxu' (British), etc.
        speed?: number; // 0-100, default 50
        volume?: number; // 0-100, default 50
    }
): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
        const authUrl = generateXfyunAuthUrl();
        const ws = new WebSocket(authUrl);

        const audioChunks: Uint8Array[] = [];

        ws.onopen = () => {
            // Send TTS request
            const requestData = {
                common: {
                    app_id: XFYUN_APPID
                },
                business: {
                    aue: 'lame', // MP3 format
                    sfl: 1,      // Stream return
                    auf: 'audio/L16;rate=16000',
                    vcn: options?.vcn || 'xiaoyan', // Default Chinese female
                    speed: options?.speed ?? 50,
                    volume: options?.volume ?? 50,
                    tte: 'UTF8'
                },
                data: {
                    status: 2,
                    text: btoa(unescape(encodeURIComponent(text)))
                }
            };

            ws.send(JSON.stringify(requestData));
        };

        ws.onmessage = (event) => {
            try {
                const response = JSON.parse(event.data);

                if (response.code !== 0) {
                    reject(new Error(`TTS Error ${response.code}: ${response.message}`));
                    ws.close();
                    return;
                }

                if (response.data?.audio) {
                    // Decode base64 audio
                    const audioData = Uint8Array.from(atob(response.data.audio), c => c.charCodeAt(0));
                    audioChunks.push(audioData);
                }

                // Check if synthesis complete
                if (response.data?.status === 2) {
                    ws.close();

                    // Combine all chunks
                    const totalLength = audioChunks.reduce((acc, chunk) => acc + chunk.length, 0);
                    const combinedAudio = new Uint8Array(totalLength);
                    let offset = 0;
                    for (const chunk of audioChunks) {
                        combinedAudio.set(chunk, offset);
                        offset += chunk.length;
                    }

                    resolve(combinedAudio.buffer);
                }
            } catch (error) {
                reject(error);
                ws.close();
            }
        };

        ws.onerror = (error) => {
            reject(new Error('WebSocket error: ' + error));
        };

        ws.onclose = () => {
            if (audioChunks.length === 0) {
                reject(new Error('No audio data received'));
            }
        };
    });
}

// ===================== DISTRACTOR GENERATION =====================

const DEEPSEEK_API_URL = "/api/deepseek/chat/completions";

/**
 * Generate distractors for a target word using DeepSeek LLM
 */
export async function generateDistractors(
    sentence: string,
    targetWord: string,
    partOfSpeech: string
): Promise<Distractors> {
    const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;

    if (!apiKey) {
        console.warn("DeepSeek API Key missing, using fallback distractors");
        return {
            phonetic: [],
            semantic: [],
            grammatical: []
        };
    }

    const systemPrompt = `你是一位雅思听力考试出题专家，专门为中国考生设计辨音训练题目的干扰选项。

中国考生常见辨音盲区：
- 长短元音混淆：ship/sheep, full/fool, bit/beat
- 尾辅音脱落：can't 听成 can, walked 听成 walk
- l/r 混淆：light/right, glass/grass
- v/w 混淆：vest/west, vine/wine
- th 发音：think/sink, three/free
- 连读辨识：what are -> "wha-tar"

返回JSON格式，每类2-4个干扰词：
{
  "phonetic": ["读音相似词"],
  "semantic": ["语义相关但错误的词"],
  "grammatical": ["语法形式变体"],
  "explanation_cn": "简短解释"
}`;

    const userPrompt = `句子："${sentence}"
目标词："${targetWord}"
词性："${partOfSpeech}"

生成高质量的干扰选项。`;

    try {
        const response = await fetch(DEEPSEEK_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.7,
                response_format: { type: "json_object" }
            })
        });

        const data = await response.json();
        const content = data.choices[0].message.content;
        return JSON.parse(content);
    } catch (error) {
        console.error("Distractor generation failed:", error);
        return {
            phonetic: [],
            semantic: [],
            grammatical: []
        };
    }
}

// ===================== FIREBASE OPERATIONS =====================

const QUESTIONS_COLLECTION = 'listeningQuestions';

/**
 * Get all listening questions
 */
export async function getListeningQuestions(limitCount = 10): Promise<ListeningQuestion[]> {
    const q = query(
        collection(db, QUESTIONS_COLLECTION),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as ListeningQuestion));
}

/**
 * Get a single question by ID
 */
export async function getQuestionById(questionId: string): Promise<ListeningQuestion | null> {
    const docRef = doc(db, QUESTIONS_COLLECTION, questionId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as ListeningQuestion;
    }
    return null;
}

/**
 * Save a new listening question
 */
export async function saveQuestion(question: Omit<ListeningQuestion, 'id' | 'createdAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, QUESTIONS_COLLECTION), {
        ...question,
        createdAt: serverTimestamp()
    });
    return docRef.id;
}

/**
 * Update an existing listening question
 */
export async function updateQuestion(id: string, updates: Partial<ListeningQuestion>): Promise<void> {
    const docRef = doc(db, QUESTIONS_COLLECTION, id);
    await updateDoc(docRef, updates);
}

/**
 * Delete a listening question
 */
export async function deleteQuestion(id: string): Promise<void> {
    const docRef = doc(db, QUESTIONS_COLLECTION, id);
    await deleteDoc(docRef);
}

/**
 * Record a user's listening error
 */
export async function recordListeningError(
    userId: string,
    error: Omit<ListeningError, 'id' | 'timestamp' | 'reviewCount'>
): Promise<void> {
    const errorsCollection = collection(db, `users/${userId}/listeningErrors`);
    await addDoc(errorsCollection, {
        ...error,
        timestamp: serverTimestamp(),
        reviewCount: 0
    });
}

/**
 * Get user's listening errors
 */
export async function getUserErrors(userId: string): Promise<ListeningError[]> {
    const q = query(
        collection(db, `users/${userId}/listeningErrors`),
        orderBy('timestamp', 'desc'),
        limit(50)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as ListeningError));
}

// ===================== AUDIO UPLOAD =====================

/**
 * Upload TTS audio to Firebase Storage and return download URL
 */
export async function uploadAudioToStorage(
    questionId: string,
    audioBuffer: ArrayBuffer
): Promise<string> {
    const storage = getStorage();
    const audioRef = ref(storage, `listening-decoder/audio/${questionId}.mp3`);

    const blob = new Blob([audioBuffer], { type: 'audio/mp3' });
    await uploadBytes(audioRef, blob);

    return await getDownloadURL(audioRef);
}

// ===================== BATCH IMPORT =====================

export interface QuestionImportData {
    text: string;
    difficulty: 'Level 1' | 'Level 2' | 'Level 3';
    accent: 'British' | 'American';
}

/**
 * Import questions from JSON, generate TTS audio and distractors
 */
export async function importQuestions(
    questions: QuestionImportData[],
    onProgress?: (current: number, total: number) => void
): Promise<void> {
    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];

        try {
            // 1. Generate TTS audio
            const audioBuffer = await synthesizeSpeech(q.text, {
                vcn: q.accent === 'British' ? 'xiaoyan' : 'xiaoyan', // TODO: Use English voices when available
                speed: 50
            });

            // 2. Parse sentence into segments (simple word split for now)
            const words = q.text.replace(/[?.!,]/g, '').split(' ').filter(w => w.length > 0);
            const segments: QuestionSegment[] = [];

            for (const word of words) {
                // Generate distractors for each word
                const distractors = await generateDistractors(q.text, word, 'Word');
                segments.push({
                    word,
                    role: 'Other', // TODO: Add proper POS tagging
                    distractors
                });
            }

            // 3. Create temp ID and upload audio
            const tempId = `q_${Date.now()}_${i}`;
            const audioUrl = await uploadAudioToStorage(tempId, audioBuffer);

            // 4. Save to Firestore
            await saveQuestion({
                text: q.text,
                audioUrl,
                segments,
                difficulty: q.difficulty,
                accent: q.accent
            });

            onProgress?.(i + 1, questions.length);
        } catch (error) {
            console.error(`Failed to import question ${i}:`, error);
        }
    }
}

// ===================== SAMPLE DATA =====================

/**
 * Seed sample questions for testing (with pre-defined distractors, no API calls)
 */
export async function seedSampleQuestions(): Promise<void> {
    // Pre-defined questions with hardcoded distractors
    const sampleQuestions: Omit<ListeningQuestion, 'id' | 'createdAt'>[] = [
        {
            text: "Why did you choose this subject?",
            audioUrl: "", // Will be empty until TTS is configured
            difficulty: "Level 1",
            accent: "British",
            segments: [
                { word: "Why", role: "Question", distractors: { phonetic: ["While", "White"], semantic: ["What", "When", "How"], grammatical: [] } },
                { word: "did", role: "Auxiliary", distractors: { phonetic: ["deed"], semantic: ["do", "does"], grammatical: ["do", "does", "done"] } },
                { word: "you", role: "Subject", distractors: { phonetic: ["your", "yew"], semantic: ["he", "she", "they"], grammatical: [] } },
                { word: "choose", role: "Verb", distractors: { phonetic: ["shoes", "juice", "chews"], semantic: ["select", "pick"], grammatical: ["chose", "chosen", "choosing"] } },
                { word: "this", role: "Other", distractors: { phonetic: ["these", "thus"], semantic: ["that", "the"], grammatical: [] } },
                { word: "subject", role: "Object", distractors: { phonetic: ["subtract"], semantic: ["topic", "course", "major"], grammatical: ["subjects"] } }
            ]
        },
        {
            text: "Where is the nearest train station?",
            audioUrl: "",
            difficulty: "Level 1",
            accent: "British",
            segments: [
                { word: "Where", role: "Question", distractors: { phonetic: ["Wear", "Were"], semantic: ["What", "When", "Which"], grammatical: [] } },
                { word: "is", role: "Auxiliary", distractors: { phonetic: ["his", "ease"], semantic: ["are", "was"], grammatical: ["are", "was", "were"] } },
                { word: "the", role: "Other", distractors: { phonetic: ["they", "that"], semantic: ["a", "an"], grammatical: [] } },
                { word: "nearest", role: "Adjective", distractors: { phonetic: [], semantic: ["closest", "next"], grammatical: ["near", "nearer"] } },
                { word: "train", role: "Object", distractors: { phonetic: ["rain", "terrain"], semantic: ["bus", "tram", "metro"], grammatical: ["trains"] } },
                { word: "station", role: "Object", distractors: { phonetic: ["nation", "stain"], semantic: ["stop", "terminal", "platform"], grammatical: ["stations"] } }
            ]
        },
        {
            text: "Can you describe your hometown?",
            audioUrl: "",
            difficulty: "Level 2",
            accent: "American",
            segments: [
                { word: "Can", role: "Auxiliary", distractors: { phonetic: ["can't", "Ken"], semantic: ["Could", "Will"], grammatical: ["Could", "May"] } },
                { word: "you", role: "Subject", distractors: { phonetic: ["your", "yew"], semantic: ["he", "she"], grammatical: [] } },
                { word: "describe", role: "Verb", distractors: { phonetic: [], semantic: ["explain", "tell", "talk about"], grammatical: ["described", "describing", "description"] } },
                { word: "your", role: "Other", distractors: { phonetic: ["you", "you're"], semantic: ["my", "his", "her"], grammatical: [] } },
                { word: "hometown", role: "Object", distractors: { phonetic: [], semantic: ["city", "village", "country"], grammatical: ["hometowns"] } }
            ]
        }
    ];

    console.log("Seeding sample questions with pre-defined distractors...");

    for (let i = 0; i < sampleQuestions.length; i++) {
        try {
            await saveQuestion(sampleQuestions[i]);
            console.log(`Seeded question ${i + 1}/${sampleQuestions.length}`);
        } catch (error) {
            console.error(`Failed to seed question ${i}:`, error);
        }
    }

    console.log("Sample questions seeded successfully!");
}

