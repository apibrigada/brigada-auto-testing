import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturePath = path.join(
  __dirname,
  "fixtures",
  "form-engine-v3-ui-datasets.v1.json",
);

function readFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, "utf8"));
}

function fieldByKey(schema, key) {
  for (const section of schema.sections || []) {
    for (const field of section.fields || []) {
      if (field.question_key === key) return field;
    }
  }
  return null;
}

function assertUiHints(schema, expected) {
  for (const key of expected.helper_text_fields || []) {
    const field = fieldByKey(schema, key);
    assert.ok(field, `missing field ${key}`);
    assert.equal(
      typeof field.ui?.helper_text,
      "string",
      `${key} must define ui.helper_text`,
    );
    assert.ok(field.ui.helper_text.trim(), `${key} helper_text is empty`);
  }

  for (const key of expected.placeholder_fields || []) {
    const field = fieldByKey(schema, key);
    assert.ok(field, `missing field ${key}`);
    assert.equal(
      typeof field.ui?.placeholder,
      "string",
      `${key} must define ui.placeholder`,
    );
    assert.ok(field.ui.placeholder.trim(), `${key} placeholder is empty`);
  }
}

function assertReadOnly(schema, expected) {
  for (const key of expected.read_only_fields || []) {
    const field = fieldByKey(schema, key);
    assert.ok(field, `missing read_only field ${key}`);
    assert.equal(field.type, "read_only", `${key} must use read_only type`);
    assert.equal(field.read_only, true, `${key} must set read_only=true`);
    assert.ok(field.calculated, `${key} must include calculated expression`);
  }
}

function assertDatasetFilter(schema, expected, datasetItems) {
  const key = expected.dataset_filter_field;
  const field = fieldByKey(schema, key);
  assert.ok(field, `missing dataset filter field ${key}`);
  assert.equal(field.type, "single_choice", `${key} must be single_choice`);
  assert.equal(typeof field.dataset_ref, "string", `${key} needs dataset_ref`);
  assert.ok(field.dataset_filter, `${key} needs dataset_filter expression`);
  assert.ok(
    Array.isArray(datasetItems[field.dataset_ref]),
    `${key} dataset_ref must have local fixture items`,
  );

  const filterJson = JSON.stringify(field.dataset_filter);
  assert.ok(
    filterJson.includes("item.parent"),
    `${key} dataset_filter must reference item.parent`,
  );
  assert.ok(
    filterJson.includes("answers.state"),
    `${key} dataset_filter must reference answers.state`,
  );
}

function assertAutoAdvanceGuard(schema, expected) {
  const key = expected.auto_advance_block_field;
  const field = fieldByKey(schema, key);
  assert.ok(field, `missing auto-advance guard field ${key}`);
  assert.ok(field.constraint, `${key} must define a constraint`);
  assert.equal(
    typeof field.constraint_message,
    "string",
    `${key} must define constraint_message`,
  );
  assert.ok(field.constraint_message.trim(), `${key} message is empty`);
}

function assertAdvancedUi(schema, expected) {
  for (const [key, uiExpectations] of Object.entries(
    expected.advanced_ui_fields || {},
  )) {
    const field = fieldByKey(schema, key);
    assert.ok(field, `missing advanced UI field ${key}`);
    for (const [uiKey, value] of Object.entries(uiExpectations)) {
      assert.deepEqual(field.ui?.[uiKey], value, `${key} ui.${uiKey} mismatch`);
    }
  }
}

function assertGisTracking(schema, expected) {
  for (const key of expected.gis_tracking_fields || []) {
    const field = fieldByKey(schema, key);
    assert.ok(field, `missing GIS tracking field ${key}`);
    assert.ok(
      ["gis_tracking_manual", "gis_tracking_auto"].includes(field.type),
      `${key} must use a gis_tracking_* type`,
    );
    assert.equal(
      typeof field.validation_rules?.min_points,
      "number",
      `${key} must define min_points`,
    );
    assert.equal(
      typeof field.validation_rules?.max_duration_s,
      "number",
      `${key} must define max_duration_s`,
    );
  }
}

function assertIneRequiredFields(schema, expected) {
  const key = expected.ine_required_field;
  const field = fieldByKey(schema, key);
  assert.ok(field, `missing INE field ${key}`);
  assert.equal(field.type, "ine_ocr", `${key} must be ine_ocr`);
  assert.deepEqual(
    field.validation_rules?.required_fields,
    ["front", "back", "nombre", "curp", "ocrNumber"],
    `${key} required_fields mismatch`,
  );
}

const fixture = readFixture();
assert.equal(fixture.version, 1, "fixture version must be 1");
assert.ok(Array.isArray(fixture.schemas), "schemas must be an array");

for (const item of fixture.schemas) {
  const schema = item.schema;
  assert.equal(schema.engine, "form-engine-v3", `${item.id}: engine mismatch`);
  assert.equal(schema.engine_version, 3, `${item.id}: engine_version mismatch`);
  assertUiHints(schema, item.expected);
  assertReadOnly(schema, item.expected);
  assertDatasetFilter(schema, item.expected, item.dataset_items || {});
  assertAutoAdvanceGuard(schema, item.expected);
  assertAdvancedUi(schema, item.expected);
  assertGisTracking(schema, item.expected);
  assertIneRequiredFields(schema, item.expected);
}

console.log("form-engine-v3 UI/dataset fixtures contract passed");
