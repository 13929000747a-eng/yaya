export class AudioRecorder {
    private mediaStream: MediaStream | null = null;
    private audioContext: AudioContext | null = null;
    private processor: ScriptProcessorNode | null = null;
    private input: MediaStreamAudioSourceNode | null = null;
    private onAudioData: ((data: ArrayBuffer) => void) | null = null;

    // Buffer for accumulation
    private audioBuffer: Int16Array = new Int16Array(0);
    private readonly TARGET_SAMPLE_RATE = 16000;
    private readonly CHUNK_SIZE = 1280; // 40ms bytes at 16k

    // Resampling state
    private bufferCache: Float32Array = new Float32Array(0);

    constructor() { }

    async start(onAudioData: (data: ArrayBuffer) => void, onVolumeChange?: (rms: number) => void) {
        this.onAudioData = onAudioData;
        this.audioBuffer = new Int16Array(0);
        this.bufferCache = new Float32Array(0);

        try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    // note: we don't strictly enforce sampleRate here as browsers might ignore it
                },
            });

            // Allow browser to pick native sample rate (often 44100 or 48000) for best support
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const actualSampleRate = this.audioContext.sampleRate;
            console.log(`[AudioRecorder] Context Sample Rate: ${actualSampleRate}Hz. Target: ${this.TARGET_SAMPLE_RATE}Hz`);

            const source = this.audioContext.createMediaStreamSource(this.mediaStream);
            this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

            this.processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);

                // Calculate RMS for volume visualization
                let sum = 0;
                for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
                const rms = Math.sqrt(sum / inputData.length);
                if (onVolumeChange) onVolumeChange(rms);

                if (actualSampleRate !== this.TARGET_SAMPLE_RATE) {
                    this.processResampledAudio(inputData, actualSampleRate);
                } else {
                    this.processAudio(inputData);
                }
            };

            source.connect(this.processor);
            this.processor.connect(this.audioContext.destination);
            this.input = source;

        } catch (error) {
            console.error("Error starting recording:", error);
            throw error;
        }
    }

    private logVolume(data: Float32Array) {
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
        const rms = Math.sqrt(sum / data.length);
        if (rms > 0.01) console.log("Mic Input Volume (RMS):", rms.toFixed(4));
    }

    private processResampledAudio(inputData: Float32Array, inputSampleRate: number) {
        // Linear Interpolation Resampling
        // 1. Append new data to cache
        const newCache = new Float32Array(this.bufferCache.length + inputData.length);
        newCache.set(this.bufferCache);
        newCache.set(inputData, this.bufferCache.length);
        this.bufferCache = newCache;

        // 2. Calculate how many output samples we can produce
        const ratio = inputSampleRate / this.TARGET_SAMPLE_RATE;
        const outputLength = Math.floor(this.bufferCache.length / ratio);

        const resampledData = new Float32Array(outputLength);

        for (let i = 0; i < outputLength; i++) {
            const originalIndex = i * ratio;
            const index1 = Math.floor(originalIndex);
            const index2 = Math.min(index1 + 1, this.bufferCache.length - 1);
            const fraction = originalIndex - index1;

            const s1 = this.bufferCache[index1];
            const s2 = this.bufferCache[index2];
            resampledData[i] = s1 + (s2 - s1) * fraction;
        }

        // 3. Keep remaining cache
        // The samples consumed were up to outputLength * ratio
        const consumedInput = Math.floor(outputLength * ratio);
        this.bufferCache = this.bufferCache.slice(consumedInput);

        // 4. Process the resampled data
        this.processAudio(resampledData);
    }

    private processAudio(inputData: Float32Array) {
        // 1. Convert Float32 to Int16
        const int16Data = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
            let s = Math.max(-1, Math.min(1, inputData[i]));
            int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // 2. Append to buffer
        const newBuffer = new Int16Array(this.audioBuffer.length + int16Data.length);
        newBuffer.set(this.audioBuffer);
        newBuffer.set(int16Data, this.audioBuffer.length);
        this.audioBuffer = newBuffer;

        // 3. Extract chunks of CHUNK_SIZE
        while (this.audioBuffer.length >= this.CHUNK_SIZE / 2) {
            const chunkLength = this.CHUNK_SIZE / 2;
            const chunk = this.audioBuffer.slice(0, chunkLength);
            this.audioBuffer = this.audioBuffer.slice(chunkLength);

            if (this.onAudioData) {
                this.onAudioData(chunk.buffer);
            }
        }
    }

    stop() {
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
        if (this.processor) {
            this.processor.disconnect();
            this.processor = null;
        }
        if (this.input) {
            this.input.disconnect();
            this.input = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.audioBuffer = new Int16Array(0);
        this.bufferCache = new Float32Array(0);
    }
}
