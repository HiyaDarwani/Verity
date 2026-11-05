/**
 * userService.ts
 * User account administration service decoupled from mock data.
 * All operations communicate with backend APIs via the centralized apiClient.
 */

import type { User } from '../types/user';
import type { CreateUserRequest, UpdateUserRequest, UserInvitation } from '../types/api';
import { apiClient, ApiError } from './api/apiClient';

export class UserService {
  /** Fetch all registered users */
  public async getAll(): Promise<User[]> {
    return apiClient.get<User[]>('/users');
  }

  /** Get user by ID */
  public async getById(id: string): Promise<User | null> {
    try {
      return await apiClient.get<User>(`/users/${id}`);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 404) return null;
      throw error;
    }
  }

  /** Create new user */
  public async create(data: CreateUserRequest): Promise<UserInvitation> {
    return apiClient.post<UserInvitation>('/users/invitations', data);
  }

  /** Update user attributes */
  public async update(id: string, patch: UpdateUserRequest): Promise<User> {
    return apiClient.put<User>(`/users/${id}`, patch);
  }

  /** Toggle user active status */
  public async setActive(id: string, active: boolean): Promise<boolean> {
    await apiClient.patch(`/users/${id}/status`, { active });
    return true;
  }
}

export const userService = new UserService();
