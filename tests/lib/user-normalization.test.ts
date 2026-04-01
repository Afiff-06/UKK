import test from "node:test";
import assert from "node:assert/strict";

import {
  buildInternalUserEmail,
  normalizeDigitsOnly,
  normalizeName,
  normalizePhoneNumber,
  normalizeUsername,
  sanitizeNullableText,
} from "../../lib/user-normalization.ts";

test("normalizes names and usernames consistently", () => {
  assert.equal(normalizeName("  Siti   Nurhaliza  "), "siti nurhaliza");
  assert.equal(normalizeUsername("  USER_SISWA  "), "user_siswa");
});

test("keeps only digits for numeric identity fields", () => {
  assert.equal(normalizeDigitsOnly("0812-345-678"), "0812345678");
  assert.equal(normalizePhoneNumber("+62 812 345 678"), "62812345678");
});

test("nullable text becomes null when blank", () => {
  assert.equal(sanitizeNullableText("   "), null);
  assert.equal(sanitizeNullableText(" XII RPL "), "XII RPL");
});

test("builds a deterministic internal auth email from username", () => {
  assert.equal(
    buildInternalUserEmail(" Guru Satu "),
    "u-677572752073617475@users.example.com",
  );
  assert.notEqual(
    buildInternalUserEmail("guru satu"),
    buildInternalUserEmail("guru_dua"),
  );
});
