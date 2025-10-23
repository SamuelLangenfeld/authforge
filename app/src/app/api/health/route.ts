/**
 * Health Check Endpoint
 *
 * This endpoint is used by container orchestrators (Docker, Kubernetes) to verify
 * that the application is running and healthy.
 *
 * Liveness Probe (is the process alive?): GET /api/health
 * Readiness Probe (is the app ready to serve traffic?): GET /api/ready
 */

import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';

/**
 * GET /api/health
 *
 * Liveness probe - checks if the process is still running
 * Returns 200 if the app is responsive, 503 if there are issues
 *
 * Used by: Docker HEALTHCHECK, Kubernetes livenessProbe
 */
export async function GET() {
  try {
    // Try to connect to database
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
          used: process.memoryUsage().heapUsed,
          total: process.memoryUsage().heapTotal,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Health check failed:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
