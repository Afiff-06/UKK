'use client';

import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';

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

    const [user, setUser] = useState<UserProfile | null>(null);
    const [role, setRole] = useState<UserRole>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        // Step 1: Read initial session from local storage (synchronous-ish)
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (!mounted) return;
            if (session?.user) {
                try {
                    const { data } = await supabase
                        .from('tb_user')
                        .select('id, nama, username, role, email')
                        .eq('id', session.user.id)
                        .single();

                    if (mounted && data) {
                        setUser({ id: data.id, nama: data.nama, username: data.username, role: data.role, email: data.email });
                        setRole(data.role);
                    }
                } catch (e) {
                    console.error('Error fetching profile:', e);
                }
            }
            if (mounted) setLoading(false);
        }).catch(() => {
            if (mounted) setLoading(false);
        });

        // Step 2: Listen for changes (login/logout from other tabs, token refresh, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;
            if (event === 'SIGNED_OUT') {
                setUser(null);
                setRole(null);
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const logout = async () => {
        await supabase.auth.signOut();
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