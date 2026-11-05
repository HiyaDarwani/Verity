# Backend architecture (as implemented)

## Runtime and structure

The backend is an isolated Express 5 + TypeScript application in `/server`. It uses Zod request schemas, Prisma 7 with the PostgreSQL driver adapter, bcrypt password hashing, HS256 JWT access tokens, Helmet, CORS, centralized errors, and express-rate-limit.

```text
server/
  prisma/schema.prisma
  prisma/migrations/0001_init/migration.sql
  src/
    app.ts                    # Express middleware, readiness and route mounts
    index.ts                  # Startup, expiry worker and shutdown
    config/env.ts             # Validated environment configuration
    db/prisma.ts              # Prisma PostgreSQL adapter
    middleware/               # auth, roles, validation, audit, rate limit, errors
    modules/{auth,users,exams,attempts,results,proctoring,activities}/
    jobs/attemptExpiry.ts
    scripts/provision-admin.ts
    scripts/reset-admin-password.ts
  tests/                      # Unit request checks and PostgreSQL integration tests
```

## Data relationships

- `User` has a unique email, role, active flag and timestamps. It owns exams, attempts, results, sessions, invitations and actor/evaluator references.
- `Exam` belongs to a creator and has ordered questions, attempts and results. Deleting exams with attempts is blocked; question deletion cascades only with an eligible exam and is separately blocked after attempts.
- `Question` stores MCQ options and a private JSON answer key, plus marks and unique exam/display order. Student DTOs never select or serialize answer keys.
- `Attempt` belongs to a student and exam, with server start/deadline, status and finalization status. `(studentId,examId)` is unique for the current single-attempt policy.
- `AttemptAnswer` is keyed by `(attemptId,questionId)`, saves JSON answers and optional evaluation data.
- `Result` has unique attempt and student/exam constraints. A composite foreign key ties its student and exam to that same attempt.
- `ProctoringEvent` belongs to an attempt and can be reviewed by a user. `ActivityLog` retains action/entity metadata and nullable actor.
- `AuthSession` stores token ID, user, expiry and revocation timestamp; deleting a user cascades sessions. `UserInvitation` stores a unique SHA-256 token hash, invite role, expiry/use timestamps and creator.

Indexes cover role/status lookup, exam availability and ownership, attempt status/deadlines, result publication, event timelines and activity lookup. Exam and user history is restricted from destructive deletion where integrity requires it; account changes use deactivation.

## Auth and security behavior

Tokens contain only `sub` and `jti`, are verified with the HS256 algorithm allow-list and expiry, then checked against an unrevoked, unexpired PostgreSQL session and current active user. Logout revokes that session. Deactivation revokes all active sessions for the user. This gives immediate server-side revocation but requires one database read on each authenticated request. There is no refresh token: the frontend keeps the access token in per-tab `sessionStorage`, restores the profile through `/auth/me`, and requires sign-in after expiry or revocation.

Self-registration assigns Student regardless of supplied fields. Admins invite staff or users through a random one-time token; only its SHA-256 hash is stored. The first Admin is provisioned by a guarded one-time CLI script, which requires the Admin name/email/password through environment variables and refuses once any Admin exists. Login, registration and invite acceptance have a per-process IP rate limit.

## Attempt lifecycle

The server creates start and deadline times and caps the deadline at the exam's availability end. Answer save and final submission lock the attempt row. Final submission saves valid timely answers, fills unanswered questions as blank, calculates MCQ marks from server keys, creates one result and finalizes attempt status in a database transaction. Subjective marks remain pending until an owner examiner or Admin grades them. Repeated submission returns the existing result. The periodic worker finalizes expired attempts using only answers already saved.

The activity middleware records successful authenticated mutations after response completion. That is deliberately best-effort and is not atomic with the original write; production audit guarantees require transactional service-level hooks or an outbox.

## Frontend connection

Frontend services call `/api` via a shared client that unwraps `{success,data}` and adds the per-tab bearer credential. Vite proxies `/api` to the local backend during development; production can use a same-origin reverse proxy or `VITE_API_BASE_URL`. Roles map between database enums and existing title-case frontend values. Exam/question identifiers remain stable UUIDs. Attempts accept index-keyed answers to match the existing exam-taking screen. User creation calls the invitation endpoint and displays a setup link/token; invitation acceptance is implemented. Results have summary and detail endpoints, and evaluation uses a scoped grade patch. Students only receive published results, and answer keys are omitted from all result responses.

## Operations and verification limits

`DATABASE_URL` configures the Prisma PostgreSQL adapter at runtime; `TEST_DATABASE_URL` is only for a disposable PostgreSQL database whose name contains `test`. With Neon CLI, the project-root `.env.local` is loaded by both the server and Prisma config: runtime uses pooled `DATABASE_URL`, while migrations prefer direct `DATABASE_URL_UNPOOLED`. The server-local `.env` remains a fallback for local development. Apply migrations with `npm run db:migrate` (development) or `npm run db:deploy` (deployment), after checking the target branch's migration status. `/api/health` checks process liveness; `/api/health/ready` verifies a database query.

Verification on 2026-11-05 applied both migrations and ran all 9 PostgreSQL integration tests on a newly initialized, disposable PostgreSQL 18 cluster, which was stopped and removed afterward. The configured local development database still does not respond on `localhost:5432` and was not modified. Frontend visual inspection covered the public landing and sign-in screens; no authenticated browser end-to-end workflow was run. The integration suite skips unless `TEST_DATABASE_URL` is set to a disposable database. The concurrent submission test currently emits a `pg` query-queue deprecation warning; its integrity assertions pass.
