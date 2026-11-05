# Verity frontend and API foundation

The React 19, TypeScript, Vite, Tailwind CSS v4, React Router 7 frontend preserves all original 14 routed screens and the unchanged `original-demo.html` prototype. Registration, invitation acceptance, attempt monitoring, and activity review add supporting screens. See `server/API.md` for current REST contracts and `server/ARCHITECTURE.md` for the backend design and relationship notes.

## Frontend

```sh
npm install
npm run dev
npm run lint
npm test
npm run build
```

Run the API in a second terminal with `cd server; npm install; npm run dev`. Vite proxies `/api` to `http://localhost:3000` by default; set `VITE_API_PROXY_TARGET` to change the development target. In production, set `VITE_API_BASE_URL` to the API URL or route `/api` through the same-origin reverse proxy.

The frontend talks to `/api` by default. Set `VITE_API_BASE_URL` to change it. Only the short-lived access token is persisted in per-tab `sessionStorage`; profile and application records are reloaded from the API and are never browser-persisted. A revoked or expired session is cleared and requires sign-in again.

## Backend setup

The backend is isolated in `server/` and requires Node.js, PostgreSQL, and the packages in `server/package.json`.

```sh
cd server
npm install
Copy-Item .env.example .env
# Edit DATABASE_URL and generate a random JWT_SECRET of at least 32 characters.
npm run db:generate
npm run db:migrate
npm run dev
```

For production, configure environment variables through the deployment environment and run `npm run db:deploy` before `npm start`. Never commit `.env` files. Public registration creates Student accounts only; Admins can invite other users, and the first Admin is provisioned by a guarded CLI command. No fake user or exam records are seeded.

### Local PostgreSQL database

Install PostgreSQL locally using the official installer or your organizationâ€™s approved package source, and ensure its service is running on port 5432. In PowerShell, connect as the local PostgreSQL administrator and create a development role/database (the `\password` prompt avoids putting a password in shell history):

```powershell
psql -U postgres
CREATE ROLE verity_dev LOGIN;
\password verity_dev
CREATE DATABASE verity OWNER verity_dev;
CREATE DATABASE verity_test OWNER verity_dev;
\q
```

Use a distinct disposable test database. Copy `server/.env.example` to `server/.env` (never commit it), then set `DATABASE_URL` to `postgresql://localhost:5432/verity?schema=public`; keep the password private. For a one-off test shell, set `$env:TEST_DATABASE_URL` and `$env:DATABASE_URL` to the `verity_test` URL without storing credentials in a file. Apply development migrations with `npm run db:migrate`; apply them to the disposable test database with `npm run db:deploy`. Use `npm run db:generate` after schema changes.

Verify the database is reachable by running `npx prisma migrate status` from `server/`, then start the API and request `http://localhost:3000/api/health/ready`. A ready response means Prisma successfully executed a database query; `/api/health` alone only checks that the process responds. Provision the first administrator from `server/` with `ADMIN_NAME`, `ADMIN_EMAIL`, and a unique `ADMIN_PASSWORD` of at least 14 characters set only in the current shell, then run `npm run admin:provision`. For PowerShell, you can enter these without echoing the password:

```powershell
$env:ADMIN_NAME = Read-Host "Administrator name"
$env:ADMIN_EMAIL = Read-Host "Administrator email"
$secureAdminPassword = Read-Host "Administrator password (14+ characters)" -AsSecureString
$env:ADMIN_PASSWORD = [System.Net.NetworkCredential]::new('', $secureAdminPassword).Password
npm run admin:provision
Remove-Item Env:ADMIN_NAME, Env:ADMIN_EMAIL, Env:ADMIN_PASSWORD
Remove-Variable secureAdminPassword
```

The script refuses to create another bootstrap Admin once one exists. Invite subsequent users with the Admin interface/API.

For a deliberate admin password reset, set `ADMIN_EMAIL` and `NEW_ADMIN_PASSWORD` in the current shell and run `npm run admin:reset-password` from `server/`. The script requires an explicit existing Admin email and revokes that account's active sessions after updating its password. Do not use this against a production database without following the production change process.

## Backend tests

```sh
cd server
npm test
$env:TEST_DATABASE_URL="postgresql://.../verity_test?schema=public"
$env:DATABASE_URL=$env:TEST_DATABASE_URL
npm run db:deploy
npm run test:integration
```

Unit tests cover registration/login validation and role authorization using Prisma spies. PostgreSQL integration tests are skipped unless `TEST_DATABASE_URL` is set and cover authentication, invitations, safe exam/question DTOs, attempt ownership, answer persistence, expiry, atomic/idempotent submission, MCQ evaluation, subjective grading/publication, and proctoring storage. Use only a disposable test database: fixtures create and delete records there. Run `npm run lint`, `npm test`, and `npm run build` in both root and `server/`.
