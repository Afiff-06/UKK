export const BORROWER_ROLES = ["pegawai", "guru", "siswa"] as const;
export const NON_ADMIN_ASSIGNABLE_ROLES = ["pegawai", "guru", "siswa", "operator"] as const;

export type BorrowerRole = (typeof BORROWER_ROLES)[number];
export type ManagedUserRole = "admin" | "operator" | BorrowerRole;
export type UserRole = ManagedUserRole | null;

export function isBorrowerRole(role: string | null | undefined): role is BorrowerRole {
  return BORROWER_ROLES.includes((role ?? "") as BorrowerRole);
}

export function canManageInventory(role: string | null | undefined) {
  return role === "operator";
}

export function getRoutePrefixForRole(role: string | null | undefined) {
  if (role === "admin") return "/admin";
  if (role === "operator") return "/operator";
  return "/pegawai";
}

export function getDashboardPathForRole(role: string | null | undefined) {
  return `${getRoutePrefixForRole(role)}/dashboard`;
}

export function getRoleLabel(role: string | null | undefined) {
  switch (role) {
    case "admin":
      return "Administrator";
    case "operator":
      return "Operator";
    case "pegawai":
      return "Pegawai";
    case "guru":
      return "Guru";
    case "siswa":
      return "Siswa";
    default:
      return "User";
  }
}

export function formatBorrowerIdentity({
  role,
  username,
}: {
  role?: string | null | undefined;
  username?: string | null | undefined;
}) {
  const normalizedUsername = username?.trim();
  const normalizedRole = role?.trim();

  if (normalizedRole && normalizedUsername) {
    return `${getRoleLabel(normalizedRole)} • @${normalizedUsername}`;
  }

  if (normalizedUsername) {
    return `@${normalizedUsername}`;
  }

  if (normalizedRole) {
    return getRoleLabel(normalizedRole);
  }

  return "";
}
