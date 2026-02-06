import { db } from "../config/firebase";
import { collection, getDocs, query, where, writeBatch, doc } from "firebase/firestore";

export interface Question {
    id?: string;
    text: string;
    level: string; // 'Easy' | 'Medium' | 'Hard'
    focus: string;
    guide: string;
    order: number;
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
