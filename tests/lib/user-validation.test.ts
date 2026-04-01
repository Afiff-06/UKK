import test from "node:test";
import assert from "node:assert/strict";

import {
  buildDuplicateFieldMessage,
  canDeleteManagedUser,
  canAssignRole,
  findDuplicateField,
  getEditableRoleOptions,
  getLoginErrorMessage,
} from "../../lib/user-validation.ts";

test("admin role cannot be downgraded and other roles cannot be promoted to admin", () => {
  assert.equal(canAssignRole({ currentRole: "admin", nextRole: "pegawai" }), false);
  assert.equal(canAssignRole({ currentRole: "pegawai", nextRole: "admin" }), false);
  assert.equal(canAssignRole({ currentRole: "guru", nextRole: "pegawai" }), true);
});

test("duplicate detection checks normalized identity fields", () => {
  const duplicateNama = findDuplicateField({
    existingUsers: [
      {
        id: "1",
        nama: "Siti Nur",
        username: "siti",
        no_telp: "0812345",
        nip: "123456",
        nisn: null,
      },
    ],
    candidate: {
      id: "2",
      nama: "  siti   nur ",
      username: "siti-lain",
      no_telp: "0812-9999",
      nip: "",
      nisn: "",
    },
  });

  const duplicateNip = findDuplicateField({
    existingUsers: [
      {
        id: "1",
        nama: "Budi",
        username: "budi",
        no_telp: "0812345",
        nip: "123-456",
        nisn: null,
      },
    ],
    candidate: {
      id: "2",
      nama: "Budi Dua",
      username: "budi2",
      no_telp: "0812-9999",
      nip: "123456",
      nisn: "",
    },
  });

  const duplicateNisn = findDuplicateField({
    existingUsers: [
      {
        id: "1",
        nama: "Ani",
        username: "ani",
        no_telp: "0812345",
        nip: null,
        nisn: "00112233",
      },
    ],
    candidate: {
      id: "2",
      nama: "Ani Dua",
      username: "ani2",
      no_telp: "0812-9999",
      nip: "",
      nisn: "0011-2233",
    },
  });

  assert.equal(duplicateNama, "nama");
  assert.equal(duplicateNip, "nip");
  assert.equal(duplicateNisn, "nisn");
  assert.match(buildDuplicateFieldMessage("nama"), /Nama/i);
});

test("editable roles never include admin and admin keeps its own locked role", () => {
  assert.deepEqual(getEditableRoleOptions("admin"), ["admin"]);
  assert.deepEqual(getEditableRoleOptions("pegawai"), [
    "pegawai",
    "guru",
    "siswa",
    "operator",
  ]);
  assert.deepEqual(getEditableRoleOptions(null), ["pegawai", "guru", "siswa", "operator"]);
});

test("only non-admin managed users can be deleted", () => {
  assert.equal(canDeleteManagedUser("admin"), false);
  assert.equal(canDeleteManagedUser("operator"), true);
  assert.equal(canDeleteManagedUser("pegawai"), true);
  assert.equal(canDeleteManagedUser("guru"), true);
  assert.equal(canDeleteManagedUser("siswa"), true);
});

test("login errors map to friendly messages", () => {
  assert.match(getLoginErrorMessage("username_not_found"), /Username/i);
  assert.match(getLoginErrorMessage("missing_email"), /email/i);
  assert.match(getLoginErrorMessage("invalid_password"), /password/i);
});
