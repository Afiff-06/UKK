'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
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
    user: User | null;
    profile: UserProfile | null;
    role: UserRole;
    loading: boolean;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [role, setRole] = useState<UserRole>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const supabase = createClient();

    const fetchUserProfile = async (userId: string) => {
        try {
            // First, try to fetch from petugas table (for admin/operator)
            const { data: petugasData, error: petugasError } = await supabase
                .from('petugas')
                .select(`
          id_petugas,
          username,
          nama_petugas,
          level_id,
          level:level_id (nama_level)
        `)
                .eq('id_petugas', userId)
                .single();

            if (petugasData && !petugasError) {
                const levelName = (petugasData.level as any)?.nama_level || 'admin';
                setProfile({
                    id: petugasData.id_petugas,
                    nama: petugasData.nama_petugas,
                    username: petugasData.username,
                    role: levelName as UserRole,
                });
                setRole(levelName as UserRole);
                return;
            }

            // If not found in petugas, try users table (for pegawai)
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            if (userData && !userError) {
                setProfile({
                    id: userData.id,
                    nama: userData.nama,
                    username: userData.username,
                    email: userData.email,
                    role: userData.role as UserRole,
                });
                setRole(userData.role as UserRole);
                return;
            }

            // Default to pegawai if no profile found
            setRole('pegawai');
        } catch (error) {
            console.error('Error fetching user profile:', error);
        }
    };

    const checkPetugasSession = async () => {
        // Check for petugas session in localStorage
        const petugasSession = localStorage.getItem('petugas_session');
        if (petugasSession) {
            try {
                const petugas = JSON.parse(petugasSession);

                // Fetch level info
                const { data: levelData } = await supabase
                    .from('level')
                    .select('nama_level')
                    .eq('id_level', petugas.level_id)
                    .single();

                const roleName = levelData?.nama_level || 'admin';

                setProfile({
                    id: petugas.id,
                    nama: petugas.nama,
                    username: petugas.username,
                    role: roleName as UserRole,
                });
                setRole(roleName as UserRole);
                return true;
            } catch (e) {
                localStorage.removeItem('petugas_session');
            }
        }
        return false;
    };

    const refreshProfile = async () => {
        if (user) {
            await fetchUserProfile(user.id);
        } else {
            await checkPetugasSession();
        }
    };

    useEffect(() => {
        const initAuth = async () => {
            try {
                // First check for petugas session
                const hasPetugasSession = await checkPetugasSession();
                if (hasPetugasSession) {
                    setLoading(false);
                    return;
                }

                // Then check Supabase auth
                const { data: { session } } = await supabase.auth.getSession();

                if (session?.user) {
                    setUser(session.user);
                    await fetchUserProfile(session.user.id);
                }
            } catch (error) {
                console.error('Error initializing auth:', error);
            } finally {
                setLoading(false);
            }
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'SIGNED_IN' && session?.user) {
                    setUser(session.user);
                    await fetchUserProfile(session.user.id);
                } else if (event === 'SIGNED_OUT') {
                    setUser(null);
                    setProfile(null);
                    setRole(null);
                }
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const logout = async () => {
        // Clear petugas session
        localStorage.removeItem('petugas_session');

        // Clear Supabase auth
        await supabase.auth.signOut();

        setUser(null);
        setProfile(null);
        setRole(null);
        router.push('/auth/login');
    };

    return (
        <AuthContext.Provider value={{ user, profile, role, loading, logout, refreshProfile }}>
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
