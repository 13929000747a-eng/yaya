
import { db } from '../config/firebase';
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    getDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';

// --- Interfaces ---

export interface QuestionBankSeason {
    id: string;
    title: string; // e.g. "Jan-Apr 2026"
    isActive: boolean;
    createdAt?: Timestamp;
}

export interface QuestionBankTopic {
    id: string;
    seasonId: string;
    title: string; // e.g. "Hometown"
    part: 1 | 2 | 3;
    coverImageUrl?: string; // Optional visual anchor
    tags?: string[]; // e.g. ["High Freq", "New"]
    order?: number; // For sorting
}

export interface QuestionBankQuestion {
    id: string;
    topicId: string;
    text: string; // The main question text
    subQuestions?: string[]; // For Part 2 bullet points
    order?: number;
}

// --- Service Functions ---

// 1. Season Management
export const getSeasons = async (): Promise<QuestionBankSeason[]> => {
    const q = query(collection(db, 'question_seasons'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuestionBankSeason));
};

export const createSeason = async (title: string, isActive: boolean = false) => {
    await addDoc(collection(db, 'question_seasons'), {
        title,
        isActive,
        createdAt: serverTimestamp()
    });
};

export const setActiveSeason = async (id: string) => {
    // 1. Deactivate all
    const seasons = await getSeasons();
    for (const s of seasons) {
        if (s.isActive && s.id !== id) {
            await updateDoc(doc(db, 'question_seasons', s.id), { isActive: false });
        }
    }
    // 2. Activate target
    await updateDoc(doc(db, 'question_seasons', id), { isActive: true });
};

// 2. Topic Management
export const getTopicsBySeason = async (seasonId: string): Promise<QuestionBankTopic[]> => {
    const q = query(
        collection(db, 'question_topics'),
        where('seasonId', '==', seasonId),
        orderBy('part', 'asc'),
        orderBy('order', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuestionBankTopic));
};

export const getTopic = async (topicId: string): Promise<QuestionBankTopic | null> => {
    const docRef = doc(db, 'question_topics', topicId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as QuestionBankTopic;
    }
    return null;
};

export const createTopic = async (topic: Omit<QuestionBankTopic, 'id'>) => {
    return await addDoc(collection(db, 'question_topics'), topic);
};

export const updateTopic = async (id: string, data: Partial<QuestionBankTopic>) => {
    await updateDoc(doc(db, 'question_topics', id), data);
};

export const deleteTopic = async (id: string) => {
    await deleteDoc(doc(db, 'question_topics', id));
};

// 3. Question Management
export const getQuestionsByTopic = async (topicId: string): Promise<QuestionBankQuestion[]> => {
    const q = query(
        collection(db, 'question_bank_questions'),
        where('topicId', '==', topicId),
        orderBy('order', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuestionBankQuestion));
};

export const createQuestion = async (question: Omit<QuestionBankQuestion, 'id'>) => {
    return await addDoc(collection(db, 'question_bank_questions'), question);
};

export const updateQuestion = async (id: string, data: Partial<QuestionBankQuestion>) => {
    await updateDoc(doc(db, 'question_bank_questions', id), data);
};

export const deleteQuestion = async (id: string) => {
    await deleteDoc(doc(db, 'question_bank_questions', id));
};
