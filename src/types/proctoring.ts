export type EventReviewStatus = 'Open' | 'Reviewed';

export interface ProctoringEvent {
  id: string;
  attemptId?: string;
  examTitle?: string;
  studentName: string;
  /** Server-recorded event timestamp in ISO format. */
  time: string;
  type: string;
  metadata?: Record<string, unknown> | null;
  reviewStatus: EventReviewStatus;
}
