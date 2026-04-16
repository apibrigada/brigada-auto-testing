# Maestro Mobile Flow Tests

Maestro UI automation flows for the Brigada mobile app (React Native / Expo).

## Prerequisites

```bash
# Install Maestro CLI
curl -Ls "https://get.maestro.mobile.dev" | bash

# Verify installation
maestro --version
```

## Environment Variables

Set these before running flows (or export from CI secrets):

```bash
export TEST_EMAIL="brigadista@yourorg.com"
export TEST_PASSWORD="securepassword"
```

## Run Flows

```bash
# From brigada-auto-testing root

# Individual flow
maestro test tests/maestro/login.yaml
maestro test tests/maestro/submit-survey-online.yaml
maestro test tests/maestro/offline-sync.yaml

# All flows in sequence
maestro test tests/maestro/
```

## Flows

| File | Description |
|------|-------------|
| `login.yaml` | App launch → enter credentials → assert home visible |
| `submit-survey-online.yaml` | Navigate to Cuestionarios → fill survey → submit → assert confirmed |
| `offline-sync.yaml` | Airplane mode ON → fill survey → airplane mode OFF → assert sync queued |

## Notes

- These flows use `clearState: false` after login.yaml to reuse the session.
- `setAirplaneMode` requires a real device or an emulator with AVD airplane mode support.
- Survey content is read from whatever assignment is active in the test environment.
- Flows use `optional:` blocks for UI steps that may not appear in all environments.
- The `appId` must match the actual bundle ID configured in `app.json` › `android.package` / `ios.bundleIdentifier`.

## Maestro References

- [Maestro Docs](https://maestro.mobile.dev/)
- [Flow Syntax](https://maestro.mobile.dev/api-reference/commands)
- [environment variables](https://maestro.mobile.dev/cli/test-suites-and-reports#parameterizing-tests-dynamic-values)
