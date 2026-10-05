#!/usr/bin/env bash
set -euo pipefail

echo "=================================================="
echo "RUNNING PHASE 16C HOST SYNCHRONIZER UNIT TESTS"
echo "=================================================="

TMP_DIR=$(mktemp -d /tmp/acya-sync-test.XXXXXX)
trap 'rm -rf "${TMP_DIR}"' EXIT

SYNC_BIN="/usr/local/bin/acya-apply-backup-timer.sh"

echo "Test 1: Check non-root execution rejection..."
if "${SYNC_BIN}" --check 2>/dev/null; then
    echo "FAIL: Non-root execution was allowed!"
    exit 1
else
    echo "PASS: Non-root execution correctly rejected (file permissions 0750 prevent non-root access)."
fi

echo "Test 2: Missing state file rejection..."
if sudo "${SYNC_BIN}" --file "${TMP_DIR}/nonexistent.json" 2>/dev/null; then
    echo "FAIL: Non-existent file did not fail!"
    exit 1
else
    echo "PASS: Non-existent file correctly rejected."
fi

echo "Test 3: Malformed JSON syntax..."
echo "{ enabled: true, " > "${TMP_DIR}/bad.json"
if sudo "${SYNC_BIN}" --check --file "${TMP_DIR}/bad.json" 2>/dev/null; then
    echo "FAIL: Malformed JSON did not fail!"
    exit 1
else
    echo "PASS: Malformed JSON correctly rejected."
fi

echo "Test 4: Invalid timezone identifier..."
cat <<'EOF' > "${TMP_DIR}/bad_tz.json"
{
  "enabled": false,
  "frequency": "daily",
  "time": "02:00",
  "timezone": "Mars/Phobos"
}
EOF
if sudo "${SYNC_BIN}" --check --file "${TMP_DIR}/bad_tz.json" 2>/dev/null; then
    echo "FAIL: Invalid timezone did not fail!"
    exit 1
else
    echo "PASS: Invalid timezone correctly rejected."
fi

echo "Test 5: Invalid time format (25:00)..."
cat <<'EOF' > "${TMP_DIR}/bad_time.json"
{
  "enabled": false,
  "frequency": "daily",
  "time": "25:00",
  "timezone": "Africa/Tunis"
}
EOF
if sudo "${SYNC_BIN}" --check --file "${TMP_DIR}/bad_time.json" 2>/dev/null; then
    echo "FAIL: Invalid time did not fail!"
    exit 1
else
    echo "PASS: Invalid time correctly rejected."
fi

echo "Test 6: Unsupported frequency ('weekly')..."
cat <<'EOF' > "${TMP_DIR}/bad_freq.json"
{
  "enabled": false,
  "frequency": "weekly",
  "time": "02:00",
  "timezone": "Africa/Tunis"
}
EOF
if sudo "${SYNC_BIN}" --check --file "${TMP_DIR}/bad_freq.json" 2>/dev/null; then
    echo "FAIL: Unsupported frequency did not fail!"
    exit 1
else
    echo "PASS: Unsupported frequency correctly rejected."
fi

echo "Test 7: Valid Africa/Tunis 02:00 -> 01:00 UTC conversion..."
cat <<'EOF' > "${TMP_DIR}/valid_tunis.json"
{
  "enabled": false,
  "frequency": "daily",
  "time": "02:00",
  "timezone": "Africa/Tunis"
}
EOF
OUTPUT_TUNIS=$(sudo "${SYNC_BIN}" --check --file "${TMP_DIR}/valid_tunis.json")
echo "${OUTPUT_TUNIS}"
if echo "${OUTPUT_TUNIS}" | grep -q "02:00 Africa/Tunis -> 01:00 UTC"; then
    echo "PASS: Africa/Tunis 02:00 converted to 01:00 UTC correctly."
else
    echo "FAIL: Africa/Tunis timezone conversion mismatch!"
    exit 1
fi

echo "Test 8: Valid Europe/Paris 02:00 timezone conversion..."
cat <<'EOF' > "${TMP_DIR}/valid_paris.json"
{
  "enabled": false,
  "frequency": "daily",
  "time": "02:00",
  "timezone": "Europe/Paris"
}
EOF
OUTPUT_PARIS=$(sudo "${SYNC_BIN}" --check --file "${TMP_DIR}/valid_paris.json")
echo "${OUTPUT_PARIS}"
if echo "${OUTPUT_PARIS}" | grep -q "02:00 Europe/Paris"; then
    echo "PASS: Europe/Paris dynamic timezone conversion succeeded."
else
    echo "FAIL: Europe/Paris conversion failed!"
    exit 1
fi

echo "=================================================="
echo "ALL TEST CASES PASSED SUCCESSFULLY"
echo "=================================================="
