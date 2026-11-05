/**
 * proctoringService.ts
 * Proctoring anomaly event management service decoupled from mock data.
 * All operations communicate with backend APIs via the centralized apiClient.
 */

import type { ProctoringEvent, EventReviewStatus } from '../types/proctoring';
import { apiClient } from './api/apiClient';

export class ProctoringService {
  /** Record a transparent, server-timestamped event for the current attempt. */
  public async recordEvent(attemptId: string, type: string, metadata?: Record<string, unknown>): Promise<void> {
    await apiClient.post(`/proctoring-events/attempt/${attemptId}`, { type, metadata });
  }

  /** Fetch all flagged proctoring events */
  public async getAll(): Promise<ProctoringEvent[]> {
    return apiClient.get<ProctoringEvent[]>('/proctoring-events');
  }

  /** Update review status of a flagged event */
  public async setReviewStatus(id: string, status: EventReviewStatus): Promise<boolean> {
    await apiClient.patch(`/proctoring-events/${id}`, { reviewStatus: status });
    return true;
  }
}

export const proctoringService = new ProctoringService();
