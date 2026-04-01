import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const readWorkspaceFile = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

test("light UI scope styles are defined for form controls", () => {
  const globalsCss = readWorkspaceFile("app/globals.css");
  const lightUiScope = globalsCss.match(/\.app-light-ui\s*\{[\s\S]*?\}/)?.[0] ?? "";

  assert.match(globalsCss, /\.app-light-ui\s*\{/);
  assert.match(lightUiScope, /--background:\s*0 0% 100%/);
  assert.match(lightUiScope, /--foreground:\s*0 0% 3\.9%/);
  assert.match(lightUiScope, /--border:\s*0 0% 89\.8%/);
  assert.match(lightUiScope, /--input:\s*0 0% 89\.8%/);
  assert.match(lightUiScope, /--ring:\s*0 0% 83\.1%/);
  assert.match(globalsCss, /\.app-light-ui input/);
  assert.match(globalsCss, /\.app-light-ui select/);
  assert.match(globalsCss, /\.app-light-ui textarea/);
  assert.match(globalsCss, /\.app-light-ui option/);
});

test("admin, operator, and pegawai shells opt into the light UI scope", () => {
  const adminSidebar = readWorkspaceFile("components/admin-sidebar.tsx");
  const operatorSidebar = readWorkspaceFile("components/operator-sidebar.tsx");
  const pegawaiSidebar = readWorkspaceFile("components/pegawai-sidebar.tsx");

  assert.match(adminSidebar, /app-light-ui/);
  assert.match(operatorSidebar, /app-light-ui/);
  assert.match(pegawaiSidebar, /app-light-ui/);
});
