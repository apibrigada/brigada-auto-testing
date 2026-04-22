import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const workspaceRoot = path.resolve(__dirname, "..", "..", "..");

const contractFiles = {
  backend: {
    operatorMatrix: path.join(
      workspaceRoot,
      "brigadaBackEnd",
      "ai-context",
      "contracts",
      "jsonlogic-operator-matrix.v2.json",
    ),
    validationRules: path.join(
      workspaceRoot,
      "brigadaBackEnd",
      "ai-context",
      "contracts",
      "validation_rules.v2.json",
    ),
  },
  cms: {
    operatorMatrix: path.join(
      workspaceRoot,
      "brigadaWebCMS",
      "ai-context",
      "contracts",
      "jsonlogic-operator-matrix.v2.json",
    ),
    validationRules: path.join(
      workspaceRoot,
      "brigadaWebCMS",
      "ai-context",
      "contracts",
      "validation_rules.v2.json",
    ),
  },
  mobile: {
    operatorMatrix: path.join(
      workspaceRoot,
      "brigadaFrontEnd",
      "ai-context",
      "contracts",
      "jsonlogic-operator-matrix.v2.json",
    ),
    validationRules: path.join(
      workspaceRoot,
      "brigadaFrontEnd",
      "ai-context",
      "contracts",
      "validation_rules.v2.json",
    ),
  },
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function assertOperatorMatrixSemantics(contract) {
  const policy = contract.schema_version_policy;
  assert.equal(policy.default, 2, "schema_version default must be 2");
  assert.equal(
    policy.min_supported,
    1,
    "schema_version min_supported must be 1",
  );
  assert.equal(
    policy.max_supported,
    2,
    "schema_version max_supported must be 2",
  );
  assert.equal(
    contract.jsonlogic_operator_matrix_version,
    2,
    "jsonlogic_operator_matrix_version must be 2",
  );

  const matrix = contract.operators;
  assert.ok(Array.isArray(matrix.string), "matrix.string must be an array");
  assert.ok(Array.isArray(matrix.number), "matrix.number must be an array");
  assert.ok(Array.isArray(matrix.boolean), "matrix.boolean must be an array");

  assert.ok(matrix.string.includes("in"), "string kind must support 'in'");
  assert.ok(
    matrix.string.includes("match"),
    "string kind must support 'match'",
  );
  assert.ok(
    !matrix.boolean.includes("in"),
    "boolean kind must not support 'in'",
  );
  assert.ok(matrix.number.includes(">="), "number kind must support '>='");
  assert.ok(
    matrix.number.includes("between"),
    "number kind must support 'between'",
  );
  assert.ok(
    Array.isArray(matrix.attachment),
    "matrix.attachment must be an array",
  );
  assert.ok(
    matrix.attachment.includes("attachment_size"),
    "attachment kind must support 'attachment_size'",
  );
  assert.ok(Array.isArray(matrix.geojson), "matrix.geojson must be an array");
  assert.ok(
    matrix.geojson.includes("geo_area"),
    "geojson kind must support 'geo_area'",
  );

  const customOps = contract.custom_operators || {};
  for (const op of [
    "match",
    "date_diff",
    "count",
    "between",
    "geo_area",
    "attachment_size",
  ]) {
    assert.ok(customOps[op], `custom operator '${op}' must be declared`);
  }

  const canonicalIn = contract.simple_rule_shape.canonical_in_expression;
  const legacyIn = contract.simple_rule_shape.legacy_in_expression_accepted;

  assert.equal(
    canonicalIn.in[1].var,
    "answers.question_key",
    "canonical in expression must keep source var at index 1",
  );
  assert.equal(
    legacyIn.in[0].var,
    "answers.question_key",
    "legacy in expression must keep source var at index 0",
  );

  const security = contract.security || {};
  assert.equal(security.max_depth, 8, "security.max_depth must be 8");
  assert.equal(security.max_nodes, 50, "security.max_nodes must be 50");
}

function assertValidationRulesSemantics(contract) {
  assert.equal(
    contract.version,
    2,
    "validation rules contract version must be 2",
  );
  assert.equal(
    contract.type,
    "object",
    "validation rules root type must be object",
  );

  const questionTypeEnum = contract?.properties?.question_type?.enum || [];
  assert.ok(
    Array.isArray(questionTypeEnum),
    "question_type enum must be an array",
  );
  for (const typeName of [
    "regex",
    "decimal",
    "file",
    "location",
    "gis_polygon",
  ]) {
    assert.ok(
      questionTypeEnum.includes(typeName),
      `question_type enum must include '${typeName}'`,
    );
  }

  const xRequiredOps = contract["x-jsonlogic-v2-operators-required"] || [];
  assert.deepEqual(
    xRequiredOps,
    ["match", "date_diff", "count", "between", "geo_area", "attachment_size"],
    "validation rules must declare required JSONLogic v2 operators",
  );

  const regexConstraint = (contract.allOf || []).find(
    (entry) => entry?.if?.properties?.question_type?.const === "regex",
  );
  assert.ok(regexConstraint, "regex conditional schema must exist");
  assert.deepEqual(
    regexConstraint.then.properties.validation_rules.required,
    ["pattern"],
    "regex validation must require pattern",
  );
}

function main() {
  const contracts = {
    backend: {
      operatorMatrix: readJson(contractFiles.backend.operatorMatrix),
      validationRules: readJson(contractFiles.backend.validationRules),
    },
    cms: {
      operatorMatrix: readJson(contractFiles.cms.operatorMatrix),
      validationRules: readJson(contractFiles.cms.validationRules),
    },
    mobile: {
      operatorMatrix: readJson(contractFiles.mobile.operatorMatrix),
      validationRules: readJson(contractFiles.mobile.validationRules),
    },
  };

  assert.deepEqual(
    contracts.backend.operatorMatrix,
    contracts.cms.operatorMatrix,
    "Backend and CMS operator matrix contracts diverge",
  );
  assert.deepEqual(
    contracts.backend.operatorMatrix,
    contracts.mobile.operatorMatrix,
    "Backend and Mobile operator matrix contracts diverge",
  );
  assert.deepEqual(
    contracts.backend.validationRules,
    contracts.cms.validationRules,
    "Backend and CMS validation-rules contracts diverge",
  );
  assert.deepEqual(
    contracts.backend.validationRules,
    contracts.mobile.validationRules,
    "Backend and Mobile validation-rules contracts diverge",
  );

  assertOperatorMatrixSemantics(contracts.backend.operatorMatrix);
  assertValidationRulesSemantics(contracts.backend.validationRules);

  console.log("Cross-system survey contract validation passed (v2)");
}

main();
