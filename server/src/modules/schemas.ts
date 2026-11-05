import { z } from 'zod';

export const uuidParam = z.object({ id: z.string().uuid() });
export const loginSchema = z.object({ email: z.email().max(320).transform((v) => v.toLowerCase()), password: z.string().min(8).max(128) });
export const registerSchema = loginSchema.extend({ name: z.string().trim().min(1).max(160) });
export const acceptInvitationSchema = z.object({ token: z.string().length(64), password: z.string().min(8).max(128) });
export const inviteUserSchema = z.object({ name: z.string().trim().min(1).max(160), email: z.email().max(320).transform((v) => v.toLowerCase()), role: z.enum(['Student', 'Examiner', 'Administrator']) });
const dateTime = z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Expected a valid date/time');
export const examInputSchema = z.object({
  title: z.string().trim().min(1).max(240), subject: z.string().trim().min(1).max(160),
  description: z.string().max(10000).optional(), instructions: z.string().max(10000).optional(),
  date: dateTime.optional(), durationMinutes: z.number().int().min(1).max(1440),
  availableFrom: dateTime.optional(), availableUntil: dateTime.nullable().optional(),
  status: z.enum(['Draft', 'Scheduled', 'Active', 'Completed']).optional(),
});
export const questionInputSchema = z.object({ question: z.object({
  id: z.string().optional(), type: z.enum(['mcq', 'sub']), text: z.string().trim().min(1).max(20000), marks: z.number().positive().max(10000),
  options: z.array(z.string().trim().min(1).max(1000)).length(4).optional(), correctOption: z.number().int().min(0).max(3).optional(),
}).superRefine((q, ctx) => {
  if (q.type === 'mcq' && (!q.options || q.correctOption === undefined)) ctx.addIssue({ code: 'custom', message: 'MCQ questions require four options and a correct option' });
  if (q.type === 'sub' && (q.options !== undefined || q.correctOption !== undefined)) ctx.addIssue({ code: 'custom', message: 'Subjective questions cannot include options or a correct option' });
}) });
export const progressSchema = z.object({ questionIndex: z.number().int().nonnegative().optional(), answers: z.record(z.string(), z.union([z.number().int().nonnegative(), z.string().max(50000)])) });
export const evaluationSchema = z.object({
  grades: z.array(z.object({ questionId: z.string().uuid(), marks: z.number().min(0), feedback: z.string().max(10000).optional() }))
    .min(1)
    .refine((grades) => new Set(grades.map((grade) => grade.questionId)).size === grades.length, 'A question may be graded only once per request'),
});
