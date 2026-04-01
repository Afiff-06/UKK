# User Role, Login, and Admin Inventory Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `guru` and `siswa` borrower roles, switch login to `username + password`, lock down admin role management rules, and add a read-only inventory page for admins.

**Architecture:** Keep Supabase Auth plus `tb_user` as the core identity model, introduce shared helpers for borrower-role checks and user-data normalization, and refactor inventory UI into a reusable listing that supports both full-management and read-only modes. Enforce role restrictions and duplicate validation on the server so the UI cannot bypass them.

**Tech Stack:** Next.js App Router, React, TypeScript, Supabase Auth, Supabase PostgREST, ESLint, Vitest or equivalent lightweight TypeScript test runner for helper tests

---

## File Structure

### Existing files to modify

- `package.json`
- `lib/auth-context.tsx`
- `lib/supabase/proxy.ts`
- `components/login-form.tsx`
- `components/forgot-password-form.tsx`
- `components/header.tsx`
- `components/pegawai-sidebar.tsx`
- `components/admin-sidebar.tsx`
- `app/admin/pengguna/page.tsx`
- `app/admin/pengguna/user-actions.ts`
- `app/operator/inventaris/page.tsx`
- `app/pegawai/peminjaman/page.tsx`
- `app/pegawai/peminjaman/form/page.tsx`
- `app/pegawai/pengembalian/page.tsx`
- `app/pegawai/pengembalian/form/page.tsx`
- `app/operator/peminjaman/form/page.tsx`
- `app/admin/peminjaman/form/page.tsx`

### New files to create

- `lib/roles.ts`
- `lib/user-normalization.ts`
- `lib/user-validation.ts`
- `components/inventaris-table.tsx`
- `app/admin/inventaris/page.tsx`
- `tests/lib/roles.test.ts`
- `tests/lib/user-normalization.test.ts`
- `tests/lib/user-validation.test.ts`
- `tests/lib/login-lookup.test.ts`

### Optional project files if test tooling is missing

- `vitest.config.ts`
- `tests/setup.ts`

## Chunk 1: Shared role and validation foundation

### Task 1: Add a minimal test runner and baseline helper tests

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `tests/lib/roles.test.ts`
- Create: `tests/lib/user-normalization.test.ts`

- [ ] **Step 1: Write the failing role helper test**

```ts
import { describe, expect, it } from "vitest";
import { BORROWER_ROLES, isBorrowerRole } from "../../lib/roles";

describe("isBorrowerRole", () => {
  it("returns true for pegawai, guru, and siswa", () => {
    expect(BORROWER_ROLES).toEqual(["pegawai", "guru", "siswa"]);
    expect(isBorrowerRole("pegawai")).toBe(true);
    expect(isBorrowerRole("guru")).toBe(true);
    expect(isBorrowerRole("siswa")).toBe(true);
  });

  it("returns false for admin and operator", () => {
    expect(isBorrowerRole("admin")).toBe(false);
    expect(isBorrowerRole("operator")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the role test to verify it fails**

Run: `npx vitest run tests/lib/roles.test.ts`
Expected: FAIL because `lib/roles.ts` does not exist yet

- [ ] **Step 3: Write the failing normalization test**

```ts
import { describe, expect, it } from "vitest";
import { normalizeName, normalizeDigitsOnly, normalizeUsername } from "../../lib/user-normalization";

describe("user normalization", () => {
  it("normalizes names and usernames consistently", () => {
    expect(normalizeName("  Siti  Nur  ")).toBe("siti nur");
    expect(normalizeUsername("  Siswa_A  ")).toBe("siswa_a");
  });

  it("keeps only digits for numeric identity fields", () => {
    expect(normalizeDigitsOnly("0812-345-678")).toBe("0812345678");
  });
});
```

- [ ] **Step 4: Run the normalization test to verify it fails**

Run: `npx vitest run tests/lib/user-normalization.test.ts`
Expected: FAIL because `lib/user-normalization.ts` does not exist yet

- [ ] **Step 5: Implement the minimal test runner**

Update `package.json` with a test script and add Vitest only if the repo does not already have a test runner:

```json
{
  "scripts": {
    "test": "vitest run"
  },
  "devDependencies": {
    "vitest": "^3.2.4"
  }
}
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
```

- [ ] **Step 6: Implement the minimal shared helpers**

Create `lib/roles.ts`:

```ts
export const BORROWER_ROLES = ["pegawai", "guru", "siswa"] as const;

export type UserRole = "admin" | "operator" | (typeof BORROWER_ROLES)[number] | null;

export function isBorrowerRole(role: string | null | undefined): boolean {
  return BORROWER_ROLES.includes((role ?? "") as (typeof BORROWER_ROLES)[number]);
}
```

Create `lib/user-normalization.ts`:

```ts
export function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeName(value: string) {
  return normalizeWhitespace(value).toLowerCase();
}

export function normalizeUsername(value: string) {
  return normalizeWhitespace(value).toLowerCase();
}

export function normalizeDigitsOnly(value: string) {
  return value.replace(/\D/g, "");
}
```

- [ ] **Step 7: Run the helper tests to verify they pass**

Run: `npm test -- tests/lib/roles.test.ts tests/lib/user-normalization.test.ts`
Expected: PASS

- [ ] **Step 8: Commit the shared helper foundation**

```bash
git add package.json package-lock.json vitest.config.ts lib/roles.ts lib/user-normalization.ts tests/lib/roles.test.ts tests/lib/user-normalization.test.ts
git commit -m "test: add role and normalization helpers"
```

### Task 2: Add duplicate-check and role-guard logic

**Files:**
- Create: `lib/user-validation.ts`
- Create: `tests/lib/user-validation.test.ts`
- Create: `tests/lib/login-lookup.test.ts`

- [ ] **Step 1: Write the failing validation tests**

```ts
import { describe, expect, it } from "vitest";
import { buildDuplicateFieldMessage, canAssignRole, findDuplicateField } from "../../lib/user-validation";

describe("canAssignRole", () => {
  it("prevents admin downgrade and promotion to admin", () => {
    expect(canAssignRole({ currentRole: "admin", nextRole: "pegawai" })).toBe(false);
    expect(canAssignRole({ currentRole: "pegawai", nextRole: "admin" })).toBe(false);
    expect(canAssignRole({ currentRole: "guru", nextRole: "pegawai" })).toBe(true);
  });
});

describe("duplicate detection", () => {
  it("reports duplicates by normalized field", () => {
    const duplicate = findDuplicateField({
      existingUsers: [
        { id: "1", nama: "Siti Nur", username: "siti", no_telp: "0812345", nip: "123", nisn: null },
      ],
      candidate: { id: "2", nama: "  siti  nur ", username: "siti2", no_telp: "0812-345", nip: "", nisn: "" },
    });

    expect(duplicate).toBe("nama");
    expect(buildDuplicateFieldMessage("nama")).toContain("Nama");
  });
});
```

- [ ] **Step 2: Run the validation tests to verify they fail**

Run: `npx vitest run tests/lib/user-validation.test.ts`
Expected: FAIL because `lib/user-validation.ts` does not exist yet

- [ ] **Step 3: Implement the minimal validation helpers**

Create `lib/user-validation.ts` with:

```ts
import { normalizeDigitsOnly, normalizeName, normalizeUsername } from "./user-normalization";

type DuplicateUser = {
  id?: string;
  nama?: string | null;
  username?: string | null;
  no_telp?: string | null;
  nip?: string | null;
  nisn?: string | null;
};

export function canAssignRole({
  currentRole,
  nextRole,
}: {
  currentRole?: string | null;
  nextRole?: string | null;
}) {
  if (currentRole === "admin" && nextRole !== "admin") return false;
  if (currentRole !== "admin" && nextRole === "admin") return false;
  return true;
}

export function findDuplicateField({
  existingUsers,
  candidate,
}: {
  existingUsers: DuplicateUser[];
  candidate: DuplicateUser;
}) {
  const comparable = existingUsers.filter((user) => user.id !== candidate.id);

  for (const user of comparable) {
    if (candidate.nama && user.nama && normalizeName(candidate.nama) === normalizeName(user.nama)) {
      return "nama";
    }
    if (candidate.username && user.username && normalizeUsername(candidate.username) === normalizeUsername(user.username)) {
      return "username";
    }
    if (candidate.no_telp && user.no_telp && normalizeDigitsOnly(candidate.no_telp) === normalizeDigitsOnly(user.no_telp)) {
      return "no_telp";
    }
    if (candidate.nip && user.nip && normalizeDigitsOnly(candidate.nip) === normalizeDigitsOnly(user.nip)) {
      return "nip";
    }
    if (candidate.nisn && user.nisn && normalizeDigitsOnly(candidate.nisn) === normalizeDigitsOnly(user.nisn)) {
      return "nisn";
    }
  }

  return null;
}

export function buildDuplicateFieldMessage(field: string) {
  const labels: Record<string, string> = {
    nama: "Nama sudah terdaftar.",
    username: "Username sudah terdaftar.",
    no_telp: "Nomor telepon sudah terdaftar.",
    nip: "NIP sudah terdaftar.",
    nisn: "NISN sudah terdaftar.",
  };

  return labels[field] ?? "Data sudah terdaftar.";
}
```

- [ ] **Step 4: Run the validation tests to verify they pass**

Run: `npm test -- tests/lib/user-validation.test.ts`
Expected: PASS

- [ ] **Step 5: Commit the validation helpers**

```bash
git add lib/user-validation.ts tests/lib/user-validation.test.ts tests/lib/login-lookup.test.ts
git commit -m "test: add user validation helpers"
```

## Chunk 2: Authentication and borrower-role integration

### Task 3: Convert login and auth helpers to username-based sign-in

**Files:**
- Modify: `components/login-form.tsx`
- Modify: `components/forgot-password-form.tsx`
- Modify: `lib/auth-context.tsx`
- Modify: `lib/supabase/proxy.ts`
- Modify: `components/header.tsx`
- Modify: `components/pegawai-sidebar.tsx`

- [ ] **Step 1: Write the failing login lookup helper test**

Add to `tests/lib/login-lookup.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getLoginErrorMessage } from "../../lib/user-validation";

describe("getLoginErrorMessage", () => {
  it("maps username lookup failures to user-friendly messages", () => {
    expect(getLoginErrorMessage("username_not_found")).toContain("Username");
    expect(getLoginErrorMessage("missing_email")).toContain("email");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/lib/login-lookup.test.ts`
Expected: FAIL because `getLoginErrorMessage` does not exist yet

- [ ] **Step 3: Implement the login error helper**

Extend `lib/user-validation.ts`:

```ts
export function getLoginErrorMessage(reason: "username_not_found" | "missing_email" | "invalid_password") {
  const map = {
    username_not_found: "Username tidak ditemukan.",
    missing_email: "Akun tidak memiliki email untuk login. Hubungi admin.",
    invalid_password: "Username atau password salah.",
  };

  return map[reason];
}
```

- [ ] **Step 4: Run the login helper test to verify it passes**

Run: `npm test -- tests/lib/login-lookup.test.ts`
Expected: PASS

- [ ] **Step 5: Refactor the login form to use username**

In `components/login-form.tsx`:

```ts
const [username, setUsername] = useState("");

const { data: account } = await supabase
  .from("tb_user")
  .select("id, email")
  .ilike("username", normalizeUsername(username))
  .maybeSingle();

if (!account) {
  throw new Error(getLoginErrorMessage("username_not_found"));
}

if (!account.email) {
  throw new Error(getLoginErrorMessage("missing_email"));
}

const { data, error: authError } = await supabase.auth.signInWithPassword({
  email: account.email,
  password,
});
```

Also update the form labels and helper text from `Email` to `Username`.

- [ ] **Step 6: Update forgot-password to accept username**

Use the same username lookup pattern in `components/forgot-password-form.tsx`, then call `resetPasswordForEmail` with the stored email.

- [ ] **Step 7: Expand role typing and borrower-role checks**

In `lib/auth-context.tsx`, replace local role typing with the shared `UserRole` from `lib/roles.ts`, and keep fetching profile data from `tb_user`.

In these files, replace direct `role === "pegawai"` logic with `isBorrowerRole(role)`:

- `components/header.tsx`
- `app/pegawai/peminjaman/page.tsx`
- `app/pegawai/peminjaman/form/page.tsx`
- `app/pegawai/pengembalian/page.tsx`
- `app/pegawai/pengembalian/form/page.tsx`
- `app/operator/peminjaman/form/page.tsx`
- `app/admin/peminjaman/form/page.tsx`

- [ ] **Step 8: Update route protection and role labels**

In `lib/supabase/proxy.ts`, keep the current route roots but ensure new borrower roles redirect to `/pegawai/dashboard`.

Update visible labels in `components/header.tsx` and `components/pegawai-sidebar.tsx` so `guru` and `siswa` display correctly while still using the borrower area.

- [ ] **Step 9: Run focused tests and lint**

Run:

```bash
npm test -- tests/lib/roles.test.ts tests/lib/user-normalization.test.ts tests/lib/user-validation.test.ts tests/lib/login-lookup.test.ts
npm run lint -- components/login-form.tsx components/forgot-password-form.tsx lib/auth-context.tsx lib/supabase/proxy.ts components/header.tsx components/pegawai-sidebar.tsx
```

Expected: PASS

- [ ] **Step 10: Commit the auth and borrower-role integration**

```bash
git add components/login-form.tsx components/forgot-password-form.tsx lib/auth-context.tsx lib/supabase/proxy.ts components/header.tsx components/pegawai-sidebar.tsx app/pegawai/peminjaman/page.tsx app/pegawai/peminjaman/form/page.tsx app/pegawai/pengembalian/page.tsx app/pegawai/pengembalian/form/page.tsx app/operator/peminjaman/form/page.tsx app/admin/peminjaman/form/page.tsx
git commit -m "feat: add borrower roles and username login"
```

## Chunk 3: Admin user management and read-only inventory

### Task 4: Apply data-shape changes and role restrictions to admin user management

**Files:**
- Modify: `app/admin/pengguna/page.tsx`
- Modify: `app/admin/pengguna/user-actions.ts`
- Modify: `components/admin-sidebar.tsx`

- [ ] **Step 1: Write the failing server-guard tests**

Extend `tests/lib/user-validation.test.ts` with cases for admin promotion and downgrade, plus duplicate detection for `no_telp`, `nip`, and `nisn`.

- [ ] **Step 2: Run the validation tests to verify the new cases fail**

Run: `npx vitest run tests/lib/user-validation.test.ts`
Expected: FAIL because the new edge cases are not fully handled yet

- [ ] **Step 3: Update the user-management page data model**

Expand the page state and fetched fields in `app/admin/pengguna/page.tsx`:

```ts
interface UserData {
  id: string;
  nama: string;
  username: string;
  email: string;
  role: string;
  nip?: string | null;
  no_telp?: string | null;
  nisn?: string | null;
  kelas?: string | null;
  konsentrasi_keahlian?: string | null;
  alamat?: string | null;
}
```

Remove:

- ban state
- delete state
- ban modal
- delete handler
- block toggle handler

Add dynamic fields per role and remove the `admin` option from the role selector for non-admin flows.

- [ ] **Step 4: Enforce role restrictions and duplicate checks in the server action**

In `app/admin/pengguna/user-actions.ts`:

- load the current row before update
- reject invalid role changes via `canAssignRole`
- fetch comparable users before create/update
- reject duplicate normalized values with `findDuplicateField`
- update `user_metadata` and `tb_user` with the new optional fields

Use a helper shape like:

```ts
const updateDbPayload = {
  nama: userData?.nama,
  username: userData?.username,
  role: nextRole,
  nip: userData?.nip || null,
  no_telp: userData?.no_telp || null,
  nisn: userData?.nisn || null,
  kelas: userData?.kelas || null,
  konsentrasi_keahlian: userData?.konsentrasi_keahlian || null,
  alamat: userData?.alamat || null,
};
```

- [ ] **Step 5: Add the admin inventory navigation item**

Update `components/admin-sidebar.tsx` to include:

```ts
{ icon: <Package size={20} />, label: "Inventaris Barang", path: "/admin/inventaris" }
```

- [ ] **Step 6: Run tests and lint**

Run:

```bash
npm test -- tests/lib/user-validation.test.ts
npm run lint -- app/admin/pengguna/page.tsx app/admin/pengguna/user-actions.ts components/admin-sidebar.tsx
```

Expected: PASS

- [ ] **Step 7: Commit the admin-management restrictions**

```bash
git add app/admin/pengguna/page.tsx app/admin/pengguna/user-actions.ts components/admin-sidebar.tsx
git commit -m "feat: restrict admin user management roles"
```

### Task 5: Refactor inventory UI into shared manage/read-only modes

**Files:**
- Create: `components/inventaris-table.tsx`
- Modify: `app/operator/inventaris/page.tsx`
- Create: `app/admin/inventaris/page.tsx`

- [ ] **Step 1: Write the failing inventory helper test or snapshot-free behavior test**

If no component test runner is introduced, write a pure test for the view-mode helper in `tests/lib/roles.test.ts` or a new helper test:

```ts
import { describe, expect, it } from "vitest";
import { canManageInventory } from "../../lib/roles";

describe("canManageInventory", () => {
  it("allows only operator to manage inventory", () => {
    expect(canManageInventory("operator")).toBe(true);
    expect(canManageInventory("admin")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/lib/roles.test.ts`
Expected: FAIL because `canManageInventory` does not exist yet

- [ ] **Step 3: Implement the minimal mode helper**

Extend `lib/roles.ts`:

```ts
export function canManageInventory(role: string | null | undefined) {
  return role === "operator";
}
```

- [ ] **Step 4: Extract a shared inventory table component**

Create `components/inventaris-table.tsx` that accepts:

```ts
type InventarisMode = "manage" | "readOnly";
```

Props should include:

- `items`
- `loading`
- `searchQuery`
- `setSearchQuery`
- `filterKondisi`
- `setFilterKondisi`
- `mode`
- optional handlers for `onAdd`, `onEdit`, and `onDelete`

Render the add button and action column only when `mode === "manage"`.

- [ ] **Step 5: Move operator inventory page to the shared component**

Keep the current CRUD logic in `app/operator/inventaris/page.tsx`, but delegate listing UI to `components/inventaris-table.tsx` with `mode="manage"`.

- [ ] **Step 6: Add the new admin read-only inventory page**

Create `app/admin/inventaris/page.tsx` that fetches the same inventory data and renders:

```tsx
<InventarisTable
  items={items}
  loading={loading}
  searchQuery={searchQuery}
  setSearchQuery={setSearchQuery}
  filterKondisi={filterKondisi}
  setFilterKondisi={setFilterKondisi}
  mode="readOnly"
/>
```

- [ ] **Step 7: Run tests and lint**

Run:

```bash
npm test -- tests/lib/roles.test.ts
npm run lint -- components/inventaris-table.tsx app/operator/inventaris/page.tsx app/admin/inventaris/page.tsx
```

Expected: PASS

- [ ] **Step 8: Commit the shared inventory view**

```bash
git add lib/roles.ts components/inventaris-table.tsx app/operator/inventaris/page.tsx app/admin/inventaris/page.tsx
git commit -m "feat: add read-only admin inventory view"
```

## Chunk 4: Database migration and final verification

### Task 6: Add and apply the database migration for borrower profile fields

**Files:**
- Create: `supabase/migrations/20260401_add_user_profile_fields.sql`

- [ ] **Step 1: Write the migration file**

```sql
alter table public.tb_user
  add column if not exists no_telp text,
  add column if not exists nisn text,
  add column if not exists kelas text,
  add column if not exists konsentrasi_keahlian text;

create unique index if not exists tb_user_nama_unique_idx
  on public.tb_user (lower(trim(nama)));

create unique index if not exists tb_user_username_unique_idx
  on public.tb_user (lower(trim(username)));

create unique index if not exists tb_user_no_telp_unique_idx
  on public.tb_user (no_telp)
  where no_telp is not null;

create unique index if not exists tb_user_nip_unique_idx
  on public.tb_user (nip)
  where nip is not null;

create unique index if not exists tb_user_nisn_unique_idx
  on public.tb_user (nisn)
  where nisn is not null;
```

- [ ] **Step 2: Apply the migration to the target database**

Run the project's preferred migration path. If Supabase MCP access is configured, use the migration tool. Otherwise, use the linked Supabase CLI workflow for this repository.

Expected: the `tb_user` table gains the new profile columns and unique indexes

- [ ] **Step 3: Update any affected create/update payloads if schema feedback requires it**

Adjust `app/admin/pengguna/user-actions.ts` if the remote schema reveals naming or constraint differences.

- [ ] **Step 4: Run the full verification suite**

Run:

```bash
npm test
npm run lint
npm run build
```

Expected: PASS

- [ ] **Step 5: Perform manual verification**

Check:

1. admin user cannot change to another role
2. non-admin user cannot become admin
3. admin form hides `NIP`
4. `guru` and `siswa` login with `username + password`
5. `guru` and `siswa` land in the borrower area
6. admin inventory page is read-only
7. operator inventory page still supports add, edit, and delete
8. duplicate `nama`, `no_telp`, `nip`, and `nisn` are rejected with readable errors

- [ ] **Step 6: Commit the migration and final integration**

```bash
git add supabase/migrations/20260401_add_user_profile_fields.sql
git add lib/roles.ts lib/user-normalization.ts lib/user-validation.ts
git add components/login-form.tsx components/forgot-password-form.tsx components/header.tsx components/pegawai-sidebar.tsx components/admin-sidebar.tsx components/inventaris-table.tsx
git add app/admin/pengguna/page.tsx app/admin/pengguna/user-actions.ts app/admin/inventaris/page.tsx app/operator/inventaris/page.tsx app/pegawai/peminjaman/page.tsx app/pegawai/peminjaman/form/page.tsx app/pegawai/pengembalian/page.tsx app/pegawai/pengembalian/form/page.tsx app/operator/peminjaman/form/page.tsx app/admin/peminjaman/form/page.tsx
git commit -m "feat: add borrower roles and admin inventory view"
```

## Notes for Execution

- Prefer extracting shared pure helpers before editing UI components so tests can drive the behavior
- Keep any role-comparison logic centralized in `lib/roles.ts`
- If the live database already contains duplicates on `nama`, `username`, `no_telp`, `nip`, or `nisn`, resolve those rows before applying the unique indexes
- If remote migration access is unavailable from this workspace, complete all code changes and leave the SQL migration file ready with a clear note about the unapplied step
