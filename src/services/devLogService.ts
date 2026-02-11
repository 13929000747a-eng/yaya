import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    query,
    orderBy,
    Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { DevLog } from '../types/devLog';

const COLLECTION_NAME = 'dev_logs';

export const getDevLogs = async (): Promise<DevLog[]> => {
    try {
        const q = query(collection(db, COLLECTION_NAME), orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Convert Firestore Timestamp to Date
                timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(data.timestamp)
            } as DevLog;
        });
    } catch (error) {
        console.error("Error fetching dev logs:", error);
        return [];
    }
};

export const addDevLog = async (log: Omit<DevLog, 'id'>): Promise<string> => {
    try {
        const docRef = await addDoc(collection(db, COLLECTION_NAME), {
            ...log,
            timestamp: Timestamp.fromDate(log.timestamp)
        });
        return docRef.id;
    } catch (error) {
        console.error("Error adding dev log:", error);
        throw error;
    }
};

export const deleteDevLog = async (id: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (error) {
        console.error("Error deleting dev log:", error);
        throw error;
    }
};
