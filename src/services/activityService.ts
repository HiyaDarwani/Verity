/**
 * activityService.ts
 * Audit logging and administrative activity service.
 * Fetches recent platform activity logs from the backend.
 */

import type { ActivityLog } from '../types/api';
import { apiClient } from './api/apiClient';

export class ActivityService {
  /** Fetch recent system activities for administrator dashboard */
  public async getRecentActivities(): Promise<ActivityLog[]> {
    return apiClient.get<ActivityLog[]>('/activities');
  }
}

export const activityService = new ActivityService();
