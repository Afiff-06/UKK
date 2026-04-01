'use client';

import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { UserRole } from '@/lib/roles';

interface UserProfile {
    id: string;
    nama: string;
    username: string;
    role: UserRole;
    email?: string;
    blocked_until: string | null;
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

        const fetchProfile = async (sessionUser: { id: string }) => {
            if (!mounted) return;
            try {
                // Hanya tampilkan loading jika belum ada data user (initial load atau post-logout)
                if (!user) {
                    setLoading(true);
                }

                const { data, error } = await supabase
                    .from('tb_user')
                    .select('id, nama, username, role, email, blocked_until')
                    .eq('id', sessionUser.id)
                    .single();

                if (error) throw error;

                if (mounted) {
                    if (data) {
                        // Check if account is blocked
                        if (data.blocked_until && new Date(data.blocked_until) > new Date()) {
                            await supabase.auth.signOut();
                            setUser(null);
                            setRole(null);
                            router.push('/auth/login?error=blocked');
                            return;
                        }

                        const newUser = { 
                            id: data.id, 
                            nama: data.nama, 
                            username: data.username, 
                            role: data.role, 
                            email: data.email,
                            blocked_until: data.blocked_until
                        };
                        setUser(newUser);
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
