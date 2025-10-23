/**
 * Graceful Shutdown Handler
 *
 * This module handles graceful shutdown of the application when receiving
 * termination signals (SIGTERM, SIGINT). This is crucial for:
 * - Finishing in-flight requests before shutting down
 * - Closing database connections properly
 * - Allowing Kubernetes/Docker to drain connections
 *
 * Usage: Call setupGracefulShutdown() at application startup
 */

import prisma from './db';

/**
 * Track active requests to prevent shutdown during processing
 */
let activeRequests = 0;

/**
 * Get the current number of active requests
 */
export function getActiveRequests(): number {
  return activeRequests;
}

/**
 * Increment active request counter
 */
export function incrementActiveRequests(): void {
  activeRequests++;
}

/**
 * Decrement active request counter
 */
export function decrementActiveRequests(): void {
  activeRequests = Math.max(0, activeRequests - 1);
}

/**
 * Setup graceful shutdown handlers
 *
 * This function should be called once at application startup.
 * It registers signal handlers for SIGTERM and SIGINT to allow
 * the application to shut down gracefully.
 *
 * Process:
 * 1. Stop accepting new requests
 * 2. Wait for active requests to complete (up to timeout)
 * 3. Close database connections
 * 4. Exit process
 */
export function setupGracefulShutdown(): void {
  let isShuttingDown = false;

  const gracefulShutdown = async (signal: string) => {
    // Prevent multiple shutdown sequences
    if (isShuttingDown) {
      console.log(`[${signal}] Shutdown already in progress, forcing exit...`);
      process.exit(1);
    }

    isShuttingDown = true;
    console.log(`[${signal}] Received shutdown signal, starting graceful shutdown...`);

    // Grace period for active requests (30 seconds)
    const SHUTDOWN_TIMEOUT = 30000;
    const shutdownStartTime = Date.now();

    // Give requests time to finish
    const checkActiveRequests = setInterval(() => {
      const elapsed = Date.now() - shutdownStartTime;
      const active = getActiveRequests();

      if (active === 0) {
        clearInterval(checkActiveRequests);
        closeConnections();
      } else if (elapsed > SHUTDOWN_TIMEOUT) {
        console.warn(
          `[${signal}] Shutdown timeout exceeded (${SHUTDOWN_TIMEOUT}ms). ` +
          `${active} active request(s) still in progress. Force closing.`
        );
        clearInterval(checkActiveRequests);
        closeConnections();
      } else {
        console.log(
          `[${signal}] Waiting for ${active} active request(s) to finish... ` +
          `(${elapsed}ms elapsed)`
        );
      }
    }, 1000);

    // Timeout to force shutdown if requests don't finish
    setTimeout(() => {
      if (isShuttingDown) {
        console.error(`[${signal}] Force closing after timeout`);
        closeConnections();
      }
    }, SHUTDOWN_TIMEOUT);
  };

  const closeConnections = async () => {
    console.log('Closing database connections...');
    try {
      await prisma.$disconnect();
      console.log('Database connections closed successfully');
    } catch (error) {
      console.error('Error closing database connections:', error);
    }

    console.log('Shutdown complete, exiting process');
    process.exit(isShuttingDown ? 0 : 1);
  };

  // Handle SIGTERM (sent by Docker/Kubernetes on container stop)
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  // Handle SIGINT (sent by Ctrl+C in terminal)
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    gracefulShutdown('uncaughtException').then(() => process.exit(1));
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection').then(() => process.exit(1));
  });

  console.log('[Startup] Graceful shutdown handlers registered');
  console.log('[Startup] SIGTERM/SIGINT will trigger graceful shutdown');
  console.log(`[Startup] Shutdown timeout: 30 seconds`);
}
