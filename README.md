# Encounter Worship registration

A reusable registration site for Encounter Worship programs. Attendees register from a public link or QR code without creating an account. Staff manage programs, review registrations, and export a list that excludes prayer requests.

This is the Phase 1 system. It is ready for local review. It is not ready for a public launch until the church confirms the items listed under [Before a real event](#before-a-real-event).

## What you need

- Node.js 20
- Docker, for the local PostgreSQL database

## Run it locally

```bash
cp .env.example .env.local
```

Set `SEED_ADMIN_PASSWORD` in `.env.local`. Quote the value if it contains `#`. The password used on this machine is stored only in that file. Do not commit it, and change it before any shared deployment.

```bash
npm install
npm run db:up
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

The site runs at [http://localhost:3210](http://localhost:3210). Staff sign in at [http://localhost:3210/admin/login](http://localhost:3210/admin/login).

When the server starts, it keeps the account in `SEED_ADMIN_EMAIL` active as a super administrator. That account can open every program, the registration lists, exports, prayer requests, staff, settings, and the audit log. `npm run db:seed` sets the password from `SEED_ADMIN_PASSWORD` again. Starting the server does not change a password that was already saved.

With `SEED_DEMO_EVENT=true`, the seed publishes The Encounter at `/events/the-encounter`. The public home page is that program’s landing page. Review the date, venue, and description before announcing it.

The local database user, database name, and password are all `encounter`, on port `54329`. That password is only for this local Docker database.

## Checks

```bash
npm test
npm run lint
```

`npm test` runs the domain checks and, when `DATABASE_URL` is set, the database checks for capacity, duplicate phone numbers, idempotency, closed registration, and the paused messaging path.

## Backup

See [docs/backup-restore.md](docs/backup-restore.md). `./scripts/backup.sh` writes a Postgres dump that includes banner images. Dumps contain personal data and are not committed.

## WhatsApp

WhatsApp is paused. The registration form, confirmation page, staff screens, and exports do not mention it, and a new registration does not queue a message. The sending code remains for when the church connects a provider. Set `WHATSAPP_SUSPENDED` to `false` in [src/lib/domain/constants.ts](file:///Users/slowburn/Desktop/Projects/the%20encounter/src/lib/domain/constants.ts) to bring it back.

## Access

| Role | What they can do |
| --- | --- |
| Super administrator | Programs, staff, settings, audit, exports, and prayer requests |
| Event administrator | Assigned programs, including export and corrections. Prayer only when granted |
| Registration officer | Assigned registration lists. Export, corrections, and prayer only when granted |
| Volunteer | A restricted list for assigned programs. No export, corrections, or prayer requests |

Permissions are checked on the server. Hiding a button is not the control.

Standard CSV and Excel exports never include prayer requests.

## Before a real event

The church still needs to confirm:

- Which of the eight fields are required, and the final option labels
- The privacy notice, retention period, and deletion process, including review against the Nigeria Data Protection Act 2023
- Messaging, which is paused until the church chooses a provider
- The public site address printed into QR codes
- Who may read prayer requests
- Hosting, encrypted backups, and a practiced restore

Multi-factor authentication for privileged staff is not included in this release. Passwords are stored with scrypt. Sessions last 12 hours.

Draft and archived programs are not public. Closing or cancelling a program keeps the public link working and shows that registration is unavailable.
