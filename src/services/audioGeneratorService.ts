import CryptoJS from 'crypto-js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '../config/firebase'; // Ensure this exports your initialized db
import { doc, updateDoc, getDocs, collection, query, where } from 'firebase/firestore';

// iFlytek Credentials
const APPID = 'bb34e7a1';
const API_SECRET = 'YmQwYmU0YTA4NzQ2OGEyY2NiYjFhOTQx';
const API_KEY = 'ff81d665c8c0bbc141e0209637f5f4e0';

// Super Smart TTS URL
const TTS_URL = 'wss://cbm01.cn-huabei-1.xf-yun.com/v1/private/mcd9m97e6';

function getAuthUrl() {
    const urlObj = new URL(TTS_URL);
    const host = urlObj.host;
    const path = urlObj.pathname;
    const date = new Date().toUTCString();
    const algorithm = 'hmac-sha256';
    const headers = 'host date request-line';
    const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;

    // @ts-ignore
    const signatureSha = CryptoJS.HmacSHA256(signatureOrigin, API_SECRET);
    const signature = CryptoJS.enc.Base64.stringify(signatureSha);

    const authorizationOrigin = `api_key="${API_KEY}", algorithm="${algorithm}", headers="${headers}", signature="${signature}"`;
    const authorization = btoa(authorizationOrigin);

    return `${TTS_URL}?authorization=${authorization}&date=${encodeURI(date)}&host=${host}`;
}

export async function generateAudioForText(text: string): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
        const url = getAuthUrl();
        const ws = new WebSocket(url);
        const audioChunks: Uint8Array[] = [];

        ws.onopen = () => {
            console.log("WebSocket connected for Smart TTS");
            const params = {
                header: {
                    app_id: APPID,
                    status: 2
                },
                parameter: {
                    oral: {
                        oral_level: "mid"
                    },
                    tts: {
                        vcn: "x5_EnUs_Lila_flow",
                        speed: 50,
                        volume: 50,
                        pitch: 50,
                        bgs: 0,
                        audio: {
                            encoding: "lame",
                            sample_rate: 16000
                        },
                        pybuf: {
                            encoding: "utf8",
                            compress: "raw",
                            format: "plain"
                        }
                    }
                },
                payload: {
                    text: {
                        encoding: "utf8",
                        compress: "raw",
                        format: "plain",
                        status: 2,
                        text: btoa(text)
                    }
                }
            };
            ws.send(JSON.stringify(params));
        };

        ws.onmessage = (e) => {
            try {
                const jsonData = JSON.parse(e.data as string);

                if (jsonData.header && jsonData.header.code !== 0) {
                    console.error(`TTS Error Code ${jsonData.header.code}: ${jsonData.header.message}`);
                    ws.close();
                    reject(new Error(`TTS Error: ${jsonData.header.message}`));
                    return;
                }

                if (jsonData.payload && jsonData.payload.audio && jsonData.payload.audio.audio) {
                    const raw = atob(jsonData.payload.audio.audio);
                    const array = new Uint8Array(raw.length);
                    for (let i = 0; i < raw.length; i++) {
                        array[i] = raw.charCodeAt(i);
                    }
                    audioChunks.push(array);
                }

                if (jsonData.header && jsonData.header.status === 2) {
                    ws.close();
                    const totalLength = audioChunks.reduce((acc, chunk) => acc + chunk.length, 0);
                    const result = new Uint8Array(totalLength);
                    let offset = 0;
                    for (const chunk of audioChunks) {
                        result.set(chunk, offset);
                        offset += chunk.length;
                    }
                    resolve(result.buffer);
                }
            } catch (err) {
                console.error("Error parsing WebSocket message:", err);
                reject(err);
            }
        };

        ws.onerror = (e) => {
            console.error("WebSocket error:", e);
            reject(new Error("WebSocket connection error"));
        };
    });
}

/**
 * Upload TTS audio to Firebase Storage and return download URL
 */
export async function uploadAudioToStorage(questionId: string, audioBuffer: ArrayBuffer): Promise<string> {
    const storage = getStorage();
    const audioRef = ref(storage, `listening_audio/${questionId}.mp3`);
    await uploadBytes(audioRef, audioBuffer, { contentType: 'audio/mpeg' });
    return await getDownloadURL(audioRef);
}

/**
 * Process all questions with missing audio URLs
 * Generates audio, uploads to Firebase Storage, updates Firestore
 */
export async function processMissingAudio() {
    console.log("Starting batch audio generation...");

    // Find questions with empty audioUrl
    // Note: This requires an index in Firestore usually, but for small datasets might work without.
    // If it fails on index, fetch all and filter client-side (safe for <100 docs)

    let questionsToProcess: any[] = [];
    try {
        const q = query(collection(db, 'listeningQuestions'), where('audioUrl', '==', ''));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(doc => {
            questionsToProcess.push({ id: doc.id, ...doc.data() });
        });
    } catch (err) {
        console.warn("Index query failed, falling back to client-side filter", err);
        const querySnapshot = await getDocs(collection(db, 'listeningQuestions'));
        querySnapshot.forEach(doc => {
            const data = doc.data();
            if (!data.audioUrl) {
                questionsToProcess.push({ id: doc.id, ...data });
            }
        });
    }

    if (questionsToProcess.length === 0) {
        console.log("No questions need audio generation.");
        return 0;
    }

    console.log(`Found ${questionsToProcess.length} questions to process.`);
    const storage = getStorage();
    let successCount = 0;

    for (const q of questionsToProcess) {
        const text = q.text as string;
        const id = q.id as string;

        if (!text) continue;

        try {
            console.log(`Generating audio for [${id}]: "${text.substring(0, 20)}..."`);

            // 1. Generate Audio
            const audioBuffer = await generateAudioForText(text);

            // 2. Upload to Storage
            const storageRef = ref(storage, `listening_audio/${id}.mp3`);
            await uploadBytes(storageRef, audioBuffer, { contentType: 'audio/mpeg' });

            // 3. Get URL
            const downloadUrl = await getDownloadURL(storageRef);

            // 4. Update Firestore
            await updateDoc(doc(db, 'listeningQuestions', id), {
                audioUrl: downloadUrl
            });

            successCount++;
            console.log(`Saved audio to: ${downloadUrl}`);

            // Rate limiting delay (important for free tier API)
            await new Promise(r => setTimeout(r, 600));

        } catch (error) {
            console.error(`Failed to process question ${id}:`, error);
        }
    }

    return successCount;
}
