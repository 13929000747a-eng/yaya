import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    sendEmailVerification,
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged,
    type User
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

const googleProvider = new GoogleAuthProvider();

export interface UserProfile {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    emailVerified: boolean;
    isFirstTime: boolean;
}

export const AuthService = {
    // Get current user
    getCurrentUser: (): User | null => auth.currentUser,

    // Listen to auth state changes
    onAuthStateChange: (callback: (user: User | null) => void) => {
        return onAuthStateChanged(auth, callback);
    },

    // Email/Password Login
    loginWithEmail: async (email: string, password: string) => {
        const result = await signInWithEmailAndPassword(auth, email, password);
        return result.user;
    },

    // Email/Password Registration
    registerWithEmail: async (email: string, password: string) => {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        // Send verification email
        if (result.user) {
            await sendEmailVerification(result.user);
        }
        return result.user;
    },

    // Resend verification email
    resendVerificationEmail: async () => {
        const user = auth.currentUser;
        if (user && !user.emailVerified) {
            await sendEmailVerification(user);
        }
    },

    // Google Sign-in
    signInWithGoogle: async () => {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    },

    // Logout
    logout: async () => {
        await signOut(auth);
    },

    // Check if user is first time (hasn't completed assessment)
    checkFirstTimeUser: async (uid: string): Promise<boolean> => {
        try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (!userDoc.exists()) {
                // First time - create user record
                await setDoc(doc(db, 'users', uid), {
                    createdAt: serverTimestamp(),
                    completedAssessment: false
                });
                return true;
            }
            return !userDoc.data()?.completedAssessment;
        } catch (error) {
            console.error('Error checking first time user:', error);
            return true; // Default to first time on error
        }
    },

    // Mark assessment as completed
    markAssessmentCompleted: async (uid: string) => {
        try {
            await setDoc(doc(db, 'users', uid), {
                completedAssessment: true,
                completedAt: serverTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error('Error marking assessment completed:', error);
        }
    }
};
