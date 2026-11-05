import { Router } from 'express';
import { EvaluationStatus, Prisma, PublicationStatus, QuestionType, UserRole } from '../../generated/prisma/client.js';
import { prisma } from '../../db/prisma.js';
import { authenticate, allowRoles } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { evaluationSchema } from '../schemas.js';
import { HttpError, requireUuid } from '../../shared/errors.js';
import { auditSuccessfulMutation } from '../../middleware/audit.js';

export const resultRouter = Router();
resultRouter.use(authenticate, auditSuccessfulMutation);

const resultInclude = {
  student: { select: { name: true } },
  exam: { include: { questions: { orderBy: { displayOrder: 'asc' as const } } } },
  attempt: { include: { answers: true } },
};

function resultDto(result: any) {
  const questionById = new Map<string, any>(result.exam.questions.map((question: any) => [question.id, question]));
  const mcqQuestions = result.exam.questions.filter((question: any) => question.type === QuestionType.MCQ);
  const mcqMarksTotal = mcqQuestions.reduce((sum: number, question: any) => sum + Number(question.marks), 0);
  const mcqMarksObtained = result.attempt.answers.reduce((sum: number, answer: any) => {
    return questionById.get(answer.questionId)?.type === QuestionType.MCQ
      ? sum + Number(answer.awardedMarks ?? 0)
      : sum;
  }, 0);
  const pending = result.evaluationStatus === EvaluationStatus.PENDING_REVIEW;

  return {
    id: result.id,
    attemptId: result.attemptId,
    studentName: result.student.name,
    examId: result.examId,
    status: pending ? 'Pending review' : 'Graded',
    score: pending
      ? `${mcqMarksObtained}/${mcqMarksTotal} MCQ (Pending review)`
      : `${Number(result.obtainedMarks)}/${Number(result.maximumMarks)}`,
    mcqMarksObtained,
    mcqMarksTotal,
    totalExamMarks: Number(result.maximumMarks),
    hasSubjective: pending,
  };
}

function answerValue(value: unknown): string | number | null {
  return typeof value === 'string' || typeof value === 'number' ? value : null;
}

resultRouter.get('/', async (req, res) => {
  const examId = typeof req.query.examId === 'string' ? req.query.examId : undefined;
  const results = await prisma.result.findMany({
    where: {
      ...(examId ? { examId } : {}),
      ...(req.user!.role === UserRole.STUDENT
        ? { studentId: req.user!.id, publicationStatus: PublicationStatus.PUBLISHED }
        : req.user!.role === UserRole.EXAMINER
          ? { exam: { createdById: req.user!.id } }
          : {}),
    },
    include: resultInclude,
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: results.map(resultDto) });
});

resultRouter.get('/:id', async (req, res) => {
  const result = await prisma.result.findUnique({ where: { id: requireUuid(req.params.id) }, include: resultInclude });
  if (!result) throw new HttpError(404, 'NOT_FOUND', 'Result not found');

  if (req.user!.role === UserRole.STUDENT) {
    if (result.studentId !== req.user!.id || result.publicationStatus !== PublicationStatus.PUBLISHED) {
      throw new HttpError(404, 'NOT_FOUND', 'Result not found');
    }
  } else if (req.user!.role === UserRole.EXAMINER && result.exam.createdById !== req.user!.id) {
    throw new HttpError(403, 'FORBIDDEN', 'You do not own this examination');
  }

  const answerByQuestion = new Map(result.attempt.answers.map((answer) => [answer.questionId, answer]));
  const questions = result.exam.questions.map((question, index) => {
    const answer = answerByQuestion.get(question.id);
    const options = Array.isArray(question.options)
      ? question.options.filter((option): option is string => typeof option === 'string')
      : undefined;
    return {
      questionId: question.id,
      number: index + 1,
      type: question.type === QuestionType.MCQ ? 'mcq' : 'sub',
      text: question.text,
      marks: Number(question.marks),
      ...(question.type === QuestionType.MCQ ? { options: options ?? [] } : {}),
      answer: answerValue(answer?.answer),
      awardedMarks: answer?.awardedMarks === null || answer?.awardedMarks === undefined ? null : Number(answer.awardedMarks),
      feedback: answer?.feedback ?? null,
    };
  });

  // Correct-answer keys are intentionally never part of result responses.
  res.json({ success: true, data: { ...resultDto(result), questions } });
});

resultRouter.patch('/:id/evaluation', allowRoles(UserRole.EXAMINER, UserRole.ADMIN), validateBody(evaluationSchema), async (req, res) => {
  const resultId = requireUuid(req.params.id);
  const updated = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "results" WHERE id = ${resultId}::uuid FOR UPDATE`);
    const result = await tx.result.findUnique({
      where: { id: resultId },
      include: { exam: { include: { questions: true } }, attempt: { include: { answers: true } } },
    });
    if (!result) throw new HttpError(404, 'NOT_FOUND', 'Result not found');
    if (req.user!.role === UserRole.EXAMINER && result.exam.createdById !== req.user!.id) {
      throw new HttpError(403, 'FORBIDDEN', 'You do not own this examination');
    }

    for (const grade of req.body.grades) {
      const question = result.exam.questions.find((item) => item.id === grade.questionId);
      if (!question || question.type !== QuestionType.SUBJECTIVE || grade.marks > Number(question.marks)) {
        throw new HttpError(400, 'INVALID_GRADE', 'Grade is invalid for the selected question');
      }
      const answer = result.attempt.answers.find((item) => item.questionId === question.id);
      if (!answer) throw new HttpError(409, 'ANSWER_NOT_FOUND', 'Submitted answer is unavailable for evaluation');
      await tx.attemptAnswer.update({
        where: { attemptId_questionId: { attemptId: result.attemptId, questionId: question.id } },
        data: { awardedMarks: grade.marks, feedback: grade.feedback, evaluatedById: req.user!.id, evaluatedAt: new Date() },
      });
    }

    const answers = await tx.attemptAnswer.findMany({ where: { attemptId: result.attemptId } });
    const subjectiveQuestions = result.exam.questions.filter((question) => question.type === QuestionType.SUBJECTIVE);
    const complete = subjectiveQuestions.every((question) => answers.some((answer) => answer.questionId === question.id && answer.awardedMarks !== null));
    const obtained = answers.reduce((sum, answer) => sum + Number(answer.awardedMarks ?? 0), 0);
    return tx.result.update({
      where: { id: result.id },
      data: {
        obtainedMarks: obtained,
        evaluationStatus: complete ? EvaluationStatus.FINALIZED : EvaluationStatus.PENDING_REVIEW,
        publicationStatus: complete ? PublicationStatus.PUBLISHED : PublicationStatus.UNPUBLISHED,
        publishedAt: complete ? new Date() : null,
      },
      include: resultInclude,
    });
  });
  res.json({ success: true, data: resultDto(updated) });
});
