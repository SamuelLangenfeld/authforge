/**
 * useAuth Hook Tests
 *
 * Tests for the useAuth hook that manages authentication state and actions
 * (login, register, logout).
 *
 * Why This Matters:
 * - Validates that auth hook properly handles loading and error states
 * - Ensures router navigation is triggered on successful auth actions
 * - Verifies error handling for different error types
 * - Tests that hooks throw errors after setting error state
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '@/app/lib/hooks/useAuth';
import { authApi } from '@/app/lib/api';
import { useRouter } from 'next/navigation';

// Mock dependencies
vi.mock('@/app/lib/api');
vi.mock('next/navigation');

describe('useAuth Hook', () => {
  const mockRouter = {
    push: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reason: vi.mock() creates mocks at runtime; TypeScript can't infer their type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useRouter as any).mockReturnValue(mockRouter);
  });

  describe('login', () => {
    it('should set loading to true during login', async () => {
      // Reason: Mock methods are added dynamically by vi.mock()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (authApi.login as any).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useAuth());

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();

      act(() => {
        result.current.login('test@example.com', 'password123');
      });

      expect(result.current.loading).toBe(true);
    });

    it('should navigate to dashboard on successful login', async () => {
      // Reason: Mock methods are added dynamically by vi.mock()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (authApi.login as any).mockResolvedValueOnce({
        success: true,
        data: { userId: '123' },
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });


    it('should handle generic errors', async () => {
      const error = new Error('Network error');
      // Reason: Mock methods are added dynamically by vi.mock()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (authApi.login as any).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useAuth());

      let thrownError: Error | null = null;
      await act(async () => {
        try {
          await result.current.login('test@example.com', 'password123');
        } catch (err) {
          thrownError = err as Error;
        }
      });

      expect(thrownError?.message).toBe('Network error');
      expect(result.current.error).toBe('An error occurred. Please try again.');
      expect(result.current.loading).toBe(false);
    });

    it('should call authApi.login with correct parameters', async () => {
      // Reason: Mock methods are added dynamically by vi.mock()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (authApi.login as any).mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login('user@example.com', 'mypassword');
      });

      expect(authApi.login).toHaveBeenCalledWith('user@example.com', 'mypassword');
      expect(authApi.login).toHaveBeenCalledTimes(1);
    });
  });

  describe('register', () => {
    it('should set loading to true during register', async () => {
      // Reason: Mock methods are added dynamically by vi.mock()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (authApi.register as any).mockImplementation(
        () => new Promise(() => {})
      );

      const { result } = renderHook(() => useAuth());

      expect(result.current.loading).toBe(false);

      act(() => {
        result.current.register(
          'test@example.com',
          'password123',
          'Test User',
          'Test Org'
        );
      });

      expect(result.current.loading).toBe(true);
    });

    it('should navigate to dashboard on successful registration', async () => {
      // Reason: Mock methods are added dynamically by vi.mock()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (authApi.register as any).mockResolvedValueOnce({
        success: true,
        data: { userId: '123', orgId: 'org-123' },
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.register(
          'new@example.com',
          'password123',
          'New User',
          'New Org'
        );
      });

      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });


    it('should call authApi.register with correct parameters', async () => {
      // Reason: Mock methods are added dynamically by vi.mock()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (authApi.register as any).mockResolvedValueOnce({
        success: true,
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.register(
          'user@example.com',
          'password',
          'User Name',
          'Org Name'
        );
      });

      expect(authApi.register).toHaveBeenCalledWith(
        'user@example.com',
        'password',
        'User Name',
        'Org Name'
      );
    });
  });

  describe('logout', () => {
    it('should set loading to true during logout', async () => {
      // Reason: Mock methods are added dynamically by vi.mock()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (authApi.logout as any).mockImplementation(
        () => new Promise(() => {})
      );

      const { result } = renderHook(() => useAuth());

      expect(result.current.loading).toBe(false);

      act(() => {
        result.current.logout();
      });

      expect(result.current.loading).toBe(true);
    });

    it('should navigate to home on successful logout', async () => {
      // Reason: Mock methods are added dynamically by vi.mock()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (authApi.logout as any).mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.logout();
      });

      expect(mockRouter.push).toHaveBeenCalledWith('/');
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });


    it('should handle generic errors during logout with custom message', async () => {
      const error = new Error('Network error');
      // Reason: Mock methods are added dynamically by vi.mock()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (authApi.logout as any).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useAuth());

      let thrownError: Error | null = null;
      await act(async () => {
        try {
          await result.current.logout();
        } catch (err) {
          thrownError = err as Error;
        }
      });

      expect(thrownError?.message).toBe('Network error');
      expect(result.current.error).toBe('Logout failed. Please try again.');
      expect(result.current.loading).toBe(false);
    });

    it('should call authApi.logout', async () => {
      // Reason: Mock methods are added dynamically by vi.mock()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (authApi.logout as any).mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.logout();
      });

      expect(authApi.logout).toHaveBeenCalledTimes(1);
    });
  });

  describe('hook return values', () => {
    it('should return all required properties', () => {
      // Reason: Mock methods are added dynamically by vi.mock()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (authApi.login as any).mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useAuth());

      expect(result.current).toHaveProperty('login');
      expect(result.current).toHaveProperty('register');
      expect(result.current).toHaveProperty('logout');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');

      expect(typeof result.current.login).toBe('function');
      expect(typeof result.current.register).toBe('function');
      expect(typeof result.current.logout).toBe('function');
      expect(typeof result.current.loading).toBe('boolean');
      expect(result.current.error).toBeNull();
    });

    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });
});
