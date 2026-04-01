import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const pageSource = readFileSync(
  resolve(process.cwd(), "app/admin/pengguna/page.tsx"),
  "utf8",
);

test("manajemen pengguna modal can fit smaller viewports", () => {
  assert.match(pageSource, /fixed inset-0[^\n]*overflow-y-auto/);
  assert.match(pageSource, /min-h-full/);
  assert.match(pageSource, /max-h-\[calc\(100vh-2rem\)\]/);
  assert.match(pageSource, /overflow-y-auto rounded-2xl shadow-2xl/);
});
