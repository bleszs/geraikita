#!/bin/sh
set -eu

# Model identity is intentional. Never substitute a smaller model on failure.
if [ "${OLLAMA_MODEL:-qwen2.5:1.5b}" != "qwen2.5:1.5b" ]; then
    echo "Expected qwen2.5:1.5b; refusing an unreviewed model change." >&2
    exit 1
fi

ollama serve &
server_pid=$!
stop_server() {
    kill -TERM "$server_pid" 2>/dev/null || true
    wait "$server_pid" 2>/dev/null || true
}
trap 'stop_server; exit 0' TERM INT
trap stop_server EXIT

# Bind the API on the private IPv6 network; use loopback for administration.
attempt=0
until OLLAMA_HOST=http://127.0.0.1:11434 ollama list >/dev/null 2>&1; do
    kill -0 "$server_pid" 2>/dev/null || exit 1
    attempt=$((attempt + 1))
    [ "$attempt" -lt 60 ] || exit 1
    sleep 1
done

# Persist downloaded weights on the attached volume. A restart reuses them;
# updating a mutable registry tag is a deliberate deployment operation.
if ! OLLAMA_HOST=http://127.0.0.1:11434 ollama show qwen2.5:1.5b >/dev/null 2>&1; then
    OLLAMA_HOST=http://127.0.0.1:11434 ollama pull qwen2.5:1.5b
fi
echo "Qwen model present; app inference must still be verified."
wait "$server_pid"
