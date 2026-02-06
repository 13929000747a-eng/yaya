import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type User } from 'firebase/auth';
import { AuthService } from '../services/authService';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isFirstTime: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string) => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    resendVerificationEmail: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isFirstTime, setIsFirstTime] = useState(false);

    console.log('[AuthProvider] Rendering, loading:', loading);

    useEffect(() => {
        console.log('[AuthProvider] useEffect starting, setting up listener...');

        // Timeout fallback in case Firebase takes too long
        const timeoutId = setTimeout(() => {
            console.warn('[AuthProvider] Auth state listener timeout - forcing loading false');
            setLoading((prev) => {
                if (prev) return false;
                return prev;
            });
        }, 5000); // 5 seconds timeout

        const unsubscribe = AuthService.onAuthStateChange(async (firebaseUser) => {
            clearTimeout(timeoutId); // Clear timeout on success
            console.log('[AuthProvider] Auth state changed:', firebaseUser?.email || 'null');
            setUser(firebaseUser);

            if (firebaseUser) {
                try {
                    const firstTime = await AuthService.checkFirstTimeUser(firebaseUser.uid);
                    setIsFirstTime(firstTime);
                } catch (e) {
                    console.error('[AuthProvider] checkFirstTimeUser error:', e);
                }
            } else {
                setIsFirstTime(false);
            }

            console.log('[AuthProvider] Setting loading to false');
            setLoading(false);
        });

        return () => {
            console.log('[AuthProvider] Cleanup, unsubscribing');
            clearTimeout(timeoutId);
            unsubscribe();
        };
    }, []);

    const login = async (email: string, password: string) => {
        await AuthService.loginWithEmail(email, password);
    };

    const register = async (email: string, password: string) => {
        await AuthService.registerWithEmail(email, password);
    };

    const loginWithGoogle = async () => {
        await AuthService.signInWithGoogle();
    };

    const logout = async () => {
        await AuthService.logout();
    };

    const resendVerificationEmail = async () => {
        await AuthService.resendVerificationEmail();
    };

    const value: AuthContextType = {
        user,
        loading,
        isFirstTime,
        login,
        register,
        loginWithGoogle,
        logout,
        resendVerificationEmail
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
