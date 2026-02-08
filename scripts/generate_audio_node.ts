
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import WebSocket from 'ws';
import crypto from 'crypto';
import fs from 'fs/promises';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

// --- CONFIGURATION ---
const SERVICE_ACCOUNT_PATH = 'yaya-35423-firebase-adminsdk-fbsvc-7a6cd497f6.json';
const BUCKET_NAME = 'yaya-35423.firebasestorage.app'; // Bucket name from firebase config

// iFlytek Credentials
const APPID = 'bb34e7a1';
const API_SECRET = 'YmQwYmU0YTA4NzQ2OGEyY2NiYjFhOTQx';
const API_KEY = 'ff81d665c8c0bbc141e0209637f5f4e0';
const TTS_URL = 'wss://tts-api.xfyun.cn/v2/tts';

// --- HELPER FUNCTIONS ---

function getAuthUrl() {
    const host = 'tts-api.xfyun.cn';
    const date = new Date().toUTCString();
    const algorithm = 'hmac-sha256';
    const headers = 'host date request-line';
    const signatureOrigin = `host: ${host}\ndate: ${date}\nGET /v2/tts HTTP/1.1`;

    const signature = crypto.createHmac('sha256', API_SECRET)
        .update(signatureOrigin)
        .digest('base64');

    const authorizationOrigin = `api_key="${API_KEY}", algorithm="${algorithm}", headers="${headers}", signature="${signature}"`;
    const authorization = Buffer.from(authorizationOrigin).toString('base64');

    return `${TTS_URL}?authorization=${authorization}&date=${encodeURI(date)}&host=${host}`;
}

function generateAudio(text: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const url = getAuthUrl();
        const ws = new WebSocket(url);
        const audioChunks: Buffer[] = [];

        ws.on('open', () => {
            const params = {
                common: { app_id: APPID },
                business: {
                    aue: 'lame', sfl: 1, auf: 'audio/L16;rate=16000',
                    vcn: 'x2_eng_f_rachel', // Voice
                    speed: 50, volume: 50, pitch: 50, bgs: 0, tte: 'UTF8',
                },
                data: {
                    status: 2,
                    text: Buffer.from(text).toString('base64'),
                },
            };
            ws.send(JSON.stringify(params));
        });

        ws.on('message', (data) => {
            const response = JSON.parse(data.toString());
            if (response.code !== 0) {
                ws.close();
                reject(new Error(`TTS Error: ${response.message}`));
                return;
            }
            if (response.data && response.data.audio) {
                audioChunks.push(Buffer.from(response.data.audio, 'base64'));
            }
            if (response.data && response.data.status === 2) {
                ws.close();
                resolve(Buffer.concat(audioChunks));
            }
        });

        ws.on('error', (err) => reject(err));
    });
}

async function main() {
    try {
        // 1. Initialize Firebase Admin
        // Adjusted path resolution for ESM
        const __dirname = dirname(fileURLToPath(import.meta.url));
        const serviceAccountPath = resolve(process.cwd(), SERVICE_ACCOUNT_PATH); // Assume run from root

        console.log(`Loading credentials from ${serviceAccountPath}...`);
        // We need to read the JSON file manually because 'import' assert json is still experimental in some node versions
        // or just use require logic via createRequire.
        // But simply reading file and parsing is safest in ESM.
        const serviceAccount = JSON.parse(await fs.readFile(serviceAccountPath, 'utf-8'));

        initializeApp({
            credential: cert(serviceAccount),
            storageBucket: BUCKET_NAME
        });

        const db = getFirestore();
        const bucket = getStorage().bucket();

        // 2. Fetch questions without audio
        console.log("Fetching questions without audio...");
        const questionsRef = db.collection('listeningQuestions');
        const snapshot = await questionsRef.where('audioUrl', '==', '').get();

        if (snapshot.empty) {
            console.log("No questions found needing audio.");
            return;
        }

        console.log(`Found ${snapshot.size} questions to process.`);

        // 3. Process each question
        let successCount = 0;
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const text = data.text;
            const id = doc.id;

            if (!text) continue;

            console.log(`Generating audio for [${id}]: "${text.substring(0, 30)}..."`);

            try {
                // Generate Audio
                const mp3Buffer = await generateAudio(text);

                // Upload to Storage
                const file = bucket.file(`listening_audio/${id}.mp3`);
                const token = crypto.randomUUID();

                await file.save(mp3Buffer, {
                    metadata: {
                        contentType: 'audio/mpeg',
                        metadata: {
                            firebaseStorageDownloadTokens: token // Important for public access via client SDK pattern
                        }
                    }
                });

                // Construct Persistent Download URL
                const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}/o/${encodeURIComponent(file.name)}?alt=media&token=${token}`;

                // Update Firestore
                await doc.ref.update({ audioUrl: downloadUrl });

                console.log(`✅ Success! URL: ${downloadUrl}`);
                successCount++;

                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (err) {
                console.error(`❌ Failed processing ${id}:`, err);
            }
        }

        console.log(`\n🎉 Finished! Processed ${successCount}/${snapshot.size} questions.`);

    } catch (error) {
        console.error("Fatal Error:", error);
    }
}

main();
