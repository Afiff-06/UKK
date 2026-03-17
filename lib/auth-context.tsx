'use client';

import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react';
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
    // useMemo prevents a new Supabase instance on every re-render
    const supabase = useMemo(() => createClient(), []);

    const [user, setUser] = useState<UserProfile | null>(null);
    const [role, setRole] = useState<UserRole>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

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
        // onAuthStateChange fires immediately with the current session (INITIAL_SESSION),
        // then again on any login/logout. This is the single source of truth.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'INITIAL_SESSION') {
                    if (session?.user) {
                        await fetchUserProfile(session.user.id);
                    }
                    // Always stop loading after initial session check
                    setLoading(false);
                } else if (event === 'SIGNED_IN' && session?.user) {
                    await fetchUserProfile(session.user.id);
                } else if (event === 'SIGNED_OUT') {
                    setUser(null);
                    setRole(null);
                }
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, [supabase]);

    const logout = async () => {
        await supabase.auth.signOut();
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
