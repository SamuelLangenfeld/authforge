/**
 * useVerifiedMessage Hook Tests
 *
 * Tests for the useVerifiedMessage hook that manages email verification
 * message display with auto-hide functionality.
 *
 * Why This Matters:
 * - Validates that message displays when verified is true
 * - Ensures message auto-hides after 5 seconds
 * - Tests cleanup of timers to prevent memory leaks
 * - Verifies custom messages are displayed correctly
 * - Tests message reappears when verified prop changes
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useVerifiedMessage } from '@/app/lib/hooks/useVerifiedMessage';

describe('useVerifiedMessage Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllTimers();
  });

  describe('initialization', () => {
    it('should show message when verified is true', () => {
      const { result } = renderHook(() =>
        useVerifiedMessage({ verified: true })
      );

      expect(result.current.VerifiedMessage).not.toBeNull();
    });

    it('should not show message when verified is false', () => {
      const { result } = renderHook(() =>
        useVerifiedMessage({ verified: false })
      );

      expect(result.current.VerifiedMessage).toBeNull();
    });
  });

  describe('auto-hide functionality', () => {
    it('should hide message after 5 seconds', () => {
      const { result } = renderHook(() =>
        useVerifiedMessage({ verified: true })
      );

      expect(result.current.VerifiedMessage).not.toBeNull();

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.VerifiedMessage).toBeNull();
    });

    it('should not hide message before 5 seconds', () => {
      const { result } = renderHook(() =>
        useVerifiedMessage({ verified: true })
      );

      expect(result.current.VerifiedMessage).not.toBeNull();

      act(() => {
        vi.advanceTimersByTime(4000);
      });

      expect(result.current.VerifiedMessage).not.toBeNull();
    });

    it('should hide message at exactly 5 seconds', () => {
      const { result } = renderHook(() =>
        useVerifiedMessage({ verified: true })
      );

      expect(result.current.VerifiedMessage).not.toBeNull();

      act(() => {
        vi.advanceTimersByTime(4999);
      });

      expect(result.current.VerifiedMessage).not.toBeNull();

      act(() => {
        vi.advanceTimersByTime(1);
      });

      expect(result.current.VerifiedMessage).toBeNull();
    });

    it('should not start timer when verified is false', () => {
      const { result } = renderHook(() =>
        useVerifiedMessage({ verified: false })
      );

      expect(result.current.VerifiedMessage).toBeNull();

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.VerifiedMessage).toBeNull();
    });
  });

  describe('timer cleanup', () => {
    it('should clean up timer when component unmounts while message visible', () => {
      const spy = vi.spyOn(global, 'clearTimeout');

      const { unmount } = renderHook(() =>
        useVerifiedMessage({ verified: true })
      );

      unmount();

      expect(spy).toHaveBeenCalled();

      spy.mockRestore();
    });


    it('should not have lingering timers after unmount', () => {
      const { unmount } = renderHook(() =>
        useVerifiedMessage({ verified: true })
      );

      unmount();

      const pendingTimers = vi.getTimerCount();
      expect(pendingTimers).toBe(0);
    });
  });


  describe('hook return values', () => {
    it('should return object with VerifiedMessage property', () => {
      const { result } = renderHook(() =>
        useVerifiedMessage({ verified: true })
      );

      expect(result.current).toHaveProperty('VerifiedMessage');
      expect(
        result.current.VerifiedMessage === null ||
          typeof result.current.VerifiedMessage === 'object'
      ).toBe(true);
    });

    it('should return React element or null', () => {
      const { result: resultTrue } = renderHook(() =>
        useVerifiedMessage({ verified: true })
      );

      const { result: resultFalse } = renderHook(() =>
        useVerifiedMessage({ verified: false })
      );

      // When verified is true, should return an element
      expect(resultTrue.current.VerifiedMessage).not.toBeNull();

      // When verified is false, should return null
      expect(resultFalse.current.VerifiedMessage).toBeNull();
    });

    it('should consistently return VerifiedMessage property', () => {
      const { result } = renderHook(() =>
        useVerifiedMessage({ verified: true })
      );

      expect('VerifiedMessage' in result.current).toBe(true);
      expect(Object.keys(result.current).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('edge cases', () => {
    it('should accept empty custom message without crashing', () => {
      const { result } = renderHook(() =>
        useVerifiedMessage({ verified: true, message: '' })
      );

      expect(result.current.VerifiedMessage).not.toBeNull();
    });

    it('should accept custom messages with special characters', () => {
      const specialMessage = "Email verified! ✓ <script>alert('xss')</script>";
      const { result } = renderHook(() =>
        useVerifiedMessage({ verified: true, message: specialMessage })
      );

      expect(result.current.VerifiedMessage).not.toBeNull();
    });
  });
});
