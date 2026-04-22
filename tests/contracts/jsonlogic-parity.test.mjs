import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..", "..", "..");

const fixturePath = path.join(
  workspaceRoot,
  "brigada-auto-testing",
  "tests",
  "contracts",
  "fixtures",
  "jsonlogic-parity.v2.json",
);
const backendRoot = path.join(workspaceRoot, "brigadaBackEnd");
const frontendRoot = path.join(workspaceRoot, "brigadaFrontEnd");
const backendVenvPython = path.join(backendRoot, "venv", "bin", "python");

const backendEvalScript = path.join(
  backendRoot,
  "scripts",
  "eval_jsonlogic_fixtures.py",
);
const frontendEvalScript = path.join(
  frontendRoot,
  "scripts",
  "eval-jsonlogic-fixtures.ts",
);

function runCommand(command, args, { cwd, env }) {
  const proc = spawnSync(command, args, {
    cwd,
    env: { ...process.env, ...(env || {}) },
    encoding: "utf8",
  });

  if (proc.error) {
    throw proc.error;
  }

  if (proc.status !== 0) {
    throw new Error(
      [
        `Command failed: ${command} ${args.join(" ")}`,
        proc.stdout?.trim(),
        proc.stderr?.trim(),
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  const stdout = (proc.stdout || "").trim();
  if (!stdout) {
    throw new Error(`Command returned no output: ${command} ${args.join(" ")}`);
  }

  return JSON.parse(stdout);
}

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function assertEqualWithTolerance(actual, expected, label) {
  if (typeof actual === "number" && typeof expected === "number") {
    const delta = Math.abs(actual - expected);
    assert.ok(
      delta <= 1e-6,
      `${label}: numeric mismatch ${actual} vs ${expected} (delta=${delta})`,
    );
    return;
  }

  if (Array.isArray(actual) && Array.isArray(expected)) {
    assert.equal(
      actual.length,
      expected.length,
      `${label}: array length mismatch`,
    );
    for (let i = 0; i < actual.length; i += 1) {
      assertEqualWithTolerance(actual[i], expected[i], `${label}[${i}]`);
    }
    return;
  }

  if (isObject(actual) && isObject(expected)) {
    const actualKeys = Object.keys(actual).sort();
    const expectedKeys = Object.keys(expected).sort();
    assert.deepEqual(
      actualKeys,
      expectedKeys,
      `${label}: object keys mismatch`,
    );
    for (const key of actualKeys) {
      assertEqualWithTolerance(actual[key], expected[key], `${label}.${key}`);
    }
    return;
  }

  assert.deepEqual(actual, expected, `${label}: value mismatch`);
}

function toMap(outputs) {
  return new Map(outputs.map((item) => [item.id, item]));
}

function main() {
  const fixtureFile = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  const backendPython =
    process.env.BACKEND_PYTHON ||
    (fs.existsSync(backendVenvPython) ? backendVenvPython : "python3");

  const backendResult = runCommand(
    backendPython,
    [backendEvalScript, fixturePath],
    {
      cwd: backendRoot,
      env: {
        PYTHONPATH: backendRoot,
      },
    },
  );

  const frontendResult = runCommand(
    process.env.FRONTEND_TSX_BIN || "npx",
    ["tsx", frontendEvalScript, fixturePath],
    {
      cwd: frontendRoot,
    },
  );

  const backendMap = toMap(backendResult.outputs || []);
  const frontendMap = toMap(frontendResult.outputs || []);

  for (const testCase of fixtureFile.cases || []) {
    const caseId = testCase.id;
    const backendOut = backendMap.get(caseId);
    const frontendOut = frontendMap.get(caseId);

    assert.ok(backendOut, `Missing backend output for case '${caseId}'`);
    assert.ok(frontendOut, `Missing frontend output for case '${caseId}'`);

    if (testCase.expect_error) {
      assert.equal(
        backendOut.ok,
        false,
        `Backend case '${caseId}' should fail`,
      );
      assert.equal(
        frontendOut.ok,
        false,
        `Frontend case '${caseId}' should fail`,
      );

      if (testCase.error_contains) {
        assert.ok(
          String(backendOut.error_message || "").includes(
            testCase.error_contains,
          ),
          `Backend case '${caseId}' error should contain '${testCase.error_contains}'`,
        );
        assert.ok(
          String(frontendOut.error_message || "").includes(
            testCase.error_contains,
          ),
          `Frontend case '${caseId}' error should contain '${testCase.error_contains}'`,
        );
      }
      continue;
    }

    assert.equal(backendOut.ok, true, `Backend case '${caseId}' should pass`);
    assert.equal(frontendOut.ok, true, `Frontend case '${caseId}' should pass`);

    assertEqualWithTolerance(
      frontendOut.result,
      backendOut.result,
      `Parity mismatch for case '${caseId}'`,
    );

    if (Object.prototype.hasOwnProperty.call(testCase, "expected")) {
      assertEqualWithTolerance(
        backendOut.result,
        testCase.expected,
        `Expected-value mismatch for case '${caseId}'`,
      );
    }
  }

  console.log("JSONLogic cross-runtime parity passed (backend ↔ mobile)");
}

main();
