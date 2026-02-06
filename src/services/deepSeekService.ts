
const API_URL = "/api/deepseek/chat/completions";

export interface EvaluationResult {
    scores: {
        FC: number; // Fluency & Coherence
        LR: number; // Lexical Resource
        GRA: number; // Grammatical Range & Accuracy
        P: number;  // Pronunciation (Self-reported/General impression if audio not processed)
        Overall: number;
    };
    feedback_cn: string; // Main feedback in Chinese
    feedback_en?: string;
    logic_correction?: string; // For Part 3
    logic_gap?: string; // For Part 2
    better_vocab?: string[];
    improved_sample?: string;
}

export const DeepSeekService = {
    async evaluate(
        taskType: 'sentence_completion' | 'part2' | 'part3',
        questionText: string,
        transcript: string,
        difficulty: string
    ): Promise<EvaluationResult> {
        const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;

        console.log("DeepSeek Service: Evaluating...", { taskType, length: transcript.length });

        if (!apiKey) {
            console.error("DeepSeek Service: MISSING API KEY.");
            return {
                scores: { FC: 0, LR: 0, GRA: 0, P: 0, Overall: 0 },
                feedback_cn: "API Key 缺失，无法评分。"
            };
        }

        let systemPrompt = "You are a strict IELTS Speaking Examiner. Return detailed JSON feedback.";
        let userPrompt = "";

        if (taskType === 'sentence_completion') {
            userPrompt = `
                **Task**: Sentence Completion (Level 2)
                **Target Sentence**: "${questionText}"
                **Student Answer**: "${transcript}"
                **Requirement**: Check if the blank was filled correctly and the full sentence is grammatical.
                **Output JSON**:
                {
                    "scores": { "FC": 0, "LR": 0, "GRA": 0, "P": 0, "Overall": 0.0 },
                    "feedback_cn": "Explain specific grammar/vocab error if any.",
                    "better_vocab": ["Better word 1", "Better word 2"],
                    "improved_sample": "Full corrected sentence"
                }
             `;
        } else if (taskType === 'part2') {
            userPrompt = `
                **Task**: IELTS Speaking Part 2 (Long Turn)
                **Topic**: "${questionText}"
                **Student Answer**: "${transcript}"
                **Scoring Criteria**:
                1. Fluency & Coherence: logical flow, discourse markers.
                2. Lexical Resource: topic-specific vocabulary.
                3. GRA: Past tense usage (narrative), complex structures.
                4. Pronunciation: Intonation/Stress (infer from text flow or give default comments on clarity).
                
                **Output JSON**:
                {
                    "scores": { "FC": 0, "LR": 0, "GRA": 0, "P": 0, "Overall": 0.0 },
                    "feedback_cn": "Detailed feedback in Chinese focusing on Narrative Flow & Tense.",
                    "logic_gap": "What part of the story was missing? (e.g. reflection)",
                    "improved_sample": "One key sentence rewritten to be band 7.0+"
                }
            `;
        } else if (taskType === 'part3') {
            userPrompt = `
                **Task**: IELTS Speaking Part 3 (Discussion)
                **Question**: "${questionText}"
                **Student Answer**: "${transcript}"
                 **Scoring Criteria**:
                1. Critical Thinking: Depth of argument.
                2. GRA: Conditionals, passive voice, etc.
                3. LR: Abstract nouns.
                
                **Output JSON**:
                {
                    "scores": { "FC": 0, "LR": 0, "GRA": 0, "P": 0, "Overall": 0.0 },
                    "feedback_cn": "Feedback on logic (PEER structure: Point, Explain, Example, Result).",
                    "logic_correction": "How to structure this argument better?",
                    "better_vocab": ["Academic term 1", "Academic term 2"]
                }
            `;
        }

        try {
            const response = await fetch(API_URL, {
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
                    temperature: 0.3,
                    response_format: { type: "json_object" }
                })
            });

            const data = await response.json();
            const content = data.choices[0].message.content;
            const result = JSON.parse(content);
            console.log("DeepSeek Service: Result:", result);

            // Normalize fields if AI misses some
            return {
                scores: result.scores || { FC: 0, LR: 0, GRA: 0, P: 0, Overall: 0 },
                feedback_cn: result.feedback_cn || "无反馈",
                feedback_en: result.feedback_en,
                logic_gap: result.logic_gap,
                logic_correction: result.logic_correction,
                better_vocab: result.better_vocab || [],
                improved_sample: result.improved_sample
            };

        } catch (error) {
            console.error("DeepSeek Service: Evaluation Failed:", error);
            return {
                scores: { FC: 0, LR: 0, GRA: 0, P: 0, Overall: 0 },
                feedback_cn: "AI 服务暂时不可用，请稍后再试。"
            };
        }
    }
};
