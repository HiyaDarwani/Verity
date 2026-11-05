# Verity Phase 1 Audit

## Scope and repository state
- Existing React 19, TypeScript 7, Vite 8, Tailwind CSS 4, React Router 7, Vitest 5, and Oxlint project; package scripts provide `lint`, `test`, and `build`.
- Source contains 14 routed screens: landing/login; five student; five examiner; two administrator screens. `original-demo.html` is a separate preserved prototype.
- Existing docs are README.md only. It describes a mock-backed implementation and is stale relative to source: source services already call `/api`, while README claims browser persistence/seeds and old synchronous CRUD.

## Data and authentication findings
- Seed modules: `src/data/mockUsers.ts`, `mockExams.ts`, `mockResults.ts`, `mockProctoringEvents.ts`. They provide seeded accounts/entities and need removal; source search indicates the current API services do not import them.
- Current login UI includes a selectable role and demo banner; `authService` calls `/auth/login`, but persists token and user in localStorage. Prior `authAndGuards.test.ts` targets a removed `demoLogin` API and cannot describe current behavior.
- `examService`, `userService`, `resultService`, `proctoringService`, and `activityService` call the centralized API client. `attemptService` is the exception: it stores answers, question position, and deadline in sessionStorage, while also exposing start/submit endpoints.
- `storageService` is used by auth and attempts. No direct page/component localStorage access found. Current entities are in React context memory after service calls.
- `AppContext` invokes entity services, but a single global loading/error state is shared across all requests. `getById` methods swallow every error and return null, obscuring unavailable data as not-found.
- `ExamTaking` calculates score client-side, writes a result through `resultService`, suppresses submission failures, and still navigates to success. This is fake authoritative result behavior and bypasses the attempt submit API.
- Admin activity errors are swallowed and shown as an empty log. `ExamInstructions`/`ExamTaking` derive attempt completion from result lists; examiner dashboard/statistics and empty/error state coverage need review.

## Tests and coverage
- Existing suites: timer calculations, scoring logic, storage utilities, exam/user/result/proctoring CRUD, and authentication/role transitions.
- Several tests are stale and assert synchronous local-storage CRUD/demo login that no longer matches API services. Test coverage does not currently exercise API request contracts or current async boundaries.
- No test run performed before edits; requested verification will run after refactor.

## Planned phase boundary
Retain screens and the existing service/API seam; remove seeds, client-persisted app/session records, selectable demo roles, and local score/result success behavior. Keep purely presentational timer and scoring utilities where they serve review/display logic, while exam submission authority moves to the attempt API. Add clear loading/empty/error states and rewrite tests around service/API contracts. No backend implementation is in scope.

## Phase 2 revalidation (2026-11-03)

The findings above describe the pre-Phase-1 codebase and are retained as historical audit notes. Rechecking the live repository before Phase 2 confirmed that the Phase-1 changes removed the seed modules and browser storage service; authentication and attempt progress are memory/API based; and the frontend has REST services for auth, users, exams/questions, attempts, results, proctoring, and activity. The 14 routed screens remain present. Current backend/frontend contract gaps and the Phase-2 scope are documented in `server/API.md` and `server/ARCHITECTURE.md`.

## System completion revalidation (2026-11-05)

- The original 14 routed screens remain in the application; `original-demo.html` was left untouched. Four additional screens support student registration, invitation acceptance, attempt monitoring, and activity review.
- Production UI flows use the shared API client and domain services. No seeded users, exams, questions, scores, or proctoring records are present in the application workflow. Fixtures are confined to tests.
- The frontend stores only its access token per tab in `sessionStorage`; user identity is verified through `/auth/me`. Application records remain API-backed and are not browser-persisted.
- Added scoped result details, subjective grading and feedback, student result detail access after publication, examiner/admin activity views, admin-wide exam/attempt/result/proctoring routes, and an explicit local `/api` Vite proxy.
- Added scheduled exam visibility and availability windows, examiner/admin activation controls, and server-enforced start/end availability checks.
- A temporary isolated PostgreSQL 18 test cluster was used for migration and API integration verification. Both migrations applied successfully. The existing development database was not started, migrated, reset, or modified. The configured local `verity` database is not currently listening on port 5432; the temporary test cluster has been stopped and removed, and the test port is no longer listening.
- Verification: frontend lint passed; 18 frontend tests passed; frontend production build passed. Backend lint and build passed; 4 backend unit tests and 9 PostgreSQL integration tests passed against the disposable database. Integration exercised registration/login, invitation, exam/question APIs, scheduled exam visibility and early-start rejection, answer persistence/resume, ownership, deadlines, proctoring storage, atomic/idempotent MCQ submission, subjective grading/publication, and session revocation on deactivation. The parallel submission test emitted a Node `pg` query-queue deprecation warning; assertions passed.
- Remaining operational limits: the local development database must be started/configured by the operator; the browser UI was not exercised as a full end-to-end run; invitation delivery is manual (the Admin shares its one-time setup link); there is no refresh-token flow; rate limiting uses an in-memory per-process store; and activity logging is best-effort rather than an outbox-backed compliance audit.
