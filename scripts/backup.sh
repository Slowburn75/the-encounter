#!/usr/bin/env bash
# Writes a custom-format Postgres dump, including banner images stored in the database.
# The dump contains personal data. Keep it outside git and encrypt it before it leaves this machine.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$root/backups"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
dest="$root/backups/encounter-${stamp}.dump"

docker exec encounter-postgres pg_dump -U encounter -d encounter --format=custom --file=/tmp/encounter.dump
docker cp encounter-postgres:/tmp/encounter.dump "$dest"
docker exec encounter-postgres rm -f /tmp/encounter.dump
echo "Wrote $dest"
