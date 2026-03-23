'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// Inisialisasi Supabase Admin dengan Service Role Key
// Ini hanya berjalan di server-side
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);

interface UserDataPayload {
    nama?: string;
    username?: string;
    email?: string;
    role?: string;
    nip?: string;
    password?: string;
}

interface ActionPayload {
    action: 'create' | 'update' | 'delete';
    userId?: string;
    userData?: UserDataPayload;
}

export async function manageUserAction(payload: ActionPayload) {
    const { action, userId, userData } = payload;

    try {
        if (action === 'create') {
            if (!userData?.email || !userData?.password) {
                throw new Error('Email dan Password wajib diisi.');
            }

            // 1. Buat User di Auth
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: userData.email,
                password: userData.password,
                email_confirm: true,
                user_metadata: {
                    nama: userData.nama,
                    username: userData.username,
                    role: userData.role,
                }
            });

            if (authError) throw authError;

            // 2. Update tb_user (biasanya ada trigger, tapi kita pastikan field tambahan terisi)
            const { error: updateErr } = await supabaseAdmin
                .from('tb_user')
                .update({
                    nip: userData.nip || null,
                    password: userData.password, // Menyimpan hashing password di tb_user jika diperlukan sistem lama
                })
                .eq('id', authData.user.id);

            revalidatePath('/admin/pengguna');
            return { success: true, user: authData.user };

        } else if (action === 'update') {
            if (!userId) throw new Error('User ID wajib ada untuk update.');

            // 1. Update Auth User (Email/Password/Metadata)
            const updateAuthPayload: any = {};
            if (userData?.password) updateAuthPayload.password = userData.password;
            
            // Metadata update
            updateAuthPayload.user_metadata = {
                nama: userData?.nama,
                username: userData?.username,
                role: userData?.role,
            };

            const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
                userId,
                updateAuthPayload
            );

            if (authError) throw authError;

            // 2. Update Database (tb_user)
            const updateDbPayload: any = {
                nama: userData?.nama,
                username: userData?.username,
                role: userData?.role,
                nip: userData?.nip || null,
            };

            if (userData?.password) {
                updateDbPayload.password = userData.password;
            }

            const { error: dbError } = await supabaseAdmin
                .from('tb_user')
                .update(updateDbPayload)
                .eq('id', userId);

            if (dbError) throw dbError;

            revalidatePath('/admin/pengguna');
            return { success: true };

        } else if (action === 'delete') {
            if (!userId) throw new Error('User ID wajib ada untuk hapus.');

            // 1. Hapus dari Auth (akan cascade ke tb_user jika FK diset ON DELETE CASCADE)
            const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
            if (authError) throw authError;

            // 2. Pastikan hapus dari tb_user
            await supabaseAdmin.from('tb_user').delete().eq('id', userId);

            revalidatePath('/admin/pengguna');
            return { success: true };
        }

        throw new Error('Action tidak valid.');
    } catch (error: any) {
        console.error(`Error in manageUserAction (${action}):`, error);
        return { success: false, error: error.message || 'Terjadi kesalahan pada server.' };
    }
}
