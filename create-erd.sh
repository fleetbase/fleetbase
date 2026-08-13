#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

ERD_DB_HOST="${ERD_DB_HOST:-localhost}"
ERD_DB_PORT="${ERD_DB_PORT:-3306}"
ERD_DB_NAME="${ERD_DB_NAME:-fleetbase}"
ERD_DB_USER="${ERD_DB_USER:-root}"
ERD_DB_PASSWORD="${ERD_DB_PASSWORD:-}"
ERD_SCHEMA_PATTERN="${ERD_SCHEMA_PATTERN:-^(?!(information_schema|mysql|performance_schema|sys)\\.)(?![^.]+_sandbox\\.).*}"
ERD_DOCKER_NETWORK="${ERD_DOCKER_NETWORK:-}"
ERD_USE_DOCKER="${ERD_USE_DOCKER:-false}"

# 16.20.4 is the pinned release that provides the catalog API consumed by
# mermaid.py and matches the provenance of the repository's existing ERD.
SCHEMACRAWLER_IMAGE="${SCHEMACRAWLER_IMAGE:-schemacrawler/schemacrawler:v16.20.4}"
MERMAID_CLI_IMAGE="${MERMAID_CLI_IMAGE:-ghcr.io/mermaid-js/mermaid-cli/mermaid-cli:11.16.0}"

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/fleetbase-erd.XXXXXX")"
trap 'rm -rf "$TMP_DIR"' EXIT

schema_args=(
    --server mysql
    --host "$ERD_DB_HOST"
    --port "$ERD_DB_PORT"
    --database "$ERD_DB_NAME"
    --user "$ERD_DB_USER"
    --info-level standard
    --grep-tables "$ERD_SCHEMA_PATTERN"
    --no-info
)

if [[ -n "$ERD_DB_PASSWORD" ]]; then
    schema_args+=(--password "$ERD_DB_PASSWORD")
fi

run_with_docker() {
    command -v docker >/dev/null 2>&1 || {
        echo "docker is required when ERD_USE_DOCKER=true" >&2
        exit 1
    }

    local network_args=()
    if [[ -n "$ERD_DOCKER_NETWORK" ]]; then
        network_args=(--network "$ERD_DOCKER_NETWORK")
    fi

    local user_args=()
    if command -v id >/dev/null 2>&1; then
        user_args=(--user "$(id -u):$(id -g)")
    fi

    docker run --rm \
        "${network_args[@]}" \
        "${user_args[@]}" \
        --volume "$SCRIPT_DIR/mermaid.py:/home/schcrwlr/share/mermaid.py:ro" \
        --volume "$TMP_DIR:/home/schcrwlr/output" \
        "$SCHEMACRAWLER_IMAGE" \
        /opt/schemacrawler/bin/schemacrawler.sh \
        "${schema_args[@]}" \
        --command script \
        --script-language python \
        --script share/mermaid.py \
        --output-file output/database.mmd

    docker run --rm \
        "${network_args[@]}" \
        "${user_args[@]}" \
        --volume "$TMP_DIR:/home/schcrwlr/output" \
        "$SCHEMACRAWLER_IMAGE" \
        /opt/schemacrawler/bin/schemacrawler.sh \
        "${schema_args[@]}" \
        --command schema \
        --output-format svg \
        --output-file output/erd.svg

    docker run --rm \
        "${user_args[@]}" \
        --volume "$SCRIPT_DIR/mmdc.json:/data/mmdc.json:ro" \
        --volume "$TMP_DIR:/output" \
        "$MERMAID_CLI_IMAGE" \
        -i /output/database.mmd \
        -o /output/erd-dark.svg \
        -t dark \
        -b transparent \
        --configFile /data/mmdc.json
}

run_with_local_tools() {
    local schemacrawler_bin=""
    if command -v schemacrawler.sh >/dev/null 2>&1; then
        schemacrawler_bin="$(command -v schemacrawler.sh)"
    elif command -v schemacrawler >/dev/null 2>&1; then
        schemacrawler_bin="$(command -v schemacrawler)"
    else
        echo "schemacrawler or schemacrawler.sh is required (or set ERD_USE_DOCKER=true)" >&2
        exit 1
    fi

    command -v mmdc >/dev/null 2>&1 || {
        echo "mmdc is required (or set ERD_USE_DOCKER=true)" >&2
        exit 1
    }

    "$schemacrawler_bin" \
        "${schema_args[@]}" \
        --command script \
        --script-language python \
        --script "$SCRIPT_DIR/mermaid.py" \
        --output-file "$TMP_DIR/database.mmd"

    "$schemacrawler_bin" \
        "${schema_args[@]}" \
        --command schema \
        --output-format svg \
        --output-file "$TMP_DIR/erd.svg"

    mmdc \
        -i "$TMP_DIR/database.mmd" \
        -o "$TMP_DIR/erd-dark.svg" \
        -t dark \
        -b transparent \
        --configFile "$SCRIPT_DIR/mmdc.json"
}

validate_outputs() {
    grep -q '^erDiagram$' "$TMP_DIR/database.mmd"
    grep -Eq '^  [[:alnum:]_]+ \{$' "$TMP_DIR/database.mmd"
    grep -Fq '||--o{' "$TMP_DIR/database.mmd"

    if grep -Eiq '^  (information_schema|performance_schema|mysql|sys|[^[:space:]]+_sandbox)_' "$TMP_DIR/database.mmd"; then
        echo "Generated Mermaid contains a sandbox or system schema" >&2
        exit 1
    fi

    for svg in "$TMP_DIR/erd.svg" "$TMP_DIR/erd-dark.svg"; do
        [[ -s "$svg" ]] || {
            echo "Generated SVG is empty: $svg" >&2
            exit 1
        }
        grep -Eq '<svg([[:space:]>])' "$svg"
        if grep -Eiq 'generated on|generated_on' "$svg"; then
            echo "Generated SVG contains a non-deterministic timestamp: $svg" >&2
            exit 1
        fi
        if command -v xmllint >/dev/null 2>&1; then
            xmllint --noout "$svg"
        fi
    done
}

ERD_USE_DOCKER_NORMALIZED="$(printf '%s' "$ERD_USE_DOCKER" | tr '[:upper:]' '[:lower:]')"
case "$ERD_USE_DOCKER_NORMALIZED" in
    1|true|yes) run_with_docker ;;
    0|false|no) run_with_local_tools ;;
    *)
        echo "ERD_USE_DOCKER must be true or false" >&2
        exit 1
        ;;
esac

validate_outputs

install -m 0644 "$TMP_DIR/database.mmd" "$SCRIPT_DIR/database.mmd"
install -m 0644 "$TMP_DIR/erd.svg" "$SCRIPT_DIR/erd.svg"
install -m 0644 "$TMP_DIR/erd-dark.svg" "$SCRIPT_DIR/erd-dark.svg"

echo "Generated database.mmd, erd.svg, and erd-dark.svg"
