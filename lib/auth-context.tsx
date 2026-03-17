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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const supabase = useMemo(() => createClient(), []);
    const router = useRouter();

    const [user, setUser] = useState<UserProfile | null>(null);
    const [role, setRole] = useState<UserRole>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const fetchProfile = async (sessionUser: any) => {
            if (!mounted) return;
            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from('tb_user')
                    .select('id, nama, username, role, email')
                    .eq('id', sessionUser.id)
                    .single();

                if (mounted) {
                    if (data) {
                        setUser({ id: data.id, nama: data.nama, username: data.username, role: data.role, email: data.email });
                        setRole(data.role);
                    } else {
                        setUser(null);
                        setRole(null);
                    }
                }
            } catch (e) {
                console.error('Error fetching profile:', e);
                if (mounted) {
                    setUser(null);
                    setRole(null);
                }
            } finally {
                if (mounted) setLoading(false);
            }
        };

        // Step 1: Initial check
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!mounted) return;
            if (session?.user) {
                fetchProfile(session.user);
            } else {
                setLoading(false);
            }
        });

        // Step 2: Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;

            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
                if (session?.user) {
                    fetchProfile(session.user);
                }
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setRole(null);
                setLoading(false);
                router.push('/auth/login');
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [supabase, router]);

    const logout = async () => {
        await supabase.auth.signOut();
        router.push('/auth/login');
        setUser(null);
        setRole(null);
    };

    console.log("user: ", user)

    return (
        <AuthContext.Provider value={{ user, profile: user, role, loading, logout }}>
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