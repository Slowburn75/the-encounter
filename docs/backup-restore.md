# Backup and restore

Registration records and event banners live in PostgreSQL. Banner images are stored in the database, so a database dump includes them. Do not rely on files written to the application disk.

Backups contain names, phone numbers, and prayer requests. Store them where only authorised church staff can reach them, and encrypt a copy before it leaves the machine that runs the database.

## Create a backup

From the project directory, with the `encounter-postgres` container running:

```bash
./scripts/backup.sh
```

The script writes `backups/encounter-YYYYMMDDTHHMMSSZ.dump`. That directory is ignored by git.

The same dump can be taken without the script:

```bash
docker exec encounter-postgres pg_dump -U encounter -d encounter --format=custom --file=/tmp/encounter.dump
docker cp encounter-postgres:/tmp/encounter.dump ./encounter.dump
docker exec encounter-postgres rm -f /tmp/encounter.dump
```

## Restore

Restoring replaces the data in the target database. Stop the website first so new registrations are not written during the restore.

```bash
docker cp ./encounter.dump encounter-postgres:/tmp/encounter.dump
docker exec encounter-postgres pg_restore -U encounter -d encounter --clean --if-exists --no-owner /tmp/encounter.dump
docker exec encounter-postgres rm -f /tmp/encounter.dump
```

Then sign in and confirm that a known event, its public page, and a known registration reference are present. Confirm a banner image still loads.

## What this does not cover

- WhatsApp credentials belong in the server environment, not in the database dump.
- The local Docker volume password is for this machine only. A hosted database needs its own credentials and its own encrypted backup schedule.
- Practice a restore before the first public event. A dump that has never been restored is not a recovery plan.
