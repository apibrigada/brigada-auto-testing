/**
 * label-expression-readonly.test.mjs
 *
 * SB2-13-04 b — node:assert wrapper around
 * `brigadaFrontEnd/scripts/eval-label-expression.ts`. Confirms the mobile
 * `ExpressionEvaluator.resolveLabel()` (used by `FormEngine.getLabel()`,
 * which is what the legacy `fill.tsx` `read_only` path now calls)
 * evaluates `label_expression` correctly and falls back to the static
 * label when the expression returns a non-string or throws.
 *
 * Why this lives in `tests/contracts/`:
 *   - The Expo app has no test runner of its own (per AGENTS.md).
 *   - The same TS-script + spawn pattern is already used by
 *     `jsonlogic-parity.test.mjs`.
 */

import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..", "..", "..");
const frontendRoot = path.join(workspaceRoot, "brigadaFrontEnd");
const scriptPath = path.join(
  frontendRoot,
  "scripts",
  "eval-label-expression.ts",
);

function runScript() {
  const proc = spawnSync(
    process.env.FRONTEND_TSX_BIN || "npx",
    ["tsx", scriptPath],
    {
      cwd: frontendRoot,
      env: process.env,
      encoding: "utf8",
    },
  );
  if (proc.error) throw proc.error;
  if (proc.status !== 0) {
    throw new Error(
      [
        `eval-label-expression script failed: ${proc.status}`,
        proc.stdout?.trim(),
        proc.stderr?.trim(),
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }
  const stdout = (proc.stdout || "").trim();
  if (!stdout) throw new Error("Script returned no output");
  return JSON.parse(stdout);
}

function assertCase(actualResults, id, predicate) {
  const row = actualResults.find((r) => r.id === id);
  assert.ok(row, `Missing result for case "${id}"`);
  assert.equal(row.ok, true, `Case "${id}" threw: ${row.error_message}`);
  predicate(row);
}

const results = runScript();

// 1. Static label without label_expression must return field.label verbatim.
assertCase(results, "static-no-expression", (row) => {
  assert.equal(row.actual, "Texto fijo");
});

// 2. `cat` expression with a present answer must interpolate the value.
assertCase(results, "concat-with-answer", (row) => {
  assert.equal(row.actual, "Hola, Marta");
});

// 3. Missing answer must NOT crash; the resolver returns a string starting
//    with the literal prefix. Coercion behaviour is jsonlogic-defined.
assertCase(results, "concat-missing-answer-coerced-to-empty", (row) => {
  assert.equal(typeof row.actual, "string");
  assert.ok(
    row.actual.startsWith("Hola, "),
    `Expected actual to start with "Hola, ", got ${JSON.stringify(row.actual)}`,
  );
});

// 4. Non-string expression result (number) must fall back to static label
//    so the read_only renderer never displays "[object Object]" or "3".
assertCase(results, "non-string-result-falls-back-to-static", (row) => {
  assert.equal(row.actual, "Etiqueta estática");
});

// 5. Throwing expression (unknown operator) must also fall back to static
//    label — fail-open is the documented contract of resolveLabel().
assertCase(results, "throwing-expression-falls-back-to-static", (row) => {
  assert.equal(row.actual, "Etiqueta estática segura");
});

console.log("label-expression-readonly: 5/5 cases passed");
