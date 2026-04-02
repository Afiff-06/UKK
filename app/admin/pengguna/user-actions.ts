'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { buildDuplicateFieldMessage, canAssignRole, canDeleteManagedUser, findDuplicateField } from '@/lib/user-validation';
import {
    buildInternalUserEmail,
    sanitizeNullableText,
    sanitizeOptionalDigits,
    sanitizeRequiredText,
} from '@/lib/user-normalization';
import type { ManagedUserRole } from '@/lib/roles';

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

type AuthMetadata = Record<string, unknown>;

type DbUserRow = {
    id: string;
    nama?: string | null;
    username?: string | null;
    email?: string | null;
    role?: string | null;
    nip?: string | null;
    alamat?: string | null;
    blocked_until?: string | null;
    no_telp?: string | null;
    nisn?: string | null;
    kelas?: string | null;
    konsentrasi_keahlian?: string | null;
    password?: string | null;
};

type AuthUserRow = {
    id: string;
    email?: string | null;
    user_metadata?: AuthMetadata;
};

export interface ManagedUserRecord {
    id: string;
    nama: string;
    username: string;
    email: string;
    role: ManagedUserRole;
    nip: string | null;
    alamat: string | null;
    blocked_until: string | null;
    no_telp: string | null;
    nisn: string | null;
    kelas: string | null;
    konsentrasi_keahlian: string | null;
}

interface UserDataPayload {
    nama?: string;
    username?: string;
    role?: string;
    nip?: string;
    password?: string;
    no_telp?: string;
    nisn?: string;
    kelas?: string;
    konsentrasi_keahlian?: string;
    alamat?: string;
}

interface ActionPayload {
    action: 'create' | 'update' | 'delete' | 'ban';
    userId?: string;
    userData?: UserDataPayload;
    blockedUntil?: string | null;
}

type SanitizedUserData = {
    nama: string;
    username: string;
    email: string | null;
    role: ManagedUserRole;
    password?: string;
    nip: string | null;
    alamat: string | null;
    no_telp: string | null;
    nisn: string | null;
    kelas: string | null;
    konsentrasi_keahlian: string | null;
};

const FALLBACK_DB_COLUMNS = [
    'id',
    'nama',
    'username',
    'email',
    'role',
    'nip',
    'alamat',
    'password',
    'blocked_until',
] as const;

function asStringOrNull(value: unknown) {
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function getMetadataValue(metadata: AuthMetadata | undefined, key: string) {
    if (!metadata) return null;
    return asStringOrNull(metadata[key]);
}

function toManagedRole(value: string | null | undefined): ManagedUserRole {
    if (value === 'admin' || value === 'operator' || value === 'pegawai' || value === 'guru' || value === 'siswa') {
        return value;
    }

    return 'pegawai';
}

function mergeManagedUserRecord(dbUser: DbUserRow, authUser?: AuthUserRow): ManagedUserRecord {
    const metadata = authUser?.user_metadata;

    return {
        id: dbUser.id || authUser?.id || '',
        nama: dbUser.nama || getMetadataValue(metadata, 'nama') || '',
        username: dbUser.username || getMetadataValue(metadata, 'username') || '',
        email: dbUser.email || authUser?.email || '',
        role: toManagedRole(dbUser.role || getMetadataValue(metadata, 'role')),
        nip: dbUser.nip || getMetadataValue(metadata, 'nip'),
        alamat: dbUser.alamat || getMetadataValue(metadata, 'alamat'),
        blocked_until: dbUser.blocked_until || null,
        no_telp: dbUser.no_telp || getMetadataValue(metadata, 'no_telp'),
        nisn: dbUser.nisn || getMetadataValue(metadata, 'nisn'),
        kelas: dbUser.kelas || getMetadataValue(metadata, 'kelas'),
        konsentrasi_keahlian: dbUser.konsentrasi_keahlian || getMetadataValue(metadata, 'konsentrasi_keahlian'),
    };
}

async function listAuthUsers() {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
    });

    if (error) throw error;
    return data.users as AuthUserRow[];
}

async function getAvailableDbUserColumns() {
    const { data, error } = await supabaseAdmin
        .from('tb_user')
        .select('*')
        .limit(1);

    if (error) throw error;

    const columns = new Set<string>(FALLBACK_DB_COLUMNS);
    const sampleRow = (data?.[0] ?? null) as Record<string, unknown> | null;
    if (sampleRow) {
        Object.keys(sampleRow).forEach((key) => columns.add(key));
    }

    return columns;
}

async function getManagedUsers() {
    const [{ data: dbUsers, error: dbError }, authUsers] = await Promise.all([
        supabaseAdmin
            .from('tb_user')
            .select('*')
            .order('role')
            .order('nama'),
        listAuthUsers(),
    ]);

    if (dbError) throw dbError;

    const authMap = new Map(authUsers.map((user) => [user.id, user]));
    const mergedUsers = ((dbUsers ?? []) as DbUserRow[]).map((user) =>
        mergeManagedUserRecord(user, authMap.get(user.id))
    );

    return mergedUsers.sort((left, right) =>
        left.role.localeCompare(right.role) || left.nama.localeCompare(right.nama, 'id')
    );
}

function sanitizeUserData(userData: UserDataPayload): SanitizedUserData {
    const nextRole = toManagedRole(userData.role);
    const isStudent = nextRole === 'siswa';
    const isAdmin = nextRole === 'admin';

    return {
        nama: sanitizeRequiredText(userData.nama || ''),
        username: sanitizeRequiredText((userData.username || '').toLowerCase()),
        email: null,
        role: nextRole,
        password: userData.password && userData.password.length > 0 ? userData.password : undefined,
        nip: !isAdmin && !isStudent ? sanitizeOptionalDigits(userData.nip) : null,
        alamat: !isAdmin ? sanitizeNullableText(userData.alamat) : null,
        no_telp: !isAdmin ? sanitizeOptionalDigits(userData.no_telp) : null,
        nisn: isStudent ? sanitizeOptionalDigits(userData.nisn) : null,
        kelas: isStudent ? sanitizeNullableText(userData.kelas) : null,
        konsentrasi_keahlian: isStudent ? sanitizeNullableText(userData.konsentrasi_keahlian) : null,
    };
}

function validateUserData(userData: SanitizedUserData, action: 'create' | 'update') {
    if (!userData.nama) {
        throw new Error('Nama wajib diisi.');
    }

    if (!userData.username) {
        throw new Error('Username wajib diisi.');
    }

    if (action === 'create' && (!userData.password || userData.password.length < 5)) {
        throw new Error('Password wajib diisi minimal 5 karakter untuk pengguna baru.');
    }

    if (action === 'update' && userData.password && userData.password.length < 5) {
        throw new Error('Password baru minimal 5 karakter.');
    }

    if (userData.role === 'guru' && !userData.nip) {
        throw new Error('NIP wajib diisi untuk guru.');
    }

    if (userData.nip && userData.nip.length !== 18) {
        throw new Error('NIP harus tepat 18 digit.');
    }

    if ((userData.role === 'pegawai' || userData.role === 'guru' || userData.role === 'siswa') && !userData.no_telp) {
        throw new Error('Nomor telepon wajib diisi.');
    }

    if ((userData.role === 'pegawai' || userData.role === 'guru' || userData.role === 'siswa') && !userData.alamat) {
        throw new Error('Alamat wajib diisi.');
    }

    if (userData.role === 'siswa') {
        if (!userData.nisn) throw new Error('NISN wajib diisi untuk siswa.');
        if (!userData.kelas) throw new Error('Kelas wajib diisi untuk siswa.');
        if (!userData.konsentrasi_keahlian) throw new Error('Konsentrasi keahlian wajib diisi untuk siswa.');
    }
}

function buildAuthMetadata(userData: SanitizedUserData) {
    return {
        nama: userData.nama,
        username: userData.username,
        role: userData.role,
        nip: userData.nip,
        alamat: userData.alamat,
        no_telp: userData.no_telp,
        nisn: userData.nisn,
        kelas: userData.kelas,
        konsentrasi_keahlian: userData.konsentrasi_keahlian,
    };
}

function buildDbPayload(userData: SanitizedUserData, availableColumns: Set<string>) {
    const candidatePayload: Record<string, string | null> = {
        nama: userData.nama,
        username: userData.username,
        email: userData.email,
        role: userData.role,
        nip: userData.nip,
        alamat: userData.alamat,
        no_telp: userData.no_telp,
        nisn: userData.nisn,
        kelas: userData.kelas,
        konsentrasi_keahlian: userData.konsentrasi_keahlian,
    };

    return Object.fromEntries(
        Object.entries(candidatePayload).filter(([key]) => availableColumns.has(key))
    );
}

function buildComparisonCandidate(currentUserId: string | undefined, userData: SanitizedUserData) {
    return {
        id: currentUserId,
        nama: userData.nama,
        username: userData.username,
        no_telp: userData.no_telp,
        nip: userData.nip,
        nisn: userData.nisn,
    };
}

export async function getManagedUsersAction() {
    try {
        return {
            success: true,
            users: await getManagedUsers(),
        };
    } catch (error) {
        console.error('Error in getManagedUsersAction:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Gagal memuat data pengguna.',
            users: [] as ManagedUserRecord[],
        };
    }
}

export async function manageUserAction(payload: ActionPayload) {
    const { action, userId, userData, blockedUntil } = payload;

    try {
        if (action === 'delete') {
            if (!userId) {
                throw new Error('User ID wajib ada untuk hapus.');
            }

            const users = await getManagedUsers();
            const currentUser = users.find((user) => user.id === userId);

            if (!currentUser) {
                throw new Error('Pengguna tidak ditemukan.');
            }

            if (!canDeleteManagedUser(currentUser.role)) {
                throw new Error('Akun admin tidak bisa dihapus.');
            }

            const [
                { count: borrowHistoryCount, error: borrowHistoryError },
                { count: officerHistoryCount, error: officerHistoryError },
            ] = await Promise.all([
                supabaseAdmin
                    .from('peminjaman')
                    .select('id_peminjaman', { count: 'exact', head: true })
                    .eq('id_pegawai', userId),
                supabaseAdmin
                    .from('peminjaman')
                    .select('id_peminjaman', { count: 'exact', head: true })
                    .eq('id_petugas', userId),
            ]);

            if (borrowHistoryError) throw borrowHistoryError;
            if (officerHistoryError) throw officerHistoryError;

            if ((borrowHistoryCount || 0) > 0 || (officerHistoryCount || 0) > 0) {
                throw new Error('Pengguna tidak bisa dihapus karena masih memiliki riwayat peminjaman.');
            }

            const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
            if (authDeleteError) throw authDeleteError;

            const { error: dbDeleteError } = await supabaseAdmin
                .from('tb_user')
                .delete()
                .eq('id', userId);

            if (dbDeleteError) throw dbDeleteError;

            revalidatePath('/admin/pengguna');
            return { success: true };
        }

        if (action === 'ban') {
            if (!userId) {
                throw new Error('User ID wajib ada untuk ban.');
            }

            const { error: dbError } = await supabaseAdmin
                .from('tb_user')
                .update({ blocked_until: blockedUntil || null })
                .eq('id', userId);

            if (dbError) throw dbError;

            revalidatePath('/admin/pengguna');
            return { success: true };
        }

        if (!userData) {
            throw new Error('Data pengguna wajib diisi.');
        }

        const availableColumns = await getAvailableDbUserColumns();
        const existingUsers = await getManagedUsers();
        const sanitizedUser = sanitizeUserData(userData);
        
        if (action === 'create' || action === 'update') {
            validateUserData(sanitizedUser, action);
        }

        if (action === 'create') {
            if (!canAssignRole({ currentRole: null, nextRole: sanitizedUser.role })) {
                throw new Error('Role admin tidak dapat dibuat dari form ini.');
            }

            const duplicateField = findDuplicateField({
                existingUsers,
                candidate: buildComparisonCandidate(undefined, sanitizedUser),
            });

            if (duplicateField) {
                throw new Error(buildDuplicateFieldMessage(duplicateField));
            }

            const authEmail = buildInternalUserEmail(sanitizedUser.username);
            const createCandidate: SanitizedUserData = {
                ...sanitizedUser,
                email: authEmail,
            };

            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: authEmail,
                password: createCandidate.password,
                email_confirm: true,
                user_metadata: buildAuthMetadata(createCandidate),
            });

            if (authError) throw authError;

            const updatePayload = buildDbPayload(createCandidate, availableColumns);
            if (createCandidate.password && availableColumns.has('password')) {
                updatePayload.password = createCandidate.password;
            }

            const { error: updateError } = await supabaseAdmin
                .from('tb_user')
                .update(updatePayload)
                .eq('id', authData.user.id);

            if (updateError) throw updateError;

            revalidatePath('/admin/pengguna');
            return { success: true, user: authData.user };
        }

        if (action === 'update') {
            if (!userId) {
                throw new Error('User ID wajib ada untuk update.');
            }

            const currentUser = existingUsers.find((user) => user.id === userId);
            if (!currentUser) {
                throw new Error('Pengguna tidak ditemukan.');
            }

            const nextRole = currentUser.role === 'admin' ? 'admin' : sanitizedUser.role;
            if (!canAssignRole({ currentRole: currentUser.role, nextRole })) {
                throw new Error('Perubahan role tersebut tidak diizinkan.');
            }

            const mergedCandidate: SanitizedUserData = {
                ...sanitizedUser,
                role: nextRole,
                email: currentUser.email || buildInternalUserEmail(sanitizedUser.username),
            };

            const duplicateField = findDuplicateField({
                existingUsers,
                candidate: buildComparisonCandidate(userId, mergedCandidate),
            });

            if (duplicateField) {
                throw new Error(buildDuplicateFieldMessage(duplicateField));
            }

            const updateAuthPayload: {
                email?: string;
                password?: string;
                user_metadata: ReturnType<typeof buildAuthMetadata>;
            } = {
                email: mergedCandidate.email || undefined,
                user_metadata: buildAuthMetadata(mergedCandidate),
            };

            if (mergedCandidate.password) {
                updateAuthPayload.password = mergedCandidate.password;
            }

            const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
                userId,
                updateAuthPayload
            );

            if (authError) throw authError;

            const updateDbPayload = buildDbPayload(mergedCandidate, availableColumns);
            if (mergedCandidate.password && availableColumns.has('password')) {
                updateDbPayload.password = mergedCandidate.password;
            }

            const { error: dbError } = await supabaseAdmin
                .from('tb_user')
                .update(updateDbPayload)
                .eq('id', userId);

            if (dbError) throw dbError;

            revalidatePath('/admin/pengguna');
            return { success: true };
        }

        throw new Error('Action tidak valid.');
    } catch (error) {
        console.error(`Error in manageUserAction (${action}):`, error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Terjadi kesalahan pada server.',
        };
    }
}
