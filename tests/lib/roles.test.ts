import test from "node:test";
import assert from "node:assert/strict";

import {
  BORROWER_ROLES,
  canManageInventory,
  formatBorrowerIdentity,
  getRoleLabel,
  getRoutePrefixForRole,
  isBorrowerRole,
} from "../../lib/roles.ts";

test("borrower roles include pegawai, guru, and siswa", () => {
  assert.deepEqual(BORROWER_ROLES, ["pegawai", "guru", "siswa"]);
  assert.equal(isBorrowerRole("pegawai"), true);
  assert.equal(isBorrowerRole("guru"), true);
  assert.equal(isBorrowerRole("siswa"), true);
});

test("admin and operator are not borrower roles", () => {
  assert.equal(isBorrowerRole("admin"), false);
  assert.equal(isBorrowerRole("operator"), false);
});

test("inventory management only belongs to operator", () => {
  assert.equal(canManageInventory("operator"), true);
  assert.equal(canManageInventory("admin"), false);
  assert.equal(canManageInventory("pegawai"), false);
});

test("route prefixes and labels support new roles", () => {
  assert.equal(getRoutePrefixForRole("admin"), "/admin");
  assert.equal(getRoutePrefixForRole("operator"), "/operator");
  assert.equal(getRoutePrefixForRole("guru"), "/pegawai");
  assert.equal(getRoutePrefixForRole("siswa"), "/pegawai");
  assert.equal(getRoleLabel("guru"), "Guru");
  assert.equal(getRoleLabel("siswa"), "Siswa");
});

test("formatBorrowerIdentity prioritizes role and username consistently", () => {
  assert.equal(
    formatBorrowerIdentity({ role: "guru", username: "budi" }),
    "Guru • @budi",
  );
  assert.equal(
    formatBorrowerIdentity({ role: "siswa", username: "ani" }),
    "Siswa • @ani",
  );
  assert.equal(
    formatBorrowerIdentity({ username: "operator1" }),
    "@operator1",
  );
  assert.equal(
    formatBorrowerIdentity({ role: "pegawai" }),
    "Pegawai",
  );
  assert.equal(
    formatBorrowerIdentity({}),
    "",
  );
});
