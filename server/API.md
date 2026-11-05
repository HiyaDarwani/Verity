# Verity REST API

Base path: `/api`. Successful JSON responses use `{ success: true, data }`; failures use a stable error code and generic message. Protected endpoints require `Authorization: Bearer <access-token>`. Database roles are authoritative; request roles are ignored.

## Health

| Method | Path | Access | Behaviour |
|---|---|---|---|
| GET | `/health` | Public | Process liveness only; does not check PostgreSQL |
| GET | `/health/ready` | Public | Runs `SELECT 1`; responds 503 with `DATABASE_UNAVAILABLE` if PostgreSQL is not ready |

## Authentication and invitations

| Method | Path | Access | Contract |
|---|---|---|---|
| POST | `/auth/register` | Public, rate limited | `{name,email,password}`; creates Student only, returns access token and safe user |
| POST | `/auth/login` | Public, rate limited | `{email,password}`; role and active state loaded from DB |
| POST | `/auth/logout` | Authenticated | Revokes the current database session; client clears its per-tab access token |
| POST | `/users/invitations` | Admin, authenticated | `{name,email,role}`; creates a 48-hour invite and returns its one-time token |
| POST | `/auth/accept-invitation` | Public, rate limited | `{token,password}`; consumes invite once, creates invited role and signs in |

Public registration cannot create Examiner or Admin users. Bootstrap the first Admin with `npm run admin:provision` (instructions in root README). There is no refresh token: access tokens expire (default one hour), sessions are revocable in PostgreSQL, and a user signs in again after expiry. Expired sessions can be purged operationally; no refresh endpoint is implemented.

All `/api` routes are limited to 300 requests per minute per process/IP; login, registration and invitation acceptance also have a 10 requests per 15 minutes limit. The default express-rate-limit memory store is suitable for a single development instance; multi-instance deployments need a shared store.

## Resource API

| Method | Path | Access | Contract |
|---|---|---|---|
| GET | `/users`, `/users/:id` | Admin | Safe fields only; never returns password hashes |
| PUT | `/users/:id` | Admin | Partial `{name,email,role}` |
| PATCH | `/users/:id/status` | Admin | `{active:boolean}`; deactivation revokes active sessions and subsequent requests reject the account |
| GET | `/exams`, `/exams/:id` | Authenticated | Students see scheduled/active exams until their end window, including future start times, without answer keys; scheduled exams become startable at `availableFrom`; examiners see their own and admins see all |
| POST | `/exams` | Examiner/Admin | Exam metadata; creator comes from authenticated principal |
| PUT/DELETE | `/exams/:id` | Examiner/Admin | Ownership enforced; content locked after attempts; delete blocked after attempts |
| POST | `/exams/:id/questions` | Examiner/Admin | `{question:{type,text,marks,options?,correctOption?}}` |
| PUT/DELETE | `/exams/:id/questions/:questionId` | Examiner/Admin | Stable question ID; ownership and post-attempt lock enforced |
| POST | `/attempts/start` | Student | `{examId}`; server enforces the exam's availability window, creates or resumes the unique attempt, and returns its server-owned timestamps |
| GET | `/attempts/summary` | Examiner/Admin | Exact total and in-progress attempt counts across all exams for admins or the examiner's own exams; `{count,liveCount}` |
| GET | `/attempts` | Examiner/Admin | Latest 500 attempt summaries; examiner scoped to own exams |
| PUT | `/attempts/:id/progress` | Owning Student | `{questionIndex?,answers:{[index]:number|string}}`; saves only while open and before deadline |
| POST | `/attempts/:id/submit` | Owning Student | `{answers}`; transactional finalization, MCQ scoring and stable repeat response |
| GET | `/results?examId=...` | Student/Examiner/Admin | Students see their own published results; examiner limited to authored exams; admin all |
| GET | `/results/:id` | Student/Examiner/Admin | Returns question answers/marks/feedback only to the owning student after publication, the owning examiner, or an admin; never returns answer keys |
| PATCH | `/results/:id/evaluation` | Owning Examiner/Admin | `{grades:[{questionId,marks,feedback?}]}`; subjective results publish after all are graded |
| GET | `/proctoring-events` | Examiner/Admin | Examiner limited to owned exams |
| PATCH | `/proctoring-events/:id` | Owning Examiner/Admin | `{reviewStatus:"Open"|"Reviewed"}` |
| POST | `/proctoring-events/attempt/:attemptId` | Owning Student | `{type,metadata?}`; attempt ownership and open deadline required |
| GET | `/activities` | Admin/Examiner | Admin sees latest 100 platform rows; examiner sees latest 100 actions performed by that examiner |

## Persistence and integrity

- Prisma/PostgreSQL use UUID IDs and foreign keys. Attempts are unique per student/exam in the current one-attempt policy. Result foreign keys constrain its student, exam, and attempt to the same attempt tuple.
- MCQ keys are private server data and only included in examiner/admin exam-management views. Student exam reads and all result responses omit keys.
- Submission locks the attempt row and persists answers, MCQ marks, attempt finalization, and one result in a database transaction. Repeated submission returns the existing result. Late submission ignores new request answers and finalizes saved answers as timed out.
- A process worker sweeps due in-progress attempts every 15 seconds. It is process-local and safe to run redundantly in basic cases, but production should move it to a dedicated worker/queue with monitoring.
- Successful mutations receive an activity log hook. The current response-finish hook writes best-effort asynchronously; an outage between response and log write may lose an audit event, so it is not a compliance-grade audit trail yet.

## Frontend contract notes

Frontend user creation calls the invitation endpoint and shows a one-time setup link/token to an Admin. The acceptance screen calls the public token-claim endpoint. Students receive their identity-scoped published results and can request result details and feedback. Examiner/admin result screens request answer details and submit subjective grades through the results service. The short-lived access token is held in `sessionStorage` for the current tab; user profile and application records are reloaded through the API. The public landing and sign-in screens were visually inspected in a browser; no authenticated browser-driven end-to-end workflow was run because the configured local PostgreSQL database is not listening on localhost. API integration workflows were verified separately against a disposable PostgreSQL test cluster.
