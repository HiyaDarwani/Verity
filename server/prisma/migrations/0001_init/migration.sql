-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'EXAMINER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ExamStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MCQ', 'SUBJECTIVE');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'TIMED_OUT');

-- CreateEnum
CREATE TYPE "FinalizationStatus" AS ENUM ('PENDING', 'FINALIZED');

-- CreateEnum
CREATE TYPE "EvaluationStatus" AS ENUM ('PENDING_REVIEW', 'FINALIZED');

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('UNPUBLISHED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "EventReviewStatus" AS ENUM ('OPEN', 'REVIEWED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exams" (
    "id" UUID NOT NULL,
    "title" VARCHAR(240) NOT NULL,
    "subject" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "instructions" TEXT,
    "duration_minutes" INTEGER NOT NULL,
    "available_from" TIMESTAMP(3),
    "available_until" TIMESTAMP(3),
    "status" "ExamStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" UUID NOT NULL,
    "exam_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "marks" DECIMAL(8,2) NOT NULL,
    "display_order" INTEGER NOT NULL,
    "options" JSONB,
    "correct_answer" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempts" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "exam_id" UUID NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadline_at" TIMESTAMP(3) NOT NULL,
    "submitted_at" TIMESTAMP(3),
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "finalization_status" "FinalizationStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempt_answers" (
    "attempt_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "answer" JSONB NOT NULL,
    "saved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "awarded_marks" DECIMAL(8,2),
    "feedback" TEXT,
    "evaluated_by_id" UUID,
    "evaluated_at" TIMESTAMP(3),

    CONSTRAINT "attempt_answers_pkey" PRIMARY KEY ("attempt_id","question_id")
);

-- CreateTable
CREATE TABLE "results" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "exam_id" UUID NOT NULL,
    "attempt_id" UUID NOT NULL,
    "obtained_marks" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "maximum_marks" DECIMAL(8,2) NOT NULL,
    "evaluation_status" "EvaluationStatus" NOT NULL DEFAULT 'FINALIZED',
    "publication_status" "PublicationStatus" NOT NULL DEFAULT 'UNPUBLISHED',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proctoring_events" (
    "id" UUID NOT NULL,
    "attempt_id" UUID NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "metadata" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "review_status" "EventReviewStatus" NOT NULL DEFAULT 'OPEN',
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMP(3),

    CONSTRAINT "proctoring_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "action" VARCHAR(120) NOT NULL,
    "entity_type" VARCHAR(80) NOT NULL,
    "entity_id" VARCHAR(120),
    "metadata" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_active_idx" ON "users"("role", "active");

-- CreateIndex
CREATE INDEX "exams_status_available_from_available_until_idx" ON "exams"("status", "available_from", "available_until");

-- CreateIndex
CREATE INDEX "exams_created_by_id_updated_at_idx" ON "exams"("created_by_id", "updated_at");

-- CreateIndex
CREATE INDEX "questions_exam_id_display_order_idx" ON "questions"("exam_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "questions_exam_id_display_order_key" ON "questions"("exam_id", "display_order");

-- CreateIndex
CREATE INDEX "attempts_exam_id_status_idx" ON "attempts"("exam_id", "status");

-- CreateIndex
CREATE INDEX "attempts_student_id_started_at_idx" ON "attempts"("student_id", "started_at");

-- CreateIndex
CREATE INDEX "attempts_status_deadline_at_idx" ON "attempts"("status", "deadline_at");

-- CreateIndex
CREATE UNIQUE INDEX "attempts_student_id_exam_id_key" ON "attempts"("student_id", "exam_id");

-- CreateIndex
CREATE INDEX "attempt_answers_question_id_idx" ON "attempt_answers"("question_id");

-- CreateIndex
CREATE INDEX "attempt_answers_evaluated_by_id_idx" ON "attempt_answers"("evaluated_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "results_attempt_id_key" ON "results"("attempt_id");

-- CreateIndex
CREATE INDEX "results_exam_id_publication_status_created_at_idx" ON "results"("exam_id", "publication_status", "created_at");

-- CreateIndex
CREATE INDEX "results_student_id_publication_status_created_at_idx" ON "results"("student_id", "publication_status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "results_student_id_exam_id_key" ON "results"("student_id", "exam_id");

-- CreateIndex
CREATE INDEX "proctoring_events_attempt_id_occurred_at_idx" ON "proctoring_events"("attempt_id", "occurred_at");

-- CreateIndex
CREATE INDEX "proctoring_events_review_status_occurred_at_idx" ON "proctoring_events"("review_status", "occurred_at");

-- CreateIndex
CREATE INDEX "activity_logs_occurred_at_idx" ON "activity_logs"("occurred_at");

-- CreateIndex
CREATE INDEX "activity_logs_actor_id_occurred_at_idx" ON "activity_logs"("actor_id", "occurred_at");

-- CreateIndex
CREATE INDEX "activity_logs_entity_type_entity_id_idx" ON "activity_logs"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_answers" ADD CONSTRAINT "attempt_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_answers" ADD CONSTRAINT "attempt_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_answers" ADD CONSTRAINT "attempt_answers_evaluated_by_id_fkey" FOREIGN KEY ("evaluated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proctoring_events" ADD CONSTRAINT "proctoring_events_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proctoring_events" ADD CONSTRAINT "proctoring_events_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
