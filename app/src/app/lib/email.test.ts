/**
 * Email Service Tests
 *
 * Tests for Mailgun email service functionality
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock environment before importing email module
vi.mock('./env', () => ({
  default: {
    HOST_URL: 'https://auth.example.com',
    MAILGUN_API_KEY: 'test-api-key',
    MAILGUN_DOMAIN: 'mail.example.com',
    FROM_EMAIL: 'noreply@example.com',
  },
}));

// Mock mailgun.js
const mockMessagesCreate = vi.fn();
const mockClient = vi.fn(() => ({
  messages: {
    create: mockMessagesCreate,
  },
}));

class MockMailgun {
  client = mockClient;
}

vi.mock('mailgun.js', () => ({
  default: MockMailgun,
}));

vi.mock('form-data', () => ({
  default: class FormData {},
}));

describe('Email Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('sendVerificationEmail', () => {
    it('should send verification email with correct parameters', async () => {
      mockMessagesCreate.mockResolvedValueOnce({ id: 'msg-1' });

      const { sendVerificationEmail } = await import('./email');

      await sendVerificationEmail('user@example.com', 'token123');

      expect(mockMessagesCreate).toHaveBeenCalledWith(
        'mail.example.com',
        expect.objectContaining({
          from: 'AuthForge <noreply@example.com>',
          to: 'user@example.com',
          subject: 'Verify your email address',
        })
      );
    });

    it('should construct correct verification URL in email', async () => {
      mockMessagesCreate.mockResolvedValueOnce({ id: 'msg-1' });

      const { sendVerificationEmail } = await import('./email');

      await sendVerificationEmail('user@example.com', 'token123');

      const callArgs = mockMessagesCreate.mock.calls[0];
      const emailContent = callArgs[1];

      expect(emailContent.html).toContain(
        'https://auth.example.com/api/auth/verify-email?token=token123'
      );
    });

    it('should return success response', async () => {
      mockMessagesCreate.mockResolvedValueOnce({ id: 'msg-1' });

      const { sendVerificationEmail } = await import('./email');

      const result = await sendVerificationEmail('user@example.com', 'token123');

      expect(result).toEqual({ success: true });
    });

    it('should throw error when Mailgun fails', async () => {
      const error = new Error('Mailgun API error');
      mockMessagesCreate.mockRejectedValueOnce(error);

      const { sendVerificationEmail } = await import('./email');

      await expect(
        sendVerificationEmail('user@example.com', 'token123')
      ).rejects.toThrow('Mailgun API error');
    });

    it('should include verification link as clickable button', async () => {
      mockMessagesCreate.mockResolvedValueOnce({ id: 'msg-1' });

      const { sendVerificationEmail } = await import('./email');

      await sendVerificationEmail('test@example.com', 'abc123');

      const callArgs = mockMessagesCreate.mock.calls[0];
      const emailContent = callArgs[1];

      expect(emailContent.html).toContain('Verify Email');
      expect(emailContent.html).toContain(
        'https://auth.example.com/api/auth/verify-email?token=abc123'
      );
    });

    it('should include email expiry information', async () => {
      mockMessagesCreate.mockResolvedValueOnce({ id: 'msg-1' });

      const { sendVerificationEmail } = await import('./email');

      await sendVerificationEmail('user@example.com', 'token123');

      const callArgs = mockMessagesCreate.mock.calls[0];
      const emailContent = callArgs[1];

      expect(emailContent.html).toContain('24 hours');
    });

    it('should send HTML email', async () => {
      mockMessagesCreate.mockResolvedValueOnce({ id: 'msg-1' });

      const { sendVerificationEmail } = await import('./email');

      await sendVerificationEmail('user@example.com', 'token123');

      const callArgs = mockMessagesCreate.mock.calls[0];
      const emailContent = callArgs[1];

      expect(emailContent.html).toContain('<!DOCTYPE html>');
      expect(emailContent.html).toContain('<html>');
      expect(emailContent.html).toContain('</html>');
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email with correct parameters', async () => {
      mockMessagesCreate.mockResolvedValueOnce({ id: 'msg-2' });

      const { sendPasswordResetEmail } = await import('./email');

      await sendPasswordResetEmail('user@example.com', 'reset123');

      expect(mockMessagesCreate).toHaveBeenCalledWith(
        'mail.example.com',
        expect.objectContaining({
          from: 'AuthForge <noreply@example.com>',
          to: 'user@example.com',
          subject: 'Reset your password',
        })
      );
    });

    it('should construct correct password reset URL in email', async () => {
      mockMessagesCreate.mockResolvedValueOnce({ id: 'msg-2' });

      const { sendPasswordResetEmail } = await import('./email');

      await sendPasswordResetEmail('user@example.com', 'reset123');

      const callArgs = mockMessagesCreate.mock.calls[0];
      const emailContent = callArgs[1];

      expect(emailContent.html).toContain(
        'https://auth.example.com/reset-password?token=reset123'
      );
    });

    it('should return success response', async () => {
      mockMessagesCreate.mockResolvedValueOnce({ id: 'msg-2' });

      const { sendPasswordResetEmail } = await import('./email');

      const result = await sendPasswordResetEmail('user@example.com', 'reset123');

      expect(result).toEqual({ success: true });
    });

    it('should throw error when Mailgun fails', async () => {
      const error = new Error('Mailgun API error');
      mockMessagesCreate.mockRejectedValueOnce(error);

      const { sendPasswordResetEmail } = await import('./email');

      await expect(
        sendPasswordResetEmail('user@example.com', 'reset123')
      ).rejects.toThrow('Mailgun API error');
    });

    it('should include password reset button', async () => {
      mockMessagesCreate.mockResolvedValueOnce({ id: 'msg-2' });

      const { sendPasswordResetEmail } = await import('./email');

      await sendPasswordResetEmail('test@example.com', 'xyz789');

      const callArgs = mockMessagesCreate.mock.calls[0];
      const emailContent = callArgs[1];

      expect(emailContent.html).toContain('Reset Password');
      expect(emailContent.html).toContain(
        'https://auth.example.com/reset-password?token=xyz789'
      );
    });

    it('should include token expiry information', async () => {
      mockMessagesCreate.mockResolvedValueOnce({ id: 'msg-2' });

      const { sendPasswordResetEmail } = await import('./email');

      await sendPasswordResetEmail('user@example.com', 'reset123');

      const callArgs = mockMessagesCreate.mock.calls[0];
      const emailContent = callArgs[1];

      expect(emailContent.html).toContain('24 hours');
    });

    it('should warn about ignoring if not requested', async () => {
      mockMessagesCreate.mockResolvedValueOnce({ id: 'msg-2' });

      const { sendPasswordResetEmail } = await import('./email');

      await sendPasswordResetEmail('user@example.com', 'reset123');

      const callArgs = mockMessagesCreate.mock.calls[0];
      const emailContent = callArgs[1];

      expect(emailContent.html).toContain("didn't request");
      expect(emailContent.html).toContain('password will remain unchanged');
    });
  });

  describe('sendInvitationEmail', () => {
    it('should send invitation email with correct parameters', async () => {
      mockMessagesCreate.mockResolvedValueOnce({ id: 'msg-3' });

      const { sendInvitationEmail } = await import('./email');

      await sendInvitationEmail(
        'user@example.com',
        'Acme Corp',
        'invite123'
      );

      expect(mockMessagesCreate).toHaveBeenCalledWith(
        'mail.example.com',
        expect.objectContaining({
          from: 'AuthForge <noreply@example.com>',
          to: 'user@example.com',
          subject: "You're invited to join Acme Corp",
        })
      );
    });

    it('should include organization name in subject', async () => {
      mockMessagesCreate.mockResolvedValueOnce({ id: 'msg-3' });

      const { sendInvitationEmail } = await import('./email');

      await sendInvitationEmail('user@example.com', 'Tech Startup', 'invite123');

      const callArgs = mockMessagesCreate.mock.calls[0];
      const emailContent = callArgs[1];

      expect(emailContent.subject).toContain('Tech Startup');
    });

    it('should construct correct invitation URL in email', async () => {
      mockMessagesCreate.mockResolvedValueOnce({ id: 'msg-3' });

      const { sendInvitationEmail } = await import('./email');

      await sendInvitationEmail('user@example.com', 'Acme Corp', 'invite123');

      const callArgs = mockMessagesCreate.mock.calls[0];
      const emailContent = callArgs[1];

      expect(emailContent.html).toContain(
        'https://auth.example.com/accept-invitation?token=invite123'
      );
    });

    it('should return success response', async () => {
      mockMessagesCreate.mockResolvedValueOnce({ id: 'msg-3' });

      const { sendInvitationEmail } = await import('./email');

      const result = await sendInvitationEmail(
        'user@example.com',
        'Acme Corp',
        'invite123'
      );

      expect(result).toEqual({ success: true });
    });

    it('should throw error when Mailgun fails', async () => {
      const error = new Error('Mailgun API error');
      mockMessagesCreate.mockRejectedValueOnce(error);

      const { sendInvitationEmail } = await import('./email');

      await expect(
        sendInvitationEmail('user@example.com', 'Acme Corp', 'invite123')
      ).rejects.toThrow('Mailgun API error');
    });

    it('should include organization name in email body', async () => {
      mockMessagesCreate.mockResolvedValueOnce({ id: 'msg-3' });

      const { sendInvitationEmail } = await import('./email');

      await sendInvitationEmail('user@example.com', 'Tech Company', 'invite123');

      const callArgs = mockMessagesCreate.mock.calls[0];
      const emailContent = callArgs[1];

      expect(emailContent.html).toContain('Tech Company');
    });

    it('should include accept invitation button', async () => {
      mockMessagesCreate.mockResolvedValueOnce({ id: 'msg-3' });

      const { sendInvitationEmail } = await import('./email');

      await sendInvitationEmail('user@example.com', 'Acme Corp', 'invite123');

      const callArgs = mockMessagesCreate.mock.calls[0];
      const emailContent = callArgs[1];

      expect(emailContent.html).toContain('Accept Invitation');
    });

    it('should include invitation expiry information', async () => {
      mockMessagesCreate.mockResolvedValueOnce({ id: 'msg-3' });

      const { sendInvitationEmail } = await import('./email');

      await sendInvitationEmail('user@example.com', 'Acme Corp', 'invite123');

      const callArgs = mockMessagesCreate.mock.calls[0];
      const emailContent = callArgs[1];

      expect(emailContent.html).toContain('7 days');
    });

    it('should mention account creation in email', async () => {
      mockMessagesCreate.mockResolvedValueOnce({ id: 'msg-3' });

      const { sendInvitationEmail } = await import('./email');

      await sendInvitationEmail('user@example.com', 'Acme Corp', 'invite123');

      const callArgs = mockMessagesCreate.mock.calls[0];
      const emailContent = callArgs[1];

      expect(emailContent.html).toContain("don't have an account");
    });
  });

  describe('error handling', () => {
    it('should handle Error objects', async () => {
      const error = new Error('API Error: Invalid API key');
      mockMessagesCreate.mockRejectedValueOnce(error);

      const { sendVerificationEmail } = await import('./email');

      await expect(
        sendVerificationEmail('user@example.com', 'token123')
      ).rejects.toThrow('API Error: Invalid API key');
    });

    it('should handle non-Error objects', async () => {
      mockMessagesCreate.mockRejectedValueOnce({
        error: 'Custom error object',
      });

      const { sendVerificationEmail } = await import('./email');

      await expect(
        sendVerificationEmail('user@example.com', 'token123')
      ).rejects.toBeDefined();
    });

    it('should handle network errors', async () => {
      const error = new Error('Network timeout');
      mockMessagesCreate.mockRejectedValueOnce(error);

      const { sendPasswordResetEmail } = await import('./email');

      await expect(
        sendPasswordResetEmail('user@example.com', 'reset123')
      ).rejects.toThrow('Network timeout');
    });

    it('should handle Mailgun API errors', async () => {
      const error = new Error('Invalid domain');
      mockMessagesCreate.mockRejectedValueOnce(error);

      const { sendInvitationEmail } = await import('./email');

      await expect(
        sendInvitationEmail('user@example.com', 'Acme Corp', 'invite123')
      ).rejects.toThrow('Invalid domain');
    });
  });

  describe('special characters and edge cases', () => {
    it('should handle email with special characters', async () => {
      mockMessagesCreate.mockResolvedValueOnce({ id: 'msg-1' });

      const { sendVerificationEmail } = await import('./email');

      await sendVerificationEmail('user+tag@example.co.uk', 'token123');

      expect(mockMessagesCreate).toHaveBeenCalledWith(
        'mail.example.com',
        expect.objectContaining({
          to: 'user+tag@example.co.uk',
        })
      );
    });

    it('should handle organization names with special characters', async () => {
      mockMessagesCreate.mockResolvedValueOnce({ id: 'msg-3' });

      const { sendInvitationEmail } = await import('./email');

      await sendInvitationEmail(
        'user@example.com',
        "Company & Co's",
        'invite123'
      );

      const callArgs = mockMessagesCreate.mock.calls[0];
      const emailContent = callArgs[1];

      expect(emailContent.subject).toContain("Company & Co's");
      expect(emailContent.html).toContain("Company & Co's");
    });

    it('should handle long tokens', async () => {
      mockMessagesCreate.mockResolvedValueOnce({ id: 'msg-1' });

      const { sendVerificationEmail } = await import('./email');

      const longToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      await sendVerificationEmail('user@example.com', longToken);

      const callArgs = mockMessagesCreate.mock.calls[0];
      const emailContent = callArgs[1];

      expect(emailContent.html).toContain(longToken);
    });

    it('should handle tokens with special URL characters', async () => {
      mockMessagesCreate.mockResolvedValueOnce({ id: 'msg-1' });

      const { sendVerificationEmail } = await import('./email');

      const tokenWithSpecialChars = 'abc-123_456.789';

      await sendVerificationEmail('user@example.com', tokenWithSpecialChars);

      const callArgs = mockMessagesCreate.mock.calls[0];
      const emailContent = callArgs[1];

      expect(emailContent.html).toContain(tokenWithSpecialChars);
    });
  });

  describe('Mailgun client initialization', () => {
    it('should initialize Mailgun client with correct API key', async () => {
      const { sendVerificationEmail } = await import('./email');

      // Trigger a call to ensure client was initialized
      mockMessagesCreate.mockResolvedValueOnce({ id: 'msg-1' });
      await sendVerificationEmail('user@example.com', 'token123');

      expect(mockClient).toHaveBeenCalledWith({
        username: 'api',
        key: 'test-api-key',
      });
    });
  });
});
