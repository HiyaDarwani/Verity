import { AttemptStatus, EvaluationStatus, FinalizationStatus, Prisma, PublicationStatus, QuestionType } from '../../generated/prisma/client.js';
import { prisma } from '../../db/prisma.js';
import { HttpError } from '../../shared/errors.js';

export async function finalizeAttempt(attemptId: string, ownerId: string | null, submittedAnswers?: Record<string, string | number>) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "attempts" WHERE id = ${attemptId}::uuid FOR UPDATE`);
    const attempt = await tx.attempt.findUnique({ where: { id: attemptId }, include: { exam: { include: { questions: { orderBy: { displayOrder: 'asc' } } } }, answers: true, result: true } });
    if (!attempt || (ownerId !== null && attempt.studentId !== ownerId)) throw new HttpError(404, 'ATTEMPT_NOT_FOUND', 'Attempt not found');
    if (attempt.result && attempt.finalizationStatus === FinalizationStatus.FINALIZED) return attempt.result;
    const isLate = attempt.status === AttemptStatus.TIMED_OUT || Date.now() >= attempt.deadlineAt.getTime();
    if (!isLate && attempt.status === AttemptStatus.IN_PROGRESS && submittedAnswers) await saveAnswers(tx, attempt.id, attempt.exam.questions, submittedAnswers);
    const answers = await tx.attemptAnswer.findMany({ where: { attemptId: attempt.id } });
    let mcqMarks = new Prisma.Decimal(0);
    let maxMarks = new Prisma.Decimal(0);
    let hasSubjective = false;
    const answerByQuestion = new Map(answers.map((answer) => [answer.questionId, answer]));
    for (const question of attempt.exam.questions) {
      maxMarks = maxMarks.add(question.marks);
      if (!answerByQuestion.has(question.id)) await tx.attemptAnswer.create({ data: { attemptId: attempt.id, questionId: question.id, answer: Prisma.JsonNull, ...(question.type === QuestionType.MCQ ? { awardedMarks: new Prisma.Decimal(0) } : {}) } });
      if (question.type === QuestionType.MCQ) {
        const answer = answerByQuestion.get(question.id)?.answer;
        const correct = typeof answer === 'number' && answer === question.correctAnswer;
        if (correct) mcqMarks = mcqMarks.add(question.marks);
        await tx.attemptAnswer.updateMany({ where: { attemptId: attempt.id, questionId: question.id }, data: { awardedMarks: correct ? question.marks : new Prisma.Decimal(0) } });
      } else hasSubjective = true;
    }
    await tx.attempt.update({ where: { id: attempt.id }, data: { status: isLate ? AttemptStatus.TIMED_OUT : AttemptStatus.SUBMITTED, submittedAt: new Date(), finalizationStatus: FinalizationStatus.FINALIZED } });
    return tx.result.upsert({ where: { attemptId: attempt.id }, create: { studentId: attempt.studentId, examId: attempt.examId, attemptId: attempt.id, obtainedMarks: mcqMarks, maximumMarks: maxMarks, evaluationStatus: hasSubjective ? EvaluationStatus.PENDING_REVIEW : EvaluationStatus.FINALIZED, publicationStatus: hasSubjective ? PublicationStatus.UNPUBLISHED : PublicationStatus.PUBLISHED, publishedAt: hasSubjective ? null : new Date() }, update: {} });
  });
}

export async function saveAnswers(tx: Prisma.TransactionClient, attemptId: string, questions: Array<{ id: string; type: QuestionType; options: Prisma.JsonValue | null }>, answers: Record<string, string | number>) {
  for (const [indexText, value] of Object.entries(answers)) {
    const index = Number(indexText);
    if (!Number.isInteger(index) || index < 0 || index >= questions.length) throw new HttpError(400, 'INVALID_ANSWER', 'Answer references an unknown question');
    const question = questions[index]!;
    if (question.type === QuestionType.MCQ && (typeof value !== 'number' || !Array.isArray(question.options) || value >= question.options.length)) throw new HttpError(400, 'INVALID_ANSWER', 'MCQ answer is invalid');
    if (question.type === QuestionType.SUBJECTIVE && typeof value !== 'string') throw new HttpError(400, 'INVALID_ANSWER', 'Written answer must be text');
    await tx.attemptAnswer.upsert({ where: { attemptId_questionId: { attemptId, questionId: question.id } }, create: { attemptId, questionId: question.id, answer: value }, update: { answer: value, savedAt: new Date() } });
  }
}
