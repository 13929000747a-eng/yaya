
import { type QuestionSegment } from './listeningDecoderService';

const DEEPSEEK_API_URL = "/api/deepseek/chat/completions";

export interface AIAnalysisResult {
    segments: QuestionSegment[];
    error?: string;
}

/**
 * Analyze a sentence and generate smart distractors using DeepSeek
 */
export async function analyzeSentence(sentence: string): Promise<AIAnalysisResult> {
    const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;

    if (!apiKey) {
        console.warn("DeepSeek API Key missing");
        return { segments: [], error: "API Key Missing" };
    }

    const systemPrompt = `You are an expert IELTS Listening test designer. Your task is to creat "Listening Decoding" exercises for Chinese students.
    
    Goal: Identify words that are phonetically confusing for Chinese learners (e.g., minimal pairs, linking sounds, weak forms) and generate *one* high-quality distractor for them.

    Rules:
    1. **Selection**: Select ONLY 1-2 key words per sentence that are most likely to be misheard.
    2. **Distractor**: For each selected key word, provide EXACTLY ONE distractor that sounds very similar (e.g., "walk" for "walked", "live" for "leave").
    3. **Other Words**: Mark other words as "Other" role with empty distractors.
    4. **Output Format**: JSON array of objects.

    JSON Structure:
    {
      "segments": [
        {
          "word": "The",
          "role": "Other",
          "distractors": { "phonetic": [], "semantic": [], "grammatical": [] }
        },
        {
          "word": "walked",
          "role": "Verb",
          "distractors": { "phonetic": ["work"], "semantic": [], "grammatical": [] }
        }
      ]
    }
    
    CRITICAL: 
    - Do NOT generate distractors for every word. 
    - Keep the "pool" clean. 
    - The sequence of "word" values MUST reconstruct the original sentence exactly (including punctuation if needed, or handle punctuation separately).
    `;

    const userPrompt = `Analyze this sentence: "${sentence}"`;

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
                temperature: 0.3, // Lower temperature for more deterministic/strict output
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`API Error: ${response.status} ${err}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        const parsed = JSON.parse(content);

        return { segments: parsed.segments };

    } catch (error) {
        console.error("AI Analysis failed:", error);
        return {
            segments: [],
            error: error instanceof Error ? error.message : "Unknown error"
        };
    }
}
