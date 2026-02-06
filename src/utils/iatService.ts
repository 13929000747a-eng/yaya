import CryptoJS from 'crypto-js';

// Configuration - Standard IAT (语音听写流式版)
// Documentation: https://www.xfyun.cn/doc/asr/voicedictation/API.html
const APPID = 'bb34e7a1';
const API_SECRET = 'YmQwYmU0YTA4NzQ2OGEyY2NiYjFhOTQx';
const API_KEY = 'ff81d665c8c0bbc141e0209637f5f4e0';

// Standard IAT API Host (v2)
const API_HOST = 'iat-api.xfyun.cn';

export class IatService {
    private socket: WebSocket | null = null;
    private onResult: ((text: string, isLast: boolean) => void) | null = null;
    private onError: ((error: any) => void) | null = null;
    private status: 'init' | 'sending' | 'end' = 'init';

    // Result buffering for WPGS
    private resultMap: Record<string, string> = {};

    constructor() { }

    private getAuthUrl(): string {
        const date = new Date().toUTCString();
        const requestLine = `GET /v2/iat HTTP/1.1`;

        const signatureOrigin = `host: ${API_HOST}\ndate: ${date}\n${requestLine}`;
        const signatureSha = CryptoJS.HmacSHA256(signatureOrigin, API_SECRET);
        const signature = CryptoJS.enc.Base64.stringify(signatureSha);

        const authorizationOrigin = `api_key="${API_KEY}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
        const authorization = btoa(authorizationOrigin);

        return `wss://${API_HOST}/v2/iat?authorization=${authorization}&date=${encodeURIComponent(date)}&host=${API_HOST}`;
    }

    connect(onResult: (text: string, isLast: boolean) => void, onError: (err: any) => void) {
        this.onResult = onResult;
        this.onError = onError;
        this.status = 'init';
        this.resultMap = {}; // Reset buffer

        try {
            const url = this.getAuthUrl();
            console.log('[IAT] Connecting to standard API with WPGS:', url);
            this.socket = new WebSocket(url);

            this.socket.onopen = () => {
                console.log('[IAT] WebSocket Connected');
            };

            this.socket.onmessage = (event) => {
                try {
                    const response = JSON.parse(event.data);

                    if (response.code !== 0) {
                        console.error('[IAT] Error Code:', response.code, response.message);
                        if (this.onError) this.onError(response);
                        this.close();
                        return;
                    }

                    if (response.data?.result) {
                        const result = response.data.result;
                        const ws = result.ws;

                        let str = "";
                        if (ws) {
                            ws.forEach((item: any) => {
                                item.cw?.forEach((w: any) => {
                                    str += w.w;
                                });
                            });
                        }

                        // Handling WPGS (Dynamic Correction) logic
                        // If pgs is 'rpl', it replaces content for this 'sn'
                        // If pgs is 'apd', it appends (but here we just use sn as unique key)
                        // Actually, basic logic is: resultMap[sn] = text;
                        // But note: sometimes 'rg' (replacement group) indicates we should discard multiple sentences.
                        // For standard usage, sn is monotonically increasing. 'rpl' usually updates the SAME sn or previous sn.

                        // Robust logic:
                        // 1. If pgs == 'rpl', look at rg. 
                        //    rg=[start, end] means replace sentences from start to end with this result.
                        //    But for simplicity, typically sn is the definitive key.

                        if (result.pgs === 'rpl') {
                            // This result replaces a range of sentences.
                            // The current result corresponds to result.sn?
                            // Actually documentation says: pgs="rpl", rg=[1, 1] means replace sn=1 with this result.
                            // So simply:
                            if (result.rg) {
                                // Clear buffer for the replaced range
                                const [start, end] = result.rg;
                                for (let i = start; i <= end; i++) {
                                    delete this.resultMap[i];
                                }
                            }
                            this.resultMap[result.sn] = str;
                        } else {
                            // "apd" or no pgs
                            this.resultMap[result.sn] = str;
                        }

                        // Construct full text
                        // Need to sort keys to maintain order
                        // keys are strings, parse to int
                        const fullText = Object.keys(this.resultMap)
                            .map(key => parseInt(key))
                            .sort((a, b) => a - b)
                            .map(key => this.resultMap[key])
                            .join("");

                        // console.log('[IAT] Full Text:', fullText);

                        if (this.onResult) {
                            // We now send the FULL text every time, so the UI should replace, not append.
                            // But wait, the UI code expects `text` to be appended?
                            // Let's check Level2SentenceCompletion.tsx. 
                            // It does: setTranscript(prev => prev + text). This IS the problem.
                            // I need to change IatService to return the DELTA? No.
                            // I MUST Change the contract: onResult returns FULL TEXT.

                            // To keep it compatible with existing UI logic (append), I would need to calculate delta.
                            // But existing UI logic has a bug: it blindly appends.
                            // Better: Change UI to accept full text.

                            // However, I can't change UI in this specific Step easily without user knowing?
                            // No, I am authorized to refactor.

                            // Let's try to adapt to the UI: 
                            // UI: setTranscript(prev => { const newVal = prev + text; ... })
                            // If I return the full text, UI will duplicate it endlessly: "Hel" -> "Hello" => "HelHello".

                            // Solution: I must change Level2SentenceCompletion.tsx as well.
                            // I will do that in the NEXT step.
                            // For now, I emit fullText.
                            this.onResult(fullText, result.ls === true);
                        }

                        if (result.ls === true) {
                            this.close();
                        }
                    }
                } catch (e) {
                    console.error('[IAT] Parse error:', e);
                }
            };

            this.socket.onerror = (err) => {
                console.error('[IAT] WebSocket Error:', err);
                if (this.onError) this.onError(err);
            };

        } catch (e) {
            console.error('[IAT] Init failed:', e);
        }
    }

    sendAudio(data: ArrayBuffer) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            return;
        }

        const array = new Uint8Array(data);
        const audioBase64 = this.arrayBufferToBase64(array);

        const frame: any = {
            data: {
                status: 1,
                format: "audio/L16;rate=16000",
                encoding: "raw",
                audio: audioBase64
            }
        };

        if (this.status === 'init') {
            this.status = 'sending';
            frame.common = { app_id: APPID };
            frame.business = {
                language: "en_us",
                domain: "iat",
                accent: "mandarin",
                vad_eos: 2000,
                dwa: "wpgs" // Enable Dynamic Correction
            };
            frame.data.status = 0;
        }

        this.socket.send(JSON.stringify(frame));
    }

    // ... existing stop/close/helper methods ...
    stop() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                data: {
                    status: 2,
                    format: "audio/L16;rate=16000",
                    encoding: "raw",
                    audio: ""
                }
            }));
        }
    }

    close() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }

    private arrayBufferToBase64(buffer: Uint8Array): string {
        let binary = '';
        const len = buffer.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(buffer[i]);
        }
        return window.btoa(binary);
    }
}
