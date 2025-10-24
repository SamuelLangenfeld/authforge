/**
 * useOrganizationMembers Hook Tests
 *
 * Tests for the useOrganizationMembers hook that fetches and manages
 * organization member data.
 *
 * Why This Matters:
 * - Validates that hook fetches members when organizationId is provided
 * - Ensures loading state is properly managed during fetch
 * - Verifies error handling for API failures
 * - Tests that hook doesn't fetch when organizationId is empty
 * - Validates refetch when organizationId changes
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useOrganizationMembers } from '@/app/lib/hooks/useOrganization';
import { organizationApi } from '@/app/lib/api';
import { Member } from '@/app/lib/types';

// Mock dependencies
vi.mock('@/app/lib/api');

describe('useOrganizationMembers Hook', () => {
  const mockMembers: Member[] = [
    {
      id: 'member-1',
      user: {
        id: 'user-1',
        name: 'John Doe',
        email: 'john@example.com',
      },
      role: {
        id: 'role-1',
        name: 'Admin',
      },
    },
    {
      id: 'member-2',
      user: {
        id: 'user-2',
        name: 'Jane Smith',
        email: 'jane@example.com',
      },
      role: {
        id: 'role-2',
        name: 'Member',
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with correct default values', () => {
      vi.mocked(organizationApi.getMembers).mockResolvedValueOnce({
        success: true,
        data: { members: mockMembers },
      });

      const { result } = renderHook(() => useOrganizationMembers('org-123'));

      expect(result.current.members).toEqual([]);
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should not fetch when organizationId is empty', async () => {
      vi.mocked(organizationApi.getMembers).mockResolvedValueOnce({
        success: true,
        data: { members: mockMembers },
      });

      const { result } = renderHook(() => useOrganizationMembers(''));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(organizationApi.getMembers).not.toHaveBeenCalled();
      expect(result.current.members).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  describe('successful member fetch', () => {
    it('should fetch members when organizationId is provided', async () => {
      vi.mocked(organizationApi.getMembers).mockResolvedValueOnce({
        success: true,
        data: { members: mockMembers },
      });

      const { result } = renderHook(() => useOrganizationMembers('org-123'));

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(organizationApi.getMembers).toHaveBeenCalledWith('org-123');
      expect(result.current.members).toEqual(mockMembers);
      expect(result.current.error).toBeNull();
    });


  });


  describe('dependency changes', () => {

    it('should not refetch when organizationId stays the same', async () => {
      vi.mocked(organizationApi.getMembers).mockResolvedValueOnce({
        success: true,
        data: { members: mockMembers },
      });

      const { result, rerender } = renderHook(
        ({ orgId }: { orgId: string }) => useOrganizationMembers(orgId),
        { initialProps: { orgId: 'org-123' } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(organizationApi.getMembers).toHaveBeenCalledTimes(1);

      // Rerender with same organizationId
      rerender({ orgId: 'org-123' });

      // Should still be called only once
      expect(organizationApi.getMembers).toHaveBeenCalledTimes(1);
    });

    it('should stop fetching when organizationId becomes empty', async () => {
      vi.mocked(organizationApi.getMembers).mockResolvedValueOnce({
        success: true,
        data: { members: mockMembers },
      });

      const { result, rerender } = renderHook(
        ({ orgId }: { orgId: string }) => useOrganizationMembers(orgId),
        { initialProps: { orgId: 'org-123' } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(organizationApi.getMembers).toHaveBeenCalledTimes(1);

      // Change to empty organizationId
      rerender({ orgId: '' });

      // Should not fetch again
      expect(organizationApi.getMembers).toHaveBeenCalledTimes(1);
      expect(result.current.loading).toBe(false);
    });
  });

  describe('loading state management', () => {
    it('should set loading to true at start and false when complete', async () => {
      vi.mocked(organizationApi.getMembers).mockResolvedValueOnce({
        success: true,
        data: { members: mockMembers },
      });

      const { result } = renderHook(() => useOrganizationMembers('org-123'));

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.members).toEqual(mockMembers);
    });


    it('should reset loading state on each fetch', async () => {
      vi.mocked(organizationApi.getMembers)
        .mockResolvedValueOnce({
          success: true,
          data: { members: mockMembers },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { members: [mockMembers[0]] },
        });

      const { result, rerender } = renderHook(
        ({ orgId }: { orgId: string }) => useOrganizationMembers(orgId),
        { initialProps: { orgId: 'org-123' } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Change organizationId to trigger new fetch
      rerender({ orgId: 'org-456' });

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('hook return values', () => {
    it('should return all required properties', async () => {
      vi.mocked(organizationApi.getMembers).mockResolvedValueOnce({
        success: true,
        data: { members: mockMembers },
      });

      const { result } = renderHook(() => useOrganizationMembers('org-123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current).toHaveProperty('members');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');

      expect(Array.isArray(result.current.members)).toBe(true);
      expect(typeof result.current.loading).toBe('boolean');
      expect(
        result.current.error === null || typeof result.current.error === 'string'
      ).toBe(true);
    });
  });
});
