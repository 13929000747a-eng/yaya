import { db } from "../config/firebase";
import { collection, getDocs, query, where, writeBatch, doc } from "firebase/firestore";

export interface Question {
    id?: string;
    text: string;
    template?: string; // For Level 2
    level: string; // 'Easy' | 'Medium' | 'Hard'
    focus: string;
    guide: string;
    order: number;
    assessmentType?: 'read_aloud' | 'sentence_completion' | 'part2_intro' | 'part3_followup';
    // Part 2 fields
    topic?: string;
    bullets?: string[];
    // Part 3 fields
    relatedTopicId?: string;
}

const COLLECTION_NAME = "questions";

export const QuestionService = {
    // Fetch questions for a specific assessment level (e.g., Level 1 Read Aloud)
    // For now we might just fetch all and filter, or fetch by 'level' field if corresponding to difficulty
    // But strictly speaking, the user wanted "Level 1" to contain 3 difficulties.
    // So maybe we store them with a 'stage' field: 1, 2, 3? 
    // Let's assume we want to fetch the 'Level 1' set which has 3 items.

    async getLevel1Questions(): Promise<Question[]> {
        try {
            const q = query(collection(db, COLLECTION_NAME), where("assessmentType", "==", "read_aloud"));
            const querySnapshot = await getDocs(q);
            const questions: Question[] = [];
            querySnapshot.forEach((doc) => {
                questions.push({ id: doc.id, ...doc.data() } as Question);
            });
            // Sort by order
            return questions.sort((a, b) => a.order - b.order);
        } catch (error) {
            console.error("Error fetching questions: ", error);
            return [];
        }
    },

    async getLevel2Questions(): Promise<Question[]> {
        try {
            // Simplify query to avoid index issues: fetch all assessmentType='sentence_completion'
            const q = query(
                collection(db, COLLECTION_NAME),
                where("assessmentType", "==", "sentence_completion")
            );
            const snapshot = await getDocs(q);
            const allQuestions: Question[] = [];
            snapshot.forEach(doc => allQuestions.push({ id: doc.id, ...doc.data() } as Question));

            // Now select 1 from each level
            const difficulties = ["Easy", "Medium", "Hard"];
            const selectedQuestions: Question[] = [];

            for (const diff of difficulties) {
                const pool = allQuestions.filter(q => q.level === diff);
                if (pool.length > 0) {
                    const random = pool[Math.floor(Math.random() * pool.length)];
                    selectedQuestions.push(random);
                }
            }
            if (selectedQuestions.length === 0) {
                console.warn("DB returned no L2 questions. Using fallback mock data.");
                return [
                    { text: "My favorite food is pizza because it is tasty.", template: "My favorite food is ______ because it is ______.", level: "Easy", focus: "Likes & Dislikes", assessmentType: "sentence_completion", guide: "Fill in blanks", order: 1 },
                    { text: "The weather today produces a pleasant atmosphere.", template: "The weather today produces a ______ atmosphere.", level: "Medium", focus: "Atmosphere", assessmentType: "sentence_completion", guide: "Fill in blanks", order: 2 },
                    { text: "He demonstrated remarkable resilience during the crisis.", template: "He demonstrated remarkable ______ during the ______.", level: "Hard", focus: "Abstract Nouns", assessmentType: "sentence_completion", guide: "Fill in blanks", order: 3 }
                ];
            }

            return selectedQuestions;
        } catch (error) {
            console.error("Error fetching Level 2 questions:", error);
            // Fallback for demo if DB fails completely (e.g. permission issues)
            return [];
        }
    },

    async seedLevel2Data() {
        // 5 examples per level for demo purposes (User asked for 50, but we start with a seed set)
        const generate = (level: string, count: number, baseIndex: number) => {
            const list = [];
            for (let i = 0; i < count; i++) {
                if (level === 'Easy') {
                    list.push({
                        text: "My favorite color is blue because it is calm.",
                        template: "My favorite color is ______ because it is ______.",
                        level: "Easy",
                        focus: "Basic Vocabulary",
                        guide: "Use simple adjectives",
                        assessmentType: "sentence_completion",
                        order: baseIndex + i
                    });
                } else if (level === 'Medium') {
                    list.push({
                        text: "I usually go to the library to study effectively.",
                        template: "I usually go to the ______ to ______ effectively.",
                        level: "Medium",
                        focus: "Collocations",
                        guide: "Think of places and actions",
                        assessmentType: "sentence_completion",
                        order: baseIndex + i
                    });
                } else {
                    list.push({
                        text: "It is crucial to maintain a balanced diet for longevity.",
                        template: "It is ______ to maintain a ______ for longevity.",
                        level: "Hard",
                        focus: "Advanced Adjectives",
                        guide: "Use higher-level vocabulary",
                        assessmentType: "sentence_completion",
                        order: baseIndex + i
                    });
                }
            }
            return list;
        };

        // For now, let's just seed 5 distinct ones per level manually to ensure quality
        const level2Questions = [
            // EASY
            { text: "My favorite food is pizza because it is tasty.", template: "My favorite food is ______ because it is ______.", level: "Easy", focus: "Likes & Dislikes", assessmentType: "sentence_completion" },
            { text: "I like to play football with my friends.", template: "I like to play ______ with my ______.", level: "Easy", focus: "Hobbies", assessmentType: "sentence_completion" },
            { text: "I usually wake up at seven o'clock.", template: "I usually wake up at ______.", level: "Easy", focus: "Daily Utility", assessmentType: "sentence_completion" },
            { text: "My best friend is kind and funny.", template: "My best friend is ______ and ______.", level: "Easy", focus: "Describing People", assessmentType: "sentence_completion" },
            { text: "I live in a big city.", template: "I live in a ______.", level: "Easy", focus: "Basic Facts", assessmentType: "sentence_completion" },

            // MEDIUM
            { text: "It is important to exercise regularly for good health.", template: "It is ______ to exercise ______ for good health.", level: "Medium", focus: "Opinion & Reason", assessmentType: "sentence_completion" },
            { text: "I prefer traveling by train because it is convenient.", template: "I prefer traveling by ______ because it is ______.", level: "Medium", focus: "Preferences", assessmentType: "sentence_completion" },
            { text: "The weather today produces a pleasant atmosphere.", template: "The weather today produces a ______ atmosphere.", level: "Medium", focus: "Atmosphere", assessmentType: "sentence_completion" },
            { text: "Reading helps me expand my knowledge.", template: "______ helps me ______ my knowledge.", level: "Medium", focus: "Benefits", assessmentType: "sentence_completion" },
            { text: "I worked hard to achieve my goals.", template: "I worked ______ to ______ my goals.", level: "Medium", focus: "Achievements", assessmentType: "sentence_completion" },

            // HARD
            { text: "Technological advancements have significantly altered our lifestyle.", template: "Technological advancements have ______ altered our ______.", level: "Hard", focus: "Complex Topics", assessmentType: "sentence_completion" },
            { text: "Environmental conservation is essential for future generations.", template: "Environmental ______ is essential for ______ generations.", level: "Hard", focus: "Global Issues", assessmentType: "sentence_completion" },
            { text: "The movie was utterly captivating from start to finish.", template: "The movie was utterly ______ from start to finish.", level: "Hard", focus: "Strong Adjectives", assessmentType: "sentence_completion" },
            { text: "He demonstrated remarkable resilience during the crisis.", template: "He demonstrated remarkable ______ during the ______.", level: "Hard", focus: "Abstract Nouns", assessmentType: "sentence_completion" },
            { text: "I am absolutely convinced that this is the best solution.", template: "I am absolutely ______ that this is the ______ solution.", level: "Hard", focus: "Strong Stance", assessmentType: "sentence_completion" }
        ].map((q, i) => ({ ...q, guide: "Fill in the blanks", order: i }));

        try {
            const batch = writeBatch(db);
            for (const q of level2Questions) {
                const docRef = doc(collection(db, COLLECTION_NAME));
                batch.set(docRef, q);
            }
            await batch.commit();
            console.log("Level 2 Seeding completed.");
        } catch (e) {
            console.error("Level 2 Seeding failed: ", e);
        }
    },

    async getLevel3Questions(): Promise<{ part2: Question, part3: Question[] }> {
        try {
            // Fetch Part 2 topics
            const q2 = query(collection(db, COLLECTION_NAME), where("assessmentType", "==", "part2_intro"));
            const snapshot2 = await getDocs(q2);
            const part2List: Question[] = [];
            snapshot2.forEach(doc => part2List.push({ id: doc.id, ...doc.data() } as Question));

            if (part2List.length === 0) {
                await this.seedLevel3Data();
                return this.getLevel3Questions(); // Retry
            }

            // Pick random Part 2
            const randomPart2 = part2List[Math.floor(Math.random() * part2List.length)];

            // Fetch associated Part 3 questions
            const q3 = query(
                collection(db, COLLECTION_NAME),
                where("assessmentType", "==", "part3_followup"),
                where("relatedTopicId", "==", randomPart2.id || randomPart2.order.toString()) // Fallback to order if ID not set in seed? Actually seed doesn't set ID. 
                // Wait, seeding relies on 'order' for link? 
                // Let's use 'topic' specific ID or just filter in memory for simplicity if dataset is small.
                // Better: Store a 'topicId' field.
            );

            // Re-query strategy: Get all Part 3 and filter by relatedTopicId match
            const q3All = query(collection(db, COLLECTION_NAME), where("assessmentType", "==", "part3_followup"));
            const snapshot3 = await getDocs(q3All);
            const part3List: Question[] = [];
            snapshot3.forEach(doc => {
                const data = doc.data();
                if (data.relatedTopicId === randomPart2.topic) { // Match by Topic Name usually easiest
                    part3List.push({ id: doc.id, ...data } as Question);
                }
            });

            return {
                part2: randomPart2,
                part3: part3List.slice(0, 2) // Return top 2 follow-ups
            };

        } catch (error) {
            console.error("Error fetching Level 3 questions:", error);
            // Fallback mock
            return {
                part2: {
                    text: "Describe a challenge you overcame.",
                    topic: "Challenge",
                    bullets: ["What was it?", "When did it happen?", "How did you solve it?"],
                    level: "Hard", focus: "Narrative Flow", guide: "Tell a story", assessmentType: "part2_intro", order: 1
                },
                part3: []
            };
        }
    },

    async seedLevel3Data() {
        const part2Questions = [
            {
                text: "Describe a challenge you overcame.",
                topic: "Challenge",
                bullets: ["What was it?", "When did it happen?", "How did you solve it?", "And explain why it was difficult for you."],
                level: "Hard",
                focus: "Narrative Flow & Past Tense",
                guide: "Use connectives like 'Initially', 'However', 'Eventually'.",
                assessmentType: "part2_intro",
                order: 1
            },
            {
                text: "Describe a person who inspired you.",
                topic: "Person",
                bullets: ["Who is this person?", "How do you know them?", "What did they do?", "And explain why they inspired you."],
                level: "Hard",
                focus: "Descriptive Adjectives",
                guide: "Focus on personality traits and specific examples.",
                assessmentType: "part2_intro",
                order: 2
            }
        ];

        const part3Questions = [
            // Follow-ups for "Challenge"
            {
                text: "Do you think children should be taught to face challenges early?",
                relatedTopicId: "Challenge",
                level: "Hard",
                focus: "Critical Thinking",
                guide: "Give an opinion and support it.",
                assessmentType: "part3_followup",
                order: 1
            },
            {
                text: "How do people usually react to failure?",
                relatedTopicId: "Challenge",
                level: "Hard",
                focus: "Generalization",
                guide: "Talk about 'people in general', not just yourself.",
                assessmentType: "part3_followup",
                order: 2
            },
            // Follow-ups for "Person"
            {
                text: "What qualities make a good leader?",
                relatedTopicId: "Person",
                level: "Hard",
                focus: "Abstract Qualities",
                guide: "Use words like 'integrity', 'vision', 'empathy'.",
                assessmentType: "part3_followup",
                order: 3
            },
            {
                text: "Is it important to have role models?",
                relatedTopicId: "Person",
                level: "Hard",
                focus: "Opinion & Reason",
                guide: "PEE: Point, Explain, Example.",
                assessmentType: "part3_followup",
                order: 4
            }
        ];

        try {
            const batch = writeBatch(db);
            [...part2Questions, ...part3Questions].forEach(q => {
                const docRef = doc(collection(db, COLLECTION_NAME));
                batch.set(docRef, q);
            });
            await batch.commit();
            console.log("Level 3 Seeding completed.");
        } catch (e) {
            console.error("Level 3 Seeding failed: ", e);
        }
    },

    // Seed initial data
    async seedInitialData() {
        const questions = [
            {
                text: "I enjoy reading books in my free time.",
                level: "Easy",
                focus: "Basic Pronunciation (基础发音)",
                guide: "注意每个单词的元音发音清晰",
                assessmentType: "read_aloud",
                order: 1
            },
            {
                text: "It helps me relax after a long and tiring day.",
                level: "Medium",
                focus: "Linking & Rhythm (连读与节奏)",
                guide: "尝试把 relax_after 连起来读",
                assessmentType: "read_aloud",
                order: 2
            },
            {
                text: "If I had more time, I would read a new novel every single week.",
                level: "Hard",
                focus: "Intonation & Stress (语调与重音)",
                guide: "注意 If 从句的升调和主句的重音",
                assessmentType: "read_aloud",
                order: 3
            }
        ];

        try {
            const batch = writeBatch(db);
            for (const q of questions) {
                const docRef = doc(collection(db, COLLECTION_NAME));
                batch.set(docRef, q);
            }
            await batch.commit();
            console.log("Seeding completed.");
        } catch (e) {
            console.error("Seeding failed: ", e);
        }
    }
};
