export type AnalysisResult = {
    success: boolean;
    message: string;
    score?: string; // Band 4.0, 5.0, etc.
    feedback?: string;
};

export const simulateAnalysis = (
    level: 1 | 2 | 3,
    transcript: string
): Promise<AnalysisResult> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            // Simple heuristic for demo: if transcript is empty, fail (simulated silence)
            // But for "Zero Pressure", we usually assume user tries.

            const result: AnalysisResult = {
                success: true,
                message: 'Success',
            };

            if (level === 1) {
                result.message = "发音清晰，非常棒！";
                result.feedback = "Keep standard pronunciation.";
            } else if (level === 2) {
                result.message = "词汇准确，很地道！";
                result.feedback = "Great lexical resource.";
            } else if (level === 3) {
                // Mocking the result logic from PRD
                // Level 3 Pass -> Band 5.5+
                result.message = "表达流利，逻辑连贯！";
                result.score = "Band 5.5+";
                result.feedback = "You are ready for standard practice.";
            }

            resolve(result);
        }, 2000); // 2 seconds delay to mock processing
    });
};
