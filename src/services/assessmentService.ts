import { db } from "../config/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

/**
 * Saves the user's assessment result to Firestore.
 * This updates the 'level' field in the user's document, which is displayed
 * on the Profile page as "目前水平".
 */
export const AssessmentService = {
    async saveLevel(userId: string, score: number): Promise<void> {
        if (!userId) {
            console.error("AssessmentService: No user ID provided");
            return;
        }

        // Convert numeric score to IELTS band string
        const bandScore = score.toFixed(1);
        const levelString = `${bandScore} 分`;

        try {
            await setDoc(doc(db, 'users', userId), {
                level: levelString,
                lastAssessmentScore: score,
                lastAssessmentDate: serverTimestamp(),
                completedAssessment: true
            }, { merge: true });
            console.log("AssessmentService: Level saved successfully:", levelString);
        } catch (error) {
            console.error("AssessmentService: Failed to save level:", error);
        }
    }
};
