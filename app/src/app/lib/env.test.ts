/**
 * Environment Configuration Tests
 *
 * Tests for environment variable validation and configuration.
 * Tests verify that the env module properly validates required environment variables
 * and throws errors when they are missing.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Environment Variables', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  const setupEnv = (overrides: Record<string, string | undefined> = {}) => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.DATABASE_URL = 'postgresql://localhost/testdb';
    process.env.HOST_URL = 'http://localhost:3000';
    process.env.MAILGUN_API_KEY = 'test-key';
    process.env.MAILGUN_DOMAIN = 'test.mailgun.org';
    process.env.FROM_EMAIL = 'test@example.com';

    Object.entries(overrides).forEach(([key, value]) => {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
  };

  describe('required environment variables validation', () => {
    it('should throw error when JWT_SECRET is missing', async () => {
      setupEnv({ JWT_SECRET: undefined });

      await expect(import('./env')).rejects.toThrow(
        'Missing required environment variable: JWT_SECRET'
      );
    });

    it('should throw error when DATABASE_URL is missing', async () => {
      setupEnv({ DATABASE_URL: undefined });

      await expect(import('./env')).rejects.toThrow(
        'Missing required environment variable: DATABASE_URL'
      );
    });

    it('should throw error when HOST_URL is missing', async () => {
      setupEnv({ HOST_URL: undefined });

      await expect(import('./env')).rejects.toThrow(
        'Missing required environment variable: HOST_URL'
      );
    });

    it('should throw error when MAILGUN_API_KEY is missing', async () => {
      setupEnv({ MAILGUN_API_KEY: undefined });

      await expect(import('./env')).rejects.toThrow(
        'Missing required environment variable: MAILGUN_API_KEY'
      );
    });

    it('should throw error when MAILGUN_DOMAIN is missing', async () => {
      setupEnv({ MAILGUN_DOMAIN: undefined });

      await expect(import('./env')).rejects.toThrow(
        'Missing required environment variable: MAILGUN_DOMAIN'
      );
    });

    it('should throw error when FROM_EMAIL is missing', async () => {
      setupEnv({ FROM_EMAIL: undefined });

      await expect(import('./env')).rejects.toThrow(
        'Missing required environment variable: FROM_EMAIL'
      );
    });

    it('should not throw when all required variables are present', async () => {
      setupEnv();

      await expect(import('./env')).resolves.toBeDefined();
    });
  });

  describe('HOST_URL format validation', () => {
    it('should reject HOST_URL without http:// or https://', async () => {
      setupEnv({ HOST_URL: 'localhost:3000' });

      await expect(import('./env')).rejects.toThrow(
        'HOST_URL must be a valid absolute URL'
      );
    });

    it('should reject ftp:// URLs', async () => {
      setupEnv({ HOST_URL: 'ftp://example.com' });

      await expect(import('./env')).rejects.toThrow(
        'HOST_URL must be a valid absolute URL'
      );
    });

    it('should reject empty protocol URLs', async () => {
      setupEnv({ HOST_URL: 'http://' });

      await expect(import('./env')).rejects.toThrow(
        'HOST_URL must be a valid absolute URL'
      );
    });

    it('should accept valid http:// URLs', async () => {
      setupEnv({ HOST_URL: 'http://localhost:3000' });

      await expect(import('./env')).resolves.toBeDefined();
    });

    it('should accept valid https:// URLs', async () => {
      setupEnv({ HOST_URL: 'https://example.com' });

      await expect(import('./env')).resolves.toBeDefined();
    });

    it('should accept URLs with ports', async () => {
      setupEnv({ HOST_URL: 'https://example.com:8443' });

      await expect(import('./env')).resolves.toBeDefined();
    });

    it('should accept URLs with paths', async () => {
      setupEnv({ HOST_URL: 'https://example.com/api' });

      await expect(import('./env')).resolves.toBeDefined();
    });
  });

  describe('environment configuration', () => {
    it('should export NODE_ENV', async () => {
      setupEnv();
      const envModule = await import('./env');
      const env = envModule.default;

      expect(env).toHaveProperty('NODE_ENV');
      expect(['development', 'production', 'test']).toContain(env.NODE_ENV);
    });

    it('should export all required variables', async () => {
      setupEnv();
      const envModule = await import('./env');
      const env = envModule.default;

      expect(env).toHaveProperty('JWT_SECRET');
      expect(env).toHaveProperty('DATABASE_URL');
      expect(env).toHaveProperty('HOST_URL');
      expect(env).toHaveProperty('MAILGUN_API_KEY');
      expect(env).toHaveProperty('MAILGUN_DOMAIN');
      expect(env).toHaveProperty('FROM_EMAIL');
    });

    it('should export ALLOWED_ORIGINS (optional)', async () => {
      setupEnv();
      const envModule = await import('./env');
      const env = envModule.default;

      expect(env).toHaveProperty('ALLOWED_ORIGINS');
      expect(typeof env.ALLOWED_ORIGINS).toBe('string');
    });

    it('should default to empty string for ALLOWED_ORIGINS if not set', async () => {
      setupEnv({ ALLOWED_ORIGINS: undefined });
      const envModule = await import('./env');
      const env = envModule.default;

      expect(env.ALLOWED_ORIGINS).toBe('');
    });

    it('should preserve ALLOWED_ORIGINS if set', async () => {
      setupEnv({
        ALLOWED_ORIGINS: 'http://localhost:3001,https://example.com',
      });
      const envModule = await import('./env');
      const env = envModule.default;

      expect(env.ALLOWED_ORIGINS).toBe(
        'http://localhost:3001,https://example.com'
      );
    });

    it('should have correct values for exported variables', async () => {
      setupEnv({
        JWT_SECRET: 'my-secret',
        DATABASE_URL: 'postgresql://localhost/mydb',
        HOST_URL: 'https://auth.example.com',
        MAILGUN_API_KEY: 'my-key',
        MAILGUN_DOMAIN: 'mail.example.com',
        FROM_EMAIL: 'noreply@example.com',
      });
      const envModule = await import('./env');
      const env = envModule.default;

      expect(env.JWT_SECRET).toBe('my-secret');
      expect(env.DATABASE_URL).toBe('postgresql://localhost/mydb');
      expect(env.HOST_URL).toBe('https://auth.example.com');
      expect(env.MAILGUN_API_KEY).toBe('my-key');
      expect(env.MAILGUN_DOMAIN).toBe('mail.example.com');
      expect(env.FROM_EMAIL).toBe('noreply@example.com');
    });
  });
});
