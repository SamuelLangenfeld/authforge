/**
 * SaaS Client Tests
 *
 * Comprehensive tests for the SaaSClient class and UserManager
 * covering token management, authentication, and CRUD operations
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  SaaSClient,
  SaaSClientError,
  type SaaSClientConfig,
} from './saas-client';

// Mock global fetch
global.fetch = vi.fn();

describe('SaaSClient', () => {
  const mockConfig: SaaSClientConfig = {
    baseUrl: 'http://localhost:3000',
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
  };

  const mockTokenResponse = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    tokenType: 'Bearer',
    expiresIn: 3600, // 1 hour
  };

  const mockUserData = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    emailVerified: '2024-01-01T00:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('authentication', () => {
    it('should authenticate with client credentials', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockTokenResponse), { status: 200 })
      );

      const client = new SaaSClient(mockConfig);
      const token = await client.getAccessToken();

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockConfig.baseUrl}/api/auth/token`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: mockConfig.clientId,
            clientSecret: mockConfig.clientSecret,
          }),
        })
      );

      expect(token).toBe('mock-access-token');
    });

    it('should throw error when authentication fails', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Invalid credentials' }), {
          status: 401,
        })
      );

      const client = new SaaSClient(mockConfig);

      await expect(client.getAccessToken()).rejects.toThrow(
        'Authentication failed'
      );
    });

    it('should throw error with correct status when authentication fails', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Invalid credentials' }), {
          status: 401,
        })
      );

      const client = new SaaSClient(mockConfig);

      try {
        await client.getAccessToken();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SaaSClientError);
        expect((error as SaaSClientError).status).toBe(401);
      }
    });
  });

  describe('token caching', () => {
    it('should cache token and return same token on subsequent calls', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockTokenResponse), { status: 200 })
      );

      const client = new SaaSClient(mockConfig);
      const token1 = await client.getAccessToken();
      const token2 = await client.getAccessToken();

      expect(token1).toBe(token2);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only called once
    });

    it('should refresh token when expiry is within 1 minute buffer', async () => {
      const mockFetch = vi.mocked(fetch);

      // First auth call
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockTokenResponse), { status: 200 })
      );

      const client = new SaaSClient(mockConfig);
      const token1 = await client.getAccessToken();

      // Advance time to 59 minutes (within 1 minute buffer)
      vi.advanceTimersByTime(59 * 60 * 1000);

      // Second auth call (refresh)
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ...mockTokenResponse,
            accessToken: 'new-access-token',
          }),
          { status: 200 }
        )
      );

      const token2 = await client.getAccessToken();

      expect(token1).toBe('mock-access-token');
      expect(token2).toBe('new-access-token');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should not refresh token if still valid with buffer', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockTokenResponse), { status: 200 })
      );

      const client = new SaaSClient(mockConfig);
      const token1 = await client.getAccessToken();

      // Advance time to 30 minutes (still valid, outside 1 minute buffer)
      vi.advanceTimersByTime(30 * 60 * 1000);

      const token2 = await client.getAccessToken();

      expect(token1).toBe(token2);
      expect(mockFetch).toHaveBeenCalledTimes(1); // No refresh needed
    });
  });

  describe('token refresh', () => {
    it('should use refresh token to get new access token', async () => {
      const mockFetch = vi.mocked(fetch);

      // Initial auth
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockTokenResponse), { status: 200 })
      );

      const client = new SaaSClient(mockConfig);
      await client.getAccessToken();

      // Simulate token expiry
      vi.advanceTimersByTime(60 * 60 * 1000); // 1 hour

      // Refresh call
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            accessToken: 'refreshed-token',
            refreshToken: 'new-refresh-token',
            tokenType: 'Bearer',
            expiresIn: 3600,
          }),
          { status: 200 }
        )
      );

      const token = await client.getAccessToken();

      expect(token).toBe('refreshed-token');
      expect(mockFetch).toHaveBeenLastCalledWith(
        `${mockConfig.baseUrl}/api/auth/refresh`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            refreshToken: mockTokenResponse.refreshToken,
          }),
        })
      );
    });

    it('should fallback to authenticate if refresh fails', async () => {
      const mockFetch = vi.mocked(fetch);

      // Initial auth
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockTokenResponse), { status: 200 })
      );

      const client = new SaaSClient(mockConfig);
      await client.getAccessToken();

      // Simulate token expiry
      vi.advanceTimersByTime(60 * 60 * 1000);

      // Refresh fails
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Invalid refresh token' }), {
          status: 401,
        })
      );

      // Should fallback to authenticate
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            accessToken: 'new-auth-token',
            refreshToken: 'new-refresh-token',
            tokenType: 'Bearer',
            expiresIn: 3600,
          }),
          { status: 200 }
        )
      );

      const token = await client.getAccessToken();

      expect(token).toBe('new-auth-token');
      expect(mockFetch).toHaveBeenCalledTimes(3); // initial auth + refresh + fallback auth
    });

    it('should clear tokens when refresh fails', async () => {
      const mockFetch = vi.mocked(fetch);

      // Initial auth
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockTokenResponse), { status: 200 })
      );

      const client = new SaaSClient(mockConfig);
      await client.getAccessToken();

      // Simulate token expiry
      vi.advanceTimersByTime(60 * 60 * 1000);

      // Refresh fails
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Invalid refresh token' }), {
          status: 401,
        })
      );

      // Next auth call
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockTokenResponse), { status: 200 })
      );

      await client.getAccessToken();

      // Tokens should have been cleared and re-authenticated
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('authenticated requests', () => {
    it('should make authenticated GET request with Bearer token', async () => {
      const mockFetch = vi.mocked(fetch);

      // Auth
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockTokenResponse), { status: 200 })
      );

      // Request
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: mockUserData,
          }),
          { status: 200 }
        )
      );

      const client = new SaaSClient(mockConfig);
      const response = await client.request('GET', '/api/users/1');

      expect(mockFetch).toHaveBeenLastCalledWith(
        `${mockConfig.baseUrl}/api/users/1`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockTokenResponse.accessToken}`,
            'Content-Type': 'application/json',
          }),
        })
      );

      expect(response.data).toEqual(mockUserData);
    });

    it('should make authenticated POST request with body', async () => {
      const mockFetch = vi.mocked(fetch);

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockTokenResponse), { status: 200 })
      );

      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: mockUserData,
          }),
          { status: 200 }
        )
      );

      const client = new SaaSClient(mockConfig);
      const body = {
        email: 'new@example.com',
        name: 'New User',
        password: 'password',
      };

      await client.request('POST', '/api/users', body);

      const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
      expect(lastCall[1]).toMatchObject({
        method: 'POST',
        body: JSON.stringify(body),
      });
    });

    it('should throw error on request failure', async () => {
      const mockFetch = vi.mocked(fetch);

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockTokenResponse), { status: 200 })
      );

      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: 'User not found',
            details: { userId: '999' },
          }),
          { status: 404 }
        )
      );

      const client = new SaaSClient(mockConfig);

      await expect(client.request('GET', '/api/users/999')).rejects.toThrow(
        'User not found'
      );
    });

    it('should include error details in exception', async () => {
      const mockFetch = vi.mocked(fetch);

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockTokenResponse), { status: 200 })
      );

      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: 'Validation failed',
            details: { field: 'email', message: 'Invalid email' },
          }),
          { status: 400 }
        )
      );

      const client = new SaaSClient(mockConfig);

      try {
        await client.request('POST', '/api/users', {});
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SaaSClientError);
        expect((error as SaaSClientError).details).toEqual({
          field: 'email',
          message: 'Invalid email',
        });
      }
    });
  });

  describe('UserManager.list', () => {
    it('should list users with default pagination', async () => {
      const mockFetch = vi.mocked(fetch);

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockTokenResponse), { status: 200 })
      );

      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              users: [mockUserData],
              pagination: {
                skip: 0,
                take: 10,
                total: 1,
                pages: 1,
              },
            },
          }),
          { status: 200 }
        )
      );

      const client = new SaaSClient(mockConfig);
      const result = await client.users.list('org-1');

      expect(result.users).toEqual([mockUserData]);
      expect(result.pagination.skip).toBe(0);
      expect(result.pagination.take).toBe(10);

      const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
      expect(lastCall[0]).toContain('skip=0');
      expect(lastCall[0]).toContain('take=10');
    });

    it('should list users with custom pagination', async () => {
      const mockFetch = vi.mocked(fetch);

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockTokenResponse), { status: 200 })
      );

      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              users: [mockUserData],
              pagination: {
                skip: 20,
                take: 50,
                total: 100,
                pages: 2,
              },
            },
          }),
          { status: 200 }
        )
      );

      const client = new SaaSClient(mockConfig);
      await client.users.list('org-1', { skip: 20, take: 50 });

      const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
      expect(lastCall[0]).toContain('skip=20');
      expect(lastCall[0]).toContain('take=50');
    });

    it('should include search parameter in list request', async () => {
      const mockFetch = vi.mocked(fetch);

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockTokenResponse), { status: 200 })
      );

      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              users: [mockUserData],
              pagination: {
                skip: 0,
                take: 10,
                total: 1,
                pages: 1,
              },
            },
          }),
          { status: 200 }
        )
      );

      const client = new SaaSClient(mockConfig);
      await client.users.list('org-1', { search: 'test@example.com' });

      const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
      expect(lastCall[0]).toContain('search=test%40example.com');
    });
  });

  describe('UserManager.get', () => {
    it('should get a specific user', async () => {
      const mockFetch = vi.mocked(fetch);

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockTokenResponse), { status: 200 })
      );

      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: mockUserData,
          }),
          { status: 200 }
        )
      );

      const client = new SaaSClient(mockConfig);
      const user = await client.users.get('org-1', 'user-1');

      expect(user).toEqual(mockUserData);
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.stringContaining('/api/organizations/org-1/users/user-1'),
        expect.any(Object)
      );
    });
  });

  describe('UserManager.create', () => {
    it('should create a new user', async () => {
      const mockFetch = vi.mocked(fetch);

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockTokenResponse), { status: 200 })
      );

      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: mockUserData,
          }),
          { status: 200 }
        )
      );

      const client = new SaaSClient(mockConfig);
      const createData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
      };

      const user = await client.users.create('org-1', createData);

      expect(user).toEqual(mockUserData);

      const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
      expect(lastCall[1]).toMatchObject({
        method: 'POST',
        body: JSON.stringify(createData),
      });
    });
  });

  describe('UserManager.update', () => {
    it('should update a user', async () => {
      const mockFetch = vi.mocked(fetch);

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockTokenResponse), { status: 200 })
      );

      const updatedUser = { ...mockUserData, name: 'Updated Name' };

      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: updatedUser,
          }),
          { status: 200 }
        )
      );

      const client = new SaaSClient(mockConfig);
      const user = await client.users.update('org-1', 'user-1', {
        name: 'Updated Name',
      });

      expect(user.name).toBe('Updated Name');

      const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
      expect(lastCall[1]).toMatchObject({
        method: 'PATCH',
      });
    });
  });

  describe('UserManager.delete', () => {
    it('should delete a user', async () => {
      const mockFetch = vi.mocked(fetch);

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockTokenResponse), { status: 200 })
      );

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );

      const client = new SaaSClient(mockConfig);
      await client.users.delete('org-1', 'user-1');

      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.stringContaining('/api/organizations/org-1/users/user-1'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('UserManager.search', () => {
    it('should search users by query', async () => {
      const mockFetch = vi.mocked(fetch);

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockTokenResponse), { status: 200 })
      );

      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              users: [mockUserData],
              pagination: {
                skip: 0,
                take: 10,
                total: 1,
                pages: 1,
              },
            },
          }),
          { status: 200 }
        )
      );

      const client = new SaaSClient(mockConfig);
      const result = await client.users.search('org-1', 'test@example.com');

      expect(result.users).toEqual([mockUserData]);

      const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
      expect(lastCall[0]).toContain('search=test%40example.com');
    });

    it('should pass pagination options to search', async () => {
      const mockFetch = vi.mocked(fetch);

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockTokenResponse), { status: 200 })
      );

      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              users: [mockUserData],
              pagination: {
                skip: 10,
                take: 20,
                total: 1,
                pages: 1,
              },
            },
          }),
          { status: 200 }
        )
      );

      const client = new SaaSClient(mockConfig);
      await client.users.search('org-1', 'test', { skip: 10, take: 20 });

      const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
      expect(lastCall[0]).toContain('skip=10');
      expect(lastCall[0]).toContain('take=20');
    });
  });

  describe('UserManager.getAll', () => {
    it('should fetch all users across multiple pages', async () => {
      const mockFetch = vi.mocked(fetch);

      // Auth
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockTokenResponse), { status: 200 })
      );

      const user2 = {
        ...mockUserData,
        id: 'user-2',
        email: 'test2@example.com',
      };

      // First page
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              users: [mockUserData],
              pagination: {
                skip: 0,
                take: 1,
                total: 2,
                pages: 2,
              },
            },
          }),
          { status: 200 }
        )
      );

      // Second page
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              users: [user2],
              pagination: {
                skip: 1,
                take: 1,
                total: 2,
                pages: 2,
              },
            },
          }),
          { status: 200 }
        )
      );

      const client = new SaaSClient(mockConfig);
      const allUsers = await client.users.getAll('org-1', 1);

      expect(allUsers).toHaveLength(2);
      expect(allUsers).toEqual([mockUserData, user2]);
      expect(mockFetch).toHaveBeenCalledTimes(3); // auth + 2 list calls
    });

    it('should use default page size of 100', async () => {
      const mockFetch = vi.mocked(fetch);

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockTokenResponse), { status: 200 })
      );

      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              users: [mockUserData],
              pagination: {
                skip: 0,
                take: 100,
                total: 1,
                pages: 1,
              },
            },
          }),
          { status: 200 }
        )
      );

      const client = new SaaSClient(mockConfig);
      await client.users.getAll('org-1');

      const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
      expect(lastCall[0]).toContain('take=100');
    });

    it('should handle single page result', async () => {
      const mockFetch = vi.mocked(fetch);

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockTokenResponse), { status: 200 })
      );

      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              users: [mockUserData],
              pagination: {
                skip: 0,
                take: 10,
                total: 1,
                pages: 1,
              },
            },
          }),
          { status: 200 }
        )
      );

      const client = new SaaSClient(mockConfig);
      const allUsers = await client.users.getAll('org-1', 10);

      expect(allUsers).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledTimes(2); // auth + 1 list call
    });

    it('should fetch all users with multiple pages', async () => {
      const mockFetch = vi.mocked(fetch);

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockTokenResponse), { status: 200 })
      );

      const users = Array.from({ length: 10 }, (_, i) => {
        const user = { ...mockUserData };
        user.id = `user-${i}`;
        user.email = `user${i}@example.com`;
        return user;
      });

      // First page (5 users)
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              users: users.slice(0, 5),
              pagination: {
                skip: 0,
                take: 5,
                total: 10,
                pages: 2,
              },
            },
          }),
          { status: 200 }
        )
      );

      // Second page (5 users)
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              users: users.slice(5, 10),
              pagination: {
                skip: 5,
                take: 5,
                total: 10,
                pages: 2,
              },
            },
          }),
          { status: 200 }
        )
      );

      const client = new SaaSClient(mockConfig);
      const allUsers = await client.users.getAll('org-1', 5);

      expect(allUsers).toHaveLength(10);
      expect(allUsers).toEqual(users);
    });
  });

  describe('SaaSClientError', () => {
    it('should create error with message', () => {
      const error = new SaaSClientError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.name).toBe('SaaSClientError');
    });

    it('should create error with status code', () => {
      const error = new SaaSClientError('Test error', 404);

      expect(error.status).toBe(404);
    });

    it('should create error with details', () => {
      const details = { field: 'email', reason: 'already exists' };
      const error = new SaaSClientError('Test error', 400, details);

      expect(error.details).toEqual(details);
    });

    it('should be instanceof Error', () => {
      const error = new SaaSClientError('Test error');

      expect(error).toBeInstanceOf(Error);
    });
  });
});
