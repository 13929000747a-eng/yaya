export class BrowserSpeechService {
    private recognition: any = null;
    private onResult: ((text: string, isLast: boolean) => void) | null = null;
    private onError: ((error: any) => void) | null = null;
    private isListening: boolean = false;
    private finalTranscript: string = "";

    constructor() {
        if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
            // @ts-ignore
            const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true; // Keep listening logic
            this.recognition.interimResults = true; // Real-time feedback
            this.recognition.lang = 'en-US'; // Default to English

            this.recognition.onresult = (event: any) => {
                let interimTranscript = '';

                // Native API returns a list of results. We need to handle accumulation logic.
                // However, 'continuous=true' means the API keeps the session open.
                // We need to manage `finalTranscript` manually if we want to reset or persist.
                // Actually, the API event contains everything? 
                // No, event.results is an array.

                // Let's rely on event.resultIndex to know where to start reading

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        this.finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }

                const fullText = this.finalTranscript + interimTranscript;

                // console.log('[WebSpeech] Result:', fullText);
                if (this.onResult) {
                    this.onResult(fullText, false);
                }
            };

            this.recognition.onerror = (event: any) => {
                console.error('[WebSpeech] Error:', event.error);
                if (this.onError) this.onError(event.error);
            };

            this.recognition.onend = () => {
                this.isListening = false;
                console.log('[WebSpeech] Stopped');
            };
        } else {
            console.error('[WebSpeech] Browser not supported.');
        }
    }

    start(onResult: (text: string, isLast: boolean) => void, onError: (err: any) => void) {
        if (!this.recognition) return;

        this.onResult = onResult;
        this.onError = onError;
        this.finalTranscript = ""; // Reset transcript on start

        try {
            this.recognition.start();
            this.isListening = true;
            console.log('[WebSpeech] Started listening');
        } catch (e) {
            console.error('[WebSpeech] Start failed:', e);
            // Handle case where it's already started
        }
    }

    stop() {
        if (!this.recognition) return;
        try {
            this.recognition.stop();
            this.isListening = false;
        } catch (e) {
            console.error('[WebSpeech] Stop failed:', e);
        }
    }
}
