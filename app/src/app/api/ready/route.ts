/**
 * Readiness Check Endpoint
 *
 * This endpoint is used by container orchestrators to verify that the application
 * is ready to serve traffic. Unlike the liveness probe, this checks for resource
 * availability and initialization completion.
 *
 * Returns 200 when the app is ready to accept requests
 * Returns 503 when the app is starting up or degraded
 *
 * Used by: Kubernetes readinessProbe
 */

import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';

/**
 * GET /api/ready
 *
 * Readiness probe - checks if the app is ready to serve traffic
 * Verifies:
 * - Database connectivity
 * - Required environment variables
 * - Prisma client initialization
 */
export async function GET() {
  try {
    // Check database connectivity
    const dbCheck = await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database timeout')), 5000)
      ),
    ]);

    // Check required environment variables
    const requiredEnvVars = [
      'JWT_SECRET',
      'DATABASE_URL',
      'HOST_URL',
      'MAILGUN_API_KEY',
      'MAILGUN_DOMAIN',
      'FROM_EMAIL',
    ];

    const missingEnvVars = requiredEnvVars.filter(
      (envVar) => !process.env[envVar]
    );

    if (missingEnvVars.length > 0) {
      throw new Error(`Missing environment variables: ${missingEnvVars.join(', ')}`);
    }

    return NextResponse.json(
      {
        status: 'ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: 'ok',
          environment: 'ok',
          version: process.env.npm_package_version || 'unknown',
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Readiness check failed:', error);

    return NextResponse.json(
      {
        status: 'not_ready',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
