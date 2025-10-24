/**
 * Environment Configuration Tests
 *
 * Tests for environment variable validation and configuration
 */

import { describe, it, expect } from 'vitest';

// Note: env.ts is already imported when this test module loads
// and validates environment variables at module load time.
// The current environment should have all required variables set for tests to run.

import env from './env';

describe('Environment Variables', () => {
  describe('exported environment object', () => {
    it('should have JWT_SECRET property', () => {
      expect(env).toHaveProperty('JWT_SECRET');
      expect(typeof env.JWT_SECRET).toBe('string');
      expect(env.JWT_SECRET.length).toBeGreaterThan(0);
    });

    it('should have DATABASE_URL property', () => {
      expect(env).toHaveProperty('DATABASE_URL');
      expect(typeof env.DATABASE_URL).toBe('string');
      expect(env.DATABASE_URL.length).toBeGreaterThan(0);
    });

    it('should have HOST_URL property', () => {
      expect(env).toHaveProperty('HOST_URL');
      expect(typeof env.HOST_URL).toBe('string');
    });

    it('should have MAILGUN_API_KEY property', () => {
      expect(env).toHaveProperty('MAILGUN_API_KEY');
      expect(typeof env.MAILGUN_API_KEY).toBe('string');
      expect(env.MAILGUN_API_KEY.length).toBeGreaterThan(0);
    });

    it('should have MAILGUN_DOMAIN property', () => {
      expect(env).toHaveProperty('MAILGUN_DOMAIN');
      expect(typeof env.MAILGUN_DOMAIN).toBe('string');
      expect(env.MAILGUN_DOMAIN.length).toBeGreaterThan(0);
    });

    it('should have FROM_EMAIL property', () => {
      expect(env).toHaveProperty('FROM_EMAIL');
      expect(typeof env.FROM_EMAIL).toBe('string');
      expect(env.FROM_EMAIL.length).toBeGreaterThan(0);
    });

    it('should have ALLOWED_ORIGINS property', () => {
      expect(env).toHaveProperty('ALLOWED_ORIGINS');
      expect(typeof env.ALLOWED_ORIGINS).toBe('string');
    });

    it('should have NODE_ENV property', () => {
      expect(env).toHaveProperty('NODE_ENV');
      expect(typeof env.NODE_ENV).toBe('string');
      expect(['development', 'production', 'test']).toContain(env.NODE_ENV);
    });
  });

  describe('HOST_URL format validation', () => {
    it('should have valid HOST_URL format', () => {
      expect(env.HOST_URL).toMatch(/^https?:\/\/.+/);
    });

    it('should start with http:// or https://', () => {
      const isHttps = env.HOST_URL.startsWith('https://');
      const isHttp = env.HOST_URL.startsWith('http://');
      expect(isHttps || isHttp).toBe(true);
    });

    it('should have non-empty domain', () => {
      const withoutProtocol = env.HOST_URL.replace(/^https?:\/\//, '');
      expect(withoutProtocol.length).toBeGreaterThan(0);
    });
  });

  describe('environment configuration characteristics', () => {
    it('should be readonly type at compile time', () => {
      // as const ensures the type is readonly at TypeScript level
      // The object itself is just a plain object at runtime
      expect(env).toBeDefined();
      // Attempting to modify won't throw at runtime in non-strict mode
      // but TypeScript prevents it at compile time
    });

    it('all required properties should be non-empty strings', () => {
      const requiredProps: Array<keyof typeof env> = [
        'JWT_SECRET',
        'DATABASE_URL',
        'HOST_URL',
        'MAILGUN_API_KEY',
        'MAILGUN_DOMAIN',
        'FROM_EMAIL',
      ];

      for (const prop of requiredProps) {
        const value = env[prop];
        expect(typeof value).toBe('string');
        expect(value).not.toBe('');
      }
    });

    it('should have consistent NODE_ENV value', () => {
      // NODE_ENV in test environment should be one of these
      expect(['development', 'production', 'test']).toContain(env.NODE_ENV);
    });
  });

  describe('optional properties', () => {
    it('ALLOWED_ORIGINS can be empty string', () => {
      expect(typeof env.ALLOWED_ORIGINS).toBe('string');
      // It's optional, so it can be empty or have comma-separated values
    });

    it('ALLOWED_ORIGINS if present should contain valid origins', () => {
      if (env.ALLOWED_ORIGINS) {
        // If it has content, each origin should be a valid URL
        const origins = env.ALLOWED_ORIGINS.split(',');
        for (const origin of origins) {
          const trimmed = origin.trim();
          expect(trimmed).toMatch(/^https?:\/\//);
        }
      }
    });
  });
});
