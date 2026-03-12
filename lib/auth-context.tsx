'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export type UserRole = 'admin' | 'operator' | 'pegawai' | null;

interface UserProfile {
    id: string;
    nama: string;
    username: string;
    role: UserRole;
    email?: string;
}

interface AuthContextType {
    user: UserProfile | null;
    profile: UserProfile | null;
    role: UserRole;
    loading: boolean;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [role, setRole] = useState<UserRole>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const supabase = createClient();

    const fetchUserProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('tb_user')
                .select('id, nama, username, role, email')
                .eq('id', userId)
                .single();

            if (data && !error) {
                const profile: UserProfile = {
                    id: data.id,
                    nama: data.nama,
                    username: data.username,
                    role: data.role as UserRole,
                    email: data.email,
                };
                setUser(profile);
                setRole(data.role as UserRole);
            } else {
                setUser(null);
                setRole(null);
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
            setUser(null);
            setRole(null);
        }
    };

    const refreshProfile = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            await fetchUserProfile(session.user.id);
        }
    };

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        // Check initial session
        const initAuth = async () => {
            try {
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                if (sessionError) {
                    console.error('Session error:', sessionError);
                    return;
                }
                if (session?.user) {
                    await fetchUserProfile(session.user.id);
                }
            } catch (error) {
                console.error('Error initializing auth:', error);
            } finally {
                clearTimeout(timeoutId);
                setLoading(false);
            }
        };

        // Timeout fallback: if auth init takes too long, stop loading
        timeoutId = setTimeout(() => {
            console.warn('Auth initialization timed out');
            setLoading(false);
        }, 10000);

        initAuth();

        // Listen for auth state changes (login, logout, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'SIGNED_IN' && session?.user) {
                    await fetchUserProfile(session.user.id);
                } else if (event === 'SIGNED_OUT') {
                    setUser(null);
                    setRole(null);
                }
            }
        );

        return () => {
            clearTimeout(timeoutId);
            subscription.unsubscribe();
        };
    }, []);

    const logout = async () => {
        await supabase.auth.signOut();
        // Also clear legacy sessions
        localStorage.removeItem('user_session');
        localStorage.removeItem('petugas_session');
        setUser(null);
        setRole(null);
        router.push('/auth/login');
    };

    return (
        <AuthContext.Provider value={{ user, profile: user, role, loading, logout, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
