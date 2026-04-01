# User Role, Login, and Admin Inventory Design

## Summary

This design updates the inventory system to support `guru` and `siswa` users alongside the existing `pegawai`, `operator`, and `admin` roles. It also changes user login to use `username + password`, tightens role management rules in admin user management, and adds a read-only inventory view for admins.

The design keeps the current architecture centered on Supabase Auth plus the `tb_user` table. Instead of splitting user profile data into multiple tables, it extends `tb_user` with role-specific optional fields and centralizes validation on the server.

## Goals

- Keep the existing `pegawai` role and add `guru` and `siswa`
- Make `pegawai`, `guru`, and `siswa` share the same borrower-facing features
- Change login from `email + password` to `username + password`
- Prevent admin role escalation or downgrading through user management
- Remove ban and delete-account actions from admin user management
- Remove `NIP` usage for admin accounts in user management
- Add an admin inventory menu that only shows stock without create/edit/delete actions
- Enforce uniqueness validation for `nama`, `no_telp`, `nip`, and `nisn`

## Non-Goals

- Creating separate dashboard areas for `guru` and `siswa`
- Replacing Supabase Auth with custom authentication
- Refactoring unrelated operator or borrowing workflows
- Adding a standalone profile page outside the existing management flows

## Current State

- Roles currently used by the app are `admin`, `operator`, and `pegawai`
- Login uses `email + password` in [`components/login-form.tsx`](/d:/Tugas%20MPKK/UKK/apip/UKK/components/login-form.tsx)
- Auth state loads role data from `tb_user` in [`lib/auth-context.tsx`](/d:/Tugas%20MPKK/UKK/apip/UKK/lib/auth-context.tsx)
- Admin user management in [`app/admin/pengguna/page.tsx`](/d:/Tugas%20MPKK/UKK/apip/UKK/app/admin/pengguna/page.tsx) allows:
  - editing all roles, including `admin`
  - ban/unban
  - deleting users
  - entering `NIP` for any user
- Inventory management in [`app/operator/inventaris/page.tsx`](/d:/Tugas%20MPKK/UKK/apip/UKK/app/operator/inventaris/page.tsx) is full CRUD and is only exposed in the operator area

## Data Model

### `tb_user`

Keep `tb_user` as the single application profile table and extend it with nullable columns for borrower-specific data:

- `no_telp`
- `nisn`
- `kelas`
- `konsentrasi_keahlian`

Existing columns continue to be used:

- `id`
- `nama`
- `username`
- `email`
- `password`
- `nip`
- `alamat`
- `role`
- `blocked_until`

### Role-specific fields

- `admin`
  - required: `nama`, `username`, `email`
  - optional: `alamat`
  - not used: `nip`, `nisn`, `kelas`, `konsentrasi_keahlian`, `no_telp`
- `operator`
  - keep current behavior unless updated manually in admin management
- `pegawai`
  - `nama`, `username`, `nip`, `no_telp`, `alamat`
- `guru`
  - same fields and features as `pegawai`
- `siswa`
  - `nama`, `username`, `nisn`, `kelas`, `konsentrasi_keahlian`, `no_telp`, `alamat`

## Role Model and Routing

The role list becomes:

- `admin`
- `operator`
- `pegawai`
- `guru`
- `siswa`

Borrower-style roles are treated as one group for feature access:

- `pegawai`
- `guru`
- `siswa`

These roles all use the existing `/pegawai/*` area and behavior. The routing and page checks that currently special-case `pegawai` will be updated to recognize all borrower roles.

Examples:

- login redirect
- protected route checks
- borrower dashboard labels
- borrower borrowing form access
- borrower return flow

## Authentication Design

### Login

The login form changes from `email` to `username`.

Because Supabase Auth still authenticates with email internally, the app will:

1. normalize the entered username
2. look up the matching row in `tb_user`
3. read the stored email for that username
4. call `supabase.auth.signInWithPassword({ email, password })`
5. continue the existing role-based redirect flow

This keeps Supabase Auth intact while giving end users a username-based login experience.

### Forgot Password

The forgot-password flow should also accept `username` for consistency. The app will map the username to the stored email before calling the Supabase reset flow.

## User Management Rules

### Admin protections

The admin user-management UI and server action must both enforce:

- an existing `admin` account cannot be reassigned to another role
- a non-admin account cannot be changed into `admin`
- the create form cannot create a new `admin` account through the normal role dropdown

This restriction must exist server-side in [`app/admin/pengguna/user-actions.ts`](/d:/Tugas%20MPKK/UKK/apip/UKK/app/admin/pengguna/user-actions.ts), not only in the client form.

### Removed actions

Remove from admin user management:

- ban / unban button
- delete user button
- ban modal and related logic
- delete action calls from the page

The server action may keep the delete code if needed for compatibility, but the preferred implementation is to reject unsupported actions at the boundary used by the page.

### Dynamic user form

The admin management form becomes role-aware:

- `admin`
  - hide `NIP`
  - show no borrower-only identity fields
- `operator`
  - no `admin` option in role selector while editing or creating
- `pegawai` and `guru`
  - show `NIP`, `No Telp`, `Alamat`
- `siswa`
  - show `NISN`, `Kelas`, `Konsentrasi Keahlian`, `No Telp`, `Alamat`

The page must also keep email immutable while editing if that matches the existing behavior.

## Validation Design

Validation is enforced in two layers:

### Application validation

Before create and update actions:

- trim text fields
- normalize `username` and compare case-insensitively
- normalize numeric identity fields by removing non-digits
- reject duplicate values for:
  - `nama`
  - `no_telp`
  - `nip`
  - `nisn`
  - `username`

When editing, the current record must be excluded from duplicate checks.

### Database validation

Add unique indexes or equivalent constraints where appropriate so direct writes cannot bypass the app-layer rules. Because some fields are optional, the migration should use partial unique indexes that ignore `NULL` values.

Planned uniqueness behavior:

- `lower(trim(nama))`
- `lower(trim(username))`
- normalized `no_telp`
- normalized `nip`
- normalized `nisn`

## Inventory View for Admin

Add a new admin menu item:

- `Inventaris Barang`

Add a new page:

- `/admin/inventaris`

This page reuses the current inventory listing experience but is read-only:

- keep search
- keep condition filter
- show stock and item details
- hide add-item button
- hide action column
- hide edit/delete buttons
- hide add/edit modal

The recommended implementation is to extract a shared inventory table/view component with a mode flag:

- `manage`
- `readOnly`

Operator pages continue to use `manage`; admin uses `readOnly`.

## UI and Label Updates

Update labels across header and sidebar helpers so the new roles display correctly:

- `Pegawai`
- `Guru`
- `Siswa`

Borrower-facing pages may continue using the same layout component, but the visible text should avoid implying that only `pegawai` can use the page where that would now be incorrect.

## Error Handling

- Login should show a clear message if the username is not found
- Login should keep the current blocked-account handling
- User management should return friendly duplicate-field messages that identify the conflicting field
- Read-only admin inventory should still show loading, empty-state, and fetch-error behavior consistent with existing pages

## Testing Strategy

### Automated

Add focused tests around pure logic introduced by this change:

- borrower-role grouping helper
- login username normalization and lookup helper
- user payload normalization
- duplicate-field validation helper
- role change guard helper

### Manual

Verify these flows:

1. `pegawai` login with username and password
2. `guru` login with username and password
3. `siswa` login with username and password
4. blocked account still fails with the expected message
5. admin cannot downgrade the admin account
6. admin cannot promote another user to admin
7. `NIP` is hidden for admin in user management
8. duplicate `nama`, `no_telp`, `nip`, and `nisn` are rejected
9. admin inventory page shows stock without action controls
10. operator inventory page still supports CRUD

## Risks and Mitigations

- Username-based login now depends on `tb_user.email` being populated
  - mitigate by validating email presence before attempting sign-in
- New uniqueness constraints may fail if existing production data already contains duplicates
  - mitigate by auditing data before applying the migration or handling duplicates first
- Borrower role expansion may miss a hard-coded `role === 'pegawai'` check
  - mitigate by centralizing borrower-role checks in a helper and replacing direct comparisons

## Implementation Notes

- Prefer shared helpers over duplicating role checks or normalization logic
- Keep operator behavior unchanged except where shared components are extracted
- Use server-side validation as the source of truth for user management rules
