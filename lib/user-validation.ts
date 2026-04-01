import { NON_ADMIN_ASSIGNABLE_ROLES } from "./roles.ts";
import {
  normalizeDigitsOnly,
  normalizeName,
  normalizePhoneNumber,
  normalizeUsername,
} from "./user-normalization.ts";

type ComparableUser = {
  id?: string | null;
  nama?: string | null;
  username?: string | null;
  no_telp?: string | null;
  nip?: string | null;
  nisn?: string | null;
};

type DuplicateField = "nama" | "username" | "no_telp" | "nip" | "nisn";

export function canAssignRole({
  currentRole,
  nextRole,
}: {
  currentRole?: string | null;
  nextRole?: string | null;
}) {
  if (!nextRole) return false;
  if (currentRole === "admin") return nextRole === "admin";
  if (nextRole === "admin") return false;
  return true;
}

export function getEditableRoleOptions(currentRole?: string | null) {
  if (currentRole === "admin") {
    return ["admin"] as const;
  }

  return [...NON_ADMIN_ASSIGNABLE_ROLES];
}

export function canDeleteManagedUser(role?: string | null) {
  return role !== "admin";
}

function hasSameNormalizedValue(
  first: string | null | undefined,
  second: string | null | undefined,
  normalizer: (value: string) => string,
) {
  if (!first || !second) return false;

  const normalizedFirst = normalizer(first);
  const normalizedSecond = normalizer(second);

  return normalizedFirst.length > 0 && normalizedFirst === normalizedSecond;
}

export function findDuplicateField({
  existingUsers,
  candidate,
}: {
  existingUsers: ComparableUser[];
  candidate: ComparableUser;
}): DuplicateField | null {
  const comparableUsers = existingUsers.filter((user) => user.id !== candidate.id);

  for (const user of comparableUsers) {
    if (hasSameNormalizedValue(candidate.nama, user.nama, normalizeName)) {
      return "nama";
    }

    if (hasSameNormalizedValue(candidate.username, user.username, normalizeUsername)) {
      return "username";
    }

    if (hasSameNormalizedValue(candidate.no_telp, user.no_telp, normalizePhoneNumber)) {
      return "no_telp";
    }

    if (hasSameNormalizedValue(candidate.nip, user.nip, normalizeDigitsOnly)) {
      return "nip";
    }

    if (hasSameNormalizedValue(candidate.nisn, user.nisn, normalizeDigitsOnly)) {
      return "nisn";
    }
  }

  return null;
}

export function buildDuplicateFieldMessage(field: DuplicateField | string) {
  const messages: Record<string, string> = {
    nama: "Nama sudah terdaftar.",
    username: "Username sudah terdaftar.",
    no_telp: "Nomor telepon sudah terdaftar.",
    nip: "NIP sudah terdaftar.",
    nisn: "NISN sudah terdaftar.",
  };

  return messages[field] ?? "Data pengguna sudah terdaftar.";
}

export function getLoginErrorMessage(reason: "username_not_found" | "missing_email" | "invalid_password") {
  const messages = {
    username_not_found: "Username tidak ditemukan.",
    missing_email: "Akun tidak memiliki email untuk login. Hubungi admin.",
    invalid_password: "Username atau password salah.",
  };

  return messages[reason];
}
