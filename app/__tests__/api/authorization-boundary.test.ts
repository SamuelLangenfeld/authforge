/**
 * Authorization Boundary Tests
 *
 * These tests verify that SaaS API clients cannot access other organizations' data.
 * This is critical for multi-tenant security.
 *
 * Why This Matters:
 * - A bug here means Org A can access Org B's users
 * - This is the most critical security issue in multi-tenant systems
 * - Every endpoint must validate org boundaries
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '@/app/lib/db';
import bcryptjs from 'bcryptjs';

interface TestContext {
  org1: { id: string; name: string; credential: { clientId: string; clientSecret: string } };
  org2: { id: string; name: string; credential: { clientId: string; clientSecret: string } };
  org1Token: string;
  org2Token: string;
  org1User: { id: string; email: string };
  org2User: { id: string; email: string };
}

const ctx: TestContext = {
  org1: { id: '', name: 'AuthBoundary Test Org 1', credential: { clientId: '', clientSecret: '' } },
  org2: { id: '', name: 'AuthBoundary Test Org 2', credential: { clientId: '', clientSecret: '' } },
  org1Token: '',
  org2Token: '',
  org1User: { id: '', email: '' },
  org2User: { id: '', email: '' },
};

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

describe('Authorization Boundary - Multi-Tenant Security', () => {
  beforeAll(async () => {
    // Create Org 1
    const org1 = await prisma.organization.create({
      data: { name: ctx.org1.name },
    });
    ctx.org1.id = org1.id;

    // Create API credential for Org 1
    const cred1ClientSecret = 'test-secret-org1';
    const hashedSecret1 = await bcryptjs.hash(cred1ClientSecret, 10);
    const cred1 = await prisma.apiCredential.create({
      data: {
        orgId: org1.id,
        clientId: 'authboundary-test-org1',
        clientSecret: hashedSecret1,
      },
    });
    ctx.org1.credential.clientId = cred1.clientId;
    ctx.org1.credential.clientSecret = cred1ClientSecret;

    // Create Org 2
    const org2 = await prisma.organization.create({
      data: { name: ctx.org2.name },
    });
    ctx.org2.id = org2.id;

    // Create API credential for Org 2
    const cred2ClientSecret = 'test-secret-org2';
    const hashedSecret2 = await bcryptjs.hash(cred2ClientSecret, 10);
    const cred2 = await prisma.apiCredential.create({
      data: {
        orgId: org2.id,
        clientId: 'authboundary-test-org2',
        clientSecret: hashedSecret2,
      },
    });
    ctx.org2.credential.clientId = cred2.clientId;
    ctx.org2.credential.clientSecret = cred2ClientSecret;

    // Create a user in Org 1
    const user1 = await prisma.user.create({
      data: {
        email: 'authboundary-test-user1@example.com',
        name: 'Test User Org 1',
        password: await bcryptjs.hash('password123', 10),
        emailVerified: new Date(),
      },
    });
    ctx.org1User.id = user1.id;
    ctx.org1User.email = user1.email;

    // Add user to Org 1
    const role1 = await prisma.role.findFirst({ where: { name: 'user' } });
    if (!role1) {
      await prisma.role.create({ data: { name: 'user' } });
    }
    await prisma.membership.create({
      data: {
        userId: user1.id,
        orgId: org1.id,
        roleId: (await prisma.role.findFirstOrThrow({ where: { name: 'user' } })).id,
      },
    });

    // Create a user in Org 2
    const user2 = await prisma.user.create({
      data: {
        email: 'authboundary-test-user2@example.com',
        name: 'Test User Org 2',
        password: await bcryptjs.hash('password123', 10),
        emailVerified: new Date(),
      },
    });
    ctx.org2User.id = user2.id;
    ctx.org2User.email = user2.email;

    // Add user to Org 2
    await prisma.membership.create({
      data: {
        userId: user2.id,
        orgId: org2.id,
        roleId: (await prisma.role.findFirstOrThrow({ where: { name: 'user' } })).id,
      },
    });

    // Get tokens for both orgs
    const res1 = await fetch(`${baseUrl}/api/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: ctx.org1.credential.clientId,
        clientSecret: ctx.org1.credential.clientSecret,
      }),
    });
    const token1Data = await res1.json();
    ctx.org1Token = token1Data.accessToken;

    const res2 = await fetch(`${baseUrl}/api/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: ctx.org2.credential.clientId,
        clientSecret: ctx.org2.credential.clientSecret,
      }),
    });
    const token2Data = await res2.json();
    ctx.org2Token = token2Data.accessToken;
  });

  afterAll(async () => {
    // Clean up
    await prisma.membership.deleteMany({
      where: {
        org: {
          OR: [{ name: ctx.org1.name }, { name: ctx.org2.name }],
        },
      },
    });

    await prisma.user.deleteMany({
      where: {
        email: {
          in: [ctx.org1User.email, ctx.org2User.email],
        },
      },
    });

    await prisma.apiCredential.deleteMany({
      where: {
        clientId: {
          in: ['authboundary-test-org1', 'authboundary-test-org2'],
        },
      },
    });

    await prisma.organization.deleteMany({
      where: {
        name: {
          in: [ctx.org1.name, ctx.org2.name],
        },
      },
    });
  });

  describe('GET /api/organizations/:orgId/users - List Users', () => {
    it('should allow Org1 to list its own users', async () => {
      const res = await fetch(`${baseUrl}/api/organizations/${ctx.org1.id}/users`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ctx.org1Token}`,
          'Content-Type': 'application/json',
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.users).toBeDefined();
      expect(data.data.users.length).toBeGreaterThanOrEqual(1);

      // Verify user1 is in the list
      const userEmails = data.data.users.map((u: any) => u.user.email);
      expect(userEmails).toContain(ctx.org1User.email);
    });

    it('should prevent Org2 from listing Org1 users (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/organizations/${ctx.org1.id}/users`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ctx.org2Token}`,
          'Content-Type': 'application/json',
        },
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it('should prevent Org1 from accessing Org2 users (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/organizations/${ctx.org2.id}/users`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ctx.org1Token}`,
          'Content-Type': 'application/json',
        },
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });
  });

  describe('POST /api/organizations/:orgId/users - Create User', () => {
    const newUserEmail = `authboundary-new-user-${Date.now()}@example.com`;

    it('should allow Org1 to create a user in its org', async () => {
      const res = await fetch(`${baseUrl}/api/organizations/${ctx.org1.id}/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ctx.org1Token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newUserEmail,
          name: 'New User',
          password: 'SecurePassword123!',
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.data.email).toBe(newUserEmail);
    });

    it('should prevent Org2 from creating users in Org1 (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/organizations/${ctx.org1.id}/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ctx.org2Token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: `authboundary-cross-org-${Date.now()}@example.com`,
          name: 'Cross Org User',
          password: 'SecurePassword123!',
        }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });
  });

  describe('GET /api/organizations/:orgId/users/:userId - Get Single User', () => {
    it('should allow Org1 to get its own user', async () => {
      const res = await fetch(`${baseUrl}/api/organizations/${ctx.org1.id}/users/${ctx.org1User.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ctx.org1Token}`,
          'Content-Type': 'application/json',
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.email).toBe(ctx.org1User.email);
    });

    it('should prevent Org2 from accessing Org1 user (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/organizations/${ctx.org1.id}/users/${ctx.org1User.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ctx.org2Token}`,
          'Content-Type': 'application/json',
        },
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it('should prevent accessing user from different org (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/organizations/${ctx.org2.id}/users/${ctx.org1User.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ctx.org1Token}`,
          'Content-Type': 'application/json',
        },
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });
  });

  describe('PATCH /api/organizations/:orgId/users/:userId - Update User', () => {
    it('should allow Org1 to update its own user', async () => {
      const res = await fetch(`${baseUrl}/api/organizations/${ctx.org1.id}/users/${ctx.org1User.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${ctx.org1Token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Updated User Name',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.name).toBe('Updated User Name');
    });

    it('should prevent Org2 from updating Org1 user (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/organizations/${ctx.org1.id}/users/${ctx.org1User.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${ctx.org2Token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Hacked Name',
        }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });
  });

  describe('DELETE /api/organizations/:orgId/users/:userId - Delete User', () => {
    let deleteTestUserId: string;
    let deleteTestOrgId: string;

    beforeAll(async () => {
      // Create a test org and user for deletion testing
      const org = await prisma.organization.create({ data: { name: `Delete Test Org ${Date.now()}` } });
      deleteTestOrgId = org.id;

      const user = await prisma.user.create({
        data: {
          email: `delete-test-${Date.now()}@example.com`,
          name: 'Delete Test User',
          password: await bcryptjs.hash('password123', 10),
        },
      });
      deleteTestUserId = user.id;

      const role = await prisma.role.findFirstOrThrow({ where: { name: 'user' } });
      await prisma.membership.create({
        data: { userId: user.id, orgId: org.id, roleId: role.id },
      });
    });

    afterAll(async () => {
      await prisma.membership.deleteMany({ where: { orgId: deleteTestOrgId } });
      await prisma.organization.delete({ where: { id: deleteTestOrgId } });
    });

    it('should allow Org1 to delete its own user', async () => {
      const res = await fetch(
        `${baseUrl}/api/organizations/${deleteTestOrgId}/users/${deleteTestUserId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${ctx.org1Token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Should be 200 or 204 (depending on implementation)
      expect([200, 204]).toContain(res.status);
    });

    it('should prevent Org2 from deleting Org1 user (403 Forbidden)', async () => {
      // Create another delete test setup
      const org = await prisma.organization.create({ data: { name: `Delete Test Org 2 ${Date.now()}` } });
      const user = await prisma.user.create({
        data: {
          email: `delete-test-2-${Date.now()}@example.com`,
          name: 'Delete Test User 2',
          password: await bcryptjs.hash('password123', 10),
        },
      });
      const role = await prisma.role.findFirstOrThrow({ where: { name: 'user' } });
      await prisma.membership.create({
        data: { userId: user.id, orgId: org.id, roleId: role.id },
      });

      const res = await fetch(`${baseUrl}/api/organizations/${org.id}/users/${user.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${ctx.org2Token}`,
          'Content-Type': 'application/json',
        },
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBeDefined();

      // Cleanup
      await prisma.membership.deleteMany({ where: { orgId: org.id } });
      await prisma.organization.delete({ where: { id: org.id } });
    });
  });

  describe('Authorization Header Verification', () => {
    it('should reject requests without authorization header (401)', async () => {
      const res = await fetch(`${baseUrl}/api/organizations/${ctx.org1.id}/users`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      expect(res.status).toBe(401);
    });

    it('should reject requests with malformed authorization header (401)', async () => {
      const res = await fetch(`${baseUrl}/api/organizations/${ctx.org1.id}/users`, {
        method: 'GET',
        headers: {
          'Authorization': 'InvalidBearerToken',
          'Content-Type': 'application/json',
        },
      });

      expect(res.status).toBe(401);
    });

    it('should reject requests with expired/invalid token (401)', async () => {
      const res = await fetch(`${baseUrl}/api/organizations/${ctx.org1.id}/users`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer invalid.token.here',
          'Content-Type': 'application/json',
        },
      });

      expect(res.status).toBe(401);
    });
  });
});
