
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../App';
import { authenticateUser, getUserById, getUserProfile } from '../services/authService';
import { supabase } from '../services/supabase';


interface AuthContextType {
    user: User | null;
    login: (email: string, password: string, rememberMe?: boolean) => Promise<boolean>;
    logout: () => void;
    isLoading: boolean;
    quickLogin: (role: string) => Promise<void>;
    impersonate: (userId: string) => Promise<void>;
    stopImpersonation: () => void;
    isImpersonating: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [originalUser, setOriginalUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // 1. Initial Local Storage Check (Legacy/Fallback)
        const savedUser = localStorage.getItem('sheep_user') || sessionStorage.getItem('sheep_user');
        const savedOriginalUser = localStorage.getItem('sheep_original_user');

        if (savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch (e) {
                console.error("Failed to parse user session", e);
                localStorage.removeItem('sheep_user');
            }
        }

        if (savedOriginalUser) {
            try {
                setOriginalUser(JSON.parse(savedOriginalUser));
            } catch (e) {
                console.error("Failed to parse original user session", e);
                localStorage.removeItem('sheep_original_user');
            }
        }

        // 2. Supabase Auth Listener (Magic Links & OAuth)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('🔔 [AuthContext] Auth State Change:', event);

            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                if (session?.user) {
                    // Check if we already have the correct user loaded to avoid unnecessary fetches
                    if (user && user.id === session.user.id) {
                        setIsLoading(false);
                        return;
                    }

                    console.log('✨ [AuthContext] Valid Supabase Session detected. Fetching profile...');
                    try {
                        const profile = await getUserProfile(session.user.id, session.user.email);
                        if (profile) {
                            console.log('✅ [AuthContext] Profile loaded:', profile.name);
                            setUser(profile);
                            localStorage.setItem('sheep_user', JSON.stringify(profile));
                        } else {
                            console.warn('⚠️ [AuthContext] Supabase User logged in, but no App Profile found.');
                            // Optional: Logout if no profile found? Or let them register?
                            // supabase.auth.signOut(); 
                        }
                    } catch (err) {
                        console.error('❌ [AuthContext] Error fetching profile from session:', err);
                    }
                }
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setOriginalUser(null);
                localStorage.removeItem('sheep_user');
                localStorage.removeItem('sheep_original_user');
                sessionStorage.removeItem('sheep_user');
            }

            setIsLoading(false);
        });

        // If no session handling happens quickly, ensure loading stops
        setTimeout(() => setIsLoading(false), 2000);

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const login = async (email: string, password: string, rememberMe: boolean = true): Promise<boolean> => {
        setIsLoading(true);
        try {
            const authenticatedUser = await authenticateUser(email, password);
            if (authenticatedUser) {
                setUser(authenticatedUser);
                if (rememberMe) {
                    localStorage.setItem('sheep_user', JSON.stringify(authenticatedUser));
                } else {
                    sessionStorage.setItem('sheep_user', JSON.stringify(authenticatedUser));
                }
                return true;
            }
            return false;
        } catch (e) {
            console.error("Login failed", e);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const quickLogin = async (role: string) => {
        let email = '';
        const password = '123';

        switch (role) {
            case 'client': email = 'contato@solnascente.com.br'; break;
            case 'photographer': email = 'isaias@sheephouse.com'; break;
            case 'admin': email = 'admin@sheephouse.com'; break;
            case 'editor': email = 'lucas@sheephouse.com'; break;
            case 'broker': email = 'joao@solnascente.com.br'; break;
        }

        if (email) {
            await login(email, password);
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setOriginalUser(null);
        localStorage.removeItem('sheep_user');
        localStorage.removeItem('sheep_original_user');
        sessionStorage.removeItem('sheep_user');
    };

    const impersonate = async (userId: string) => {
        const targetUser = await getUserById(userId);
        if (targetUser && user) {
            setOriginalUser(user);
            setUser(targetUser);
            localStorage.setItem('sheep_user', JSON.stringify(targetUser));
            localStorage.setItem('sheep_original_user', JSON.stringify(user));
        }
    };

    const stopImpersonation = () => {
        if (originalUser) {
            setUser(originalUser);
            setOriginalUser(null);
            localStorage.setItem('sheep_user', JSON.stringify(originalUser));
            localStorage.removeItem('sheep_original_user');
        }
    };


    return (
        <AuthContext.Provider value={{
            user,
            login,
            logout,
            isLoading,
            quickLogin,
            impersonate,
            stopImpersonation,
            isImpersonating: !!originalUser
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
