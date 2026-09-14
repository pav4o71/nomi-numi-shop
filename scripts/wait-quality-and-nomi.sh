#!/usr/bin/env bash

set -Eeuo pipefail

# ==========================================================
# nomi-numi-shop
# Wait for PR Quality Gate + Nomi PR Verifier readiness
# ==========================================================

PR_NUMBER="${1:-}"

if [[ -z "$PR_NUMBER" ]]; then
  printf 'Usage: %s <pr-number>\n' "$0" >&2
  exit 2
fi

if ! [[ "$PR_NUMBER" =~ ^[0-9]+$ ]]; then
  printf 'Error: PR number must be a positive integer, got: %s\n' "$PR_NUMBER" >&2
  exit 2
fi

if ! command -v gh >/dev/null 2>&1; then
  printf 'Error: GitHub CLI (gh) is required but not installed\n' >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  printf 'Error: GitHub CLI is not authenticated. Run: gh auth login\n' >&2
  exit 1
fi

printf '=================================================\n'
printf ' WAIT FOR PR QUALITY GATE + NOMI PR VERIFIER\n'
printf ' PR #%s\n' "$PR_NUMBER"
printf '=================================================\n\n'

# Step 1: Capture the expected HEAD SHA from the PR
printf 'Step 1: Capturing expected HEAD SHA...\n'

EXPECTED_HEAD="$(gh pr view "$PR_NUMBER" --json headRefOid --jq '.headRefOid' 2>/dev/null || true)"

if [[ -z "$EXPECTED_HEAD" ]] || ! [[ "$EXPECTED_HEAD" =~ ^[0-9a-f]{40}$ ]]; then
  printf 'Error: Could not retrieve valid HEAD SHA for PR #%s\n' "$PR_NUMBER" >&2
  exit 1
fi

printf 'Expected HEAD SHA: %s\n\n' "$EXPECTED_HEAD"

# Step 2: Wait for "PR Quality Gate" check to succeed
printf 'Step 2: Waiting for "PR Quality Gate" check to succeed...\n'

CHECK_NAME="PR Quality Gate"
MAX_WAIT_SECONDS=600
POLL_INTERVAL=10
ELAPSED=0

while true; do
  # Check if the PR head SHA has changed (fail closed)
  CURRENT_HEAD="$(gh pr view "$PR_NUMBER" --json headRefOid --jq '.headRefOid' 2>/dev/null || true)"
  
  if [[ "$CURRENT_HEAD" != "$EXPECTED_HEAD" ]]; then
    printf '\nError: PR head SHA changed during wait\n' >&2
    printf '  Expected: %s\n' "$EXPECTED_HEAD" >&2
    printf '  Current:  %s\n' "$CURRENT_HEAD" >&2
    printf 'Failing closed - re-run after the new commit is verified\n' >&2
    exit 1
  fi

  # Query the check status for the expected SHA
  CHECK_STATUS="$(gh api "/repos/{owner}/{repo}/commits/${EXPECTED_HEAD}/check-runs" \
    --jq ".check_runs[] | select(.name == \"${CHECK_NAME}\") | .status" 2>/dev/null || true)"

  CHECK_CONCLUSION="$(gh api "/repos/{owner}/{repo}/commits/${EXPECTED_HEAD}/check-runs" \
    --jq ".check_runs[] | select(.name == \"${CHECK_NAME}\") | .conclusion" 2>/dev/null || true)"

  if [[ "$CHECK_STATUS" == "completed" ]]; then
    if [[ "$CHECK_CONCLUSION" == "success" ]]; then
      printf '✓ PR Quality Gate succeeded for SHA %s\n\n' "$EXPECTED_HEAD"
      break
    else
      printf '\nError: PR Quality Gate failed with conclusion: %s\n' "$CHECK_CONCLUSION" >&2
      exit 1
    fi
  fi

  # Check timeout
  if [[ "$ELAPSED" -ge "$MAX_WAIT_SECONDS" ]]; then
    printf '\nError: Timed out waiting for PR Quality Gate (waited %d seconds)\n' "$MAX_WAIT_SECONDS" >&2
    exit 1
  fi

  printf '  Status: %s (waiting...)\n' "${CHECK_STATUS:-pending}"
  sleep "$POLL_INTERVAL"
  ELAPSED=$((ELAPSED + POLL_INTERVAL))
done

# Step 3: Check Nomi PR Verifier issue comment for this exact SHA
printf 'Step 3: Checking Nomi PR Verifier status...\n'

# Fetch the latest issue comment from the PR that contains "## Nomi PR Verifier"
NOMI_COMMENT="$(gh pr view "$PR_NUMBER" --json comments --jq '.comments[] | select(.body | contains("## Nomi PR Verifier")) | .body' 2>/dev/null | tail -1 || true)"

if [[ -z "$NOMI_COMMENT" ]]; then
  printf 'Error: No Nomi PR Verifier comment found for PR #%s\n' "$PR_NUMBER" >&2
  exit 1
fi

# Extract the SHA from the Nomi comment (format: "**Commit:** `<sha>`")
NOMI_SHA="$(printf '%s' "$NOMI_COMMENT" | grep -oP '\*\*Commit:\*\*\s*`\K[0-9a-f]{40}(?=`)' || true)"

if [[ -z "$NOMI_SHA" ]]; then
  printf 'Error: Could not extract SHA from Nomi PR Verifier comment\n' >&2
  exit 1
fi

# Verify the SHA matches the expected HEAD
if [[ "$NOMI_SHA" != "$EXPECTED_HEAD" ]]; then
  printf 'Error: Nomi PR Verifier SHA mismatch\n' >&2
  printf '  Expected: %s\n' "$EXPECTED_HEAD" >&2
  printf '  Found:    %s (stale)\n' "$NOMI_SHA" >&2
  exit 1
fi

# Extract the verdict from the Nomi comment (format: "**Verdict:** <PASS|HOLD|BLOCK>")
NOMI_VERDICT="$(printf '%s' "$NOMI_COMMENT" | grep -oP '\*\*Verdict:\*\*\s*\K(PASS|HOLD|BLOCK)' || true)"

if [[ -z "$NOMI_VERDICT" ]]; then
  printf 'Error: Could not extract verdict from Nomi PR Verifier comment\n' >&2
  exit 1
fi

if [[ "$NOMI_VERDICT" != "PASS" ]]; then
  printf 'Error: Nomi PR Verifier verdict is %s (expected PASS)\n' "$NOMI_VERDICT" >&2
  exit 1
fi

printf '✓ Nomi PR Verifier: PASS for SHA %s\n\n' "$EXPECTED_HEAD"

# Final success
printf '=================================================\n'
printf ' ✓ ALL CHECKS READY\n'
printf '   PR Quality Gate: SUCCESS\n'
printf '   Nomi PR Verifier: PASS\n'
printf '   SHA: %s\n' "$EXPECTED_HEAD"
printf '=================================================\n'

exit 0
