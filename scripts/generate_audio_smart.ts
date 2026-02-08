
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
const BUCKET_NAME = 'yaya-35423.firebasestorage.app';

// iFlytek Credentials - Super Smart TTS
const APPID = 'bb34e7a1';
const API_SECRET = 'YmQwYmU0YTA4NzQ2OGEyY2NiYjFhOTQx';
const API_KEY = 'ff81d665c8c0bbc141e0209637f5f4e0';

// WebApi URL provided by user
const TTS_URL = 'wss://cbm01.cn-huabei-1.xf-yun.com/v1/private/mcd9m97e6';

function getAuthUrl() {
    const urlObj = new URL(TTS_URL);
    const host = urlObj.host;
    const path = urlObj.pathname;

    // Date format: RFC1123
    const date = new Date().toUTCString();

    // Algorithm
    const algorithm = 'hmac-sha256';
    const headers = 'host date request-line';

    // Signature Origin
    const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;

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
            console.log("WebSocket connected.");
            // Super Smart TTS Request params
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
                        vcn: "x5_EnUs_Lila_flow", // New voice
                        speed: 50,
                        volume: 50,
                        pitch: 50,
                        bgs: 0,
                        audio: {
                            encoding: "lame", // mp3
                            sample_rate: 16000 // Standard
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
                        text: Buffer.from(text).toString('base64')
                    }
                }
            };
            ws.send(JSON.stringify(params));
        });

        ws.on('message', (data) => {
            try {
                const response = JSON.parse(data.toString());

                if (response.header.code !== 0) {
                    console.error(`TTS Error: ${response.header.message} (Code: ${response.header.code})`);
                    ws.close();
                    reject(new Error(`TTS Error: ${response.header.message}`));
                    return;
                }

                if (response.payload && response.payload.audio && response.payload.audio.audio) {
                    // Audio data is in payload.audio.audio
                    audioChunks.push(Buffer.from(response.payload.audio.audio, 'base64'));
                }

                if (response.header.status === 2) {
                    ws.close();
                    resolve(Buffer.concat(audioChunks));
                }
            } catch (err) {
                console.error("Parse Error:", err);
                ws.close();
                reject(err);
            }
        });

        ws.on('error', (err) => {
            console.error("WS Error:", err);
            reject(err);
        });

        ws.on('close', (code, reason) => {
            // console.log(`WS Closed: ${code} ${reason}`);
        });
    });
}

async function main() {
    try {
        const __dirname = dirname(fileURLToPath(import.meta.url));
        const serviceAccountPath = resolve(process.cwd(), SERVICE_ACCOUNT_PATH);

        console.log(`Using credentials: ${SERVICE_ACCOUNT_PATH}`);
        const serviceAccount = JSON.parse(await fs.readFile(serviceAccountPath, 'utf-8'));

        initializeApp({
            credential: cert(serviceAccount),
            storageBucket: BUCKET_NAME
        });

        const db = getFirestore();
        const bucket = getStorage().bucket();

        // 2. Fetch ALL questions (Regenerate everything)
        // We do NOT filter by empty audioUrl anymore.
        console.log("Fetching ALL questions to regenerate audio with Super Smart TTS...");

        const questionsRef = db.collection('listeningQuestions');
        const snapshot = await questionsRef.get();

        if (snapshot.empty) {
            console.log("No questions found.");
            return;
        }

        console.log(`Found ${snapshot.size} questions to process.`);

        // 3. Process each question
        let successCount = 0;

        // Use a concurrency limit? Sequential is safer for API limits.
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const text = data.text;
            const id = doc.id;

            if (!text) continue;

            console.log(`Generating audio for [${id}] (Lila): "${text.substring(0, 30)}..."`);

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
                            firebaseStorageDownloadTokens: token
                        }
                    }
                });

                // Construct URL
                const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}/o/${encodeURIComponent(file.name)}?alt=media&token=${token}`;

                // Update Firestore
                await doc.ref.update({ audioUrl: downloadUrl });

                console.log(`✅ Success! URL: ${downloadUrl}`);
                successCount++;

                // Rate limiting - wait longer for complex TTS? 
                await new Promise(resolve => setTimeout(resolve, 800));

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
