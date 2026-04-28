# QA Form Engine v3 Manual Guide

> Last updated: 2026-04-28  
> Scope: Mobile Form Engine v3 manual checks for dataset filters, read-only calculated fields, and guarded auto-advance.

## Preconditions

- Mobile app installed with latest build.
- Test survey uses Form Engine v3 schema from `tests/contracts/fixtures/form-engine-v3-ui-datasets.v1.json` or an equivalent backend-created survey.
- Device can run fully offline after survey/datasets are downloaded.
- Dataset catalogs `mx_estados` and `mx_municipios` are cached locally before going offline.

## QA-01 — Dataset Filter Depends On Previous Answer

1. Open the v3 test survey while online and wait for local survey/dataset sync.
2. Disable network.
3. Answer `Estado` with `Ciudad de México`.
4. Open `Municipio`.
5. Confirm only CDMX-linked options are visible, for example `Cuauhtémoc`.
6. Go back and change `Estado` to `Jalisco`.
7. Reopen `Municipio`.
8. Confirm Jalisco-linked options are visible, for example `Guadalajara`, and CDMX-only options are not shown.

Expected result: dataset filtering is applied offline from SQLite items; no network error appears during fill.

## QA-02 — Calculated Read-Only Field Cannot Be Edited

1. Continue the same survey offline.
2. Reach the `Elegibilidad` read-only field.
3. Try tapping, typing, swiping inside, or otherwise interacting with the field.
4. Change the upstream `Estado` answer and return to `Elegibilidad`.

Expected result: the field displays the calculated value but does not accept direct edits. Changes only happen through Form Engine calculation.

## QA-03 — Auto-Advance Blocks Visible Constraint Error

1. Reach `¿Tiene documentos?`.
2. Tap `No`.
3. Observe the selected answer remains visible briefly.
4. Confirm the screen does not advance.
5. Confirm inline/toast error is shown: `No puede avanzar sin documentos.` or the configured equivalent.
6. Tap `Sí`.
7. Confirm auto-advance proceeds to the next question.

Expected result: auto-advance respects local/engine constraints and emits `form_engine_error` telemetry for the blocked path.

## QA-04 — UI Hints Are Consistent

1. Open every field in the fixture survey.
2. Confirm placeholders appear in manual input fields.
3. Confirm `ui.helper_text` appears below the rendered input/control for text, dataset selects, read-only, and yes/no.

Expected result: helper text rendering is owned by `FormRenderer` and is consistent across component types.

## Evidence To Capture

- Screenshot or screen recording for QA-01 filtered options before/after changing state.
- Screenshot for QA-02 read-only calculated display.
- Screenshot/video for QA-03 blocked auto-advance error.
- PostHog/Sentry-safe event evidence for `form_engine_error` if available.
