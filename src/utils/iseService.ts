import CryptoJS from 'crypto-js';

const APPID = 'bb34e7a1';
const API_SECRET = 'YmQwYmU0YTA4NzQ2OGEyY2NiYjFhOTQx';
const API_KEY = 'ff81d665c8c0bbc141e0209637f5f4e0';

export interface IseResult {
    score: number;
    grade: string;
    fluency: number;
    integrity: number;
    accuracy: number;
    details?: any;
}

export class IseService {
    private socket: WebSocket | null = null;
    private onResult: ((result: IseResult) => void) | null = null;
    private onError: ((error: any) => void) | null = null;
    private status: 'init' | 'first_audio' | 'middle_audio' | 'last_audio' = 'init';

    constructor() { }

    private getAuthUrl(): string {
        const host = 'ise-api.xfyun.cn';
        const date = new Date().toUTCString();
        const requestLine = `GET /v2/open-ise HTTP/1.1`;

        const signatureOrigin = `host: ${host}\ndate: ${date}\n${requestLine}`;
        const signatureSha = CryptoJS.HmacSHA256(signatureOrigin, API_SECRET);
        const signature = CryptoJS.enc.Base64.stringify(signatureSha);

        const authorizationOrigin = `api_key="${API_KEY}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
        const authorization = btoa(authorizationOrigin);

        return `wss://${host}/v2/open-ise?authorization=${authorization}&date=${encodeURI(date)}&host=${host}`;
    }

    connect(text: string, onResult: (res: IseResult) => void, onError: (err: any) => void) {
        this.onResult = onResult;
        this.onError = onError;
        this.status = 'init';

        try {
            const url = this.getAuthUrl();
            this.socket = new WebSocket(url);

            this.socket.onopen = () => {
                // Send First Frame: Parameters
                const frame = {
                    common: {
                        app_id: APPID
                    },
                    business: {
                        category: 'read_sentence',
                        cmd: 'ssb',
                        ent: 'en_vip',
                        sub: 'ise',
                        tte: 'utf-8',
                        aue: 'raw',
                        auf: 'audio/L16;rate=16000',
                        rst: 'xml',
                        check_type: '0',
                        text: '\uFEFF' + text, // BOM + text
                        ttp_skip: true
                    },
                    data: {
                        status: 0
                    }
                };
                this.socket?.send(JSON.stringify(frame));
                this.status = 'first_audio';
            };

            this.socket.onmessage = (event) => {
                const response = JSON.parse(event.data);
                if (response.code !== 0) {
                    console.error('ISE Error:', response);
                    if (this.onError) this.onError(response);
                    this.close();
                    return;
                }

                if (response.data) {
                    if (response.data.status === 2 && response.data.data) {
                        const resultXml = atob(response.data.data);
                        this.parseResult(resultXml);
                        this.close();
                    }
                }
            };

            this.socket.onerror = (err: Event) => {
                console.error("WebSocket Error Event:", err);
                if (this.onError) {
                    // WebSocket 'error' events don't carry message details.
                    // We can only infer it's a connection issue.
                    this.onError("WebSocket Connection Failed. Please check your network or API credentials.");
                }
            };

        } catch (e) {
            if (this.onError) this.onError(e);
        }
    }

    sendAudio(data: ArrayBuffer) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            const array = new Uint8Array(data);
            let binaryString = "";
            for (let i = 0; i < array.byteLength; i++) {
                binaryString += String.fromCharCode(array[i]);
            }
            const audioBase64 = btoa(binaryString);

            let aus = 2; // Default to middle audio
            if (this.status === 'first_audio') {
                aus = 1;
                this.status = 'middle_audio';
            }

            const frame = {
                business: {
                    cmd: 'auw',
                    aus: aus,
                    aue: 'raw'
                },
                data: {
                    status: 1,
                    data: audioBase64
                }
            };
            this.socket.send(JSON.stringify(frame));
        }
    }

    stop() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            // Send status 2 (last frame), aus=4
            const frame = {
                business: {
                    cmd: 'auw',
                    aus: 4,
                    aue: 'raw'
                },
                data: {
                    status: 2,
                    data: ''
                }
            };
            this.socket.send(JSON.stringify(frame));
        }
    }

    close() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }

    private parseResult(xmlStr: string) {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlStr, "text/xml");

            const totalScoreStr = xmlDoc.querySelector('[total_score]')?.getAttribute('total_score');
            const fluencyScoreStr = xmlDoc.querySelector('[fluency_score]')?.getAttribute('fluency_score');
            const integrityScoreStr = xmlDoc.querySelector('[integrity_score]')?.getAttribute('integrity_score');
            const phoneScoreStr = xmlDoc.querySelector('[phone_score]')?.getAttribute('phone_score');

            const result: IseResult = {
                score: totalScoreStr ? parseFloat(totalScoreStr) : 0,
                grade: 'B',
                fluency: fluencyScoreStr ? parseFloat(fluencyScoreStr) : 0,
                integrity: integrityScoreStr ? parseFloat(integrityScoreStr) : 0,
                accuracy: phoneScoreStr ? parseFloat(phoneScoreStr) : 0,
                details: xmlStr.substring(0, 200) + "..."
            };

            if (this.onResult) this.onResult(result);

        } catch (e) {
            console.error("Error parsing XML result", e);
        }
    }
}
