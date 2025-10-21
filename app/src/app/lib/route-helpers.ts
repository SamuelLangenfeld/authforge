import { NextResponse } from "next/server";
import errorMessage from "./errorMessage";
export { handleValidationError, handleQueryValidationError } from "./validation-helpers";

/**
 * Standardized error response for all routes
 * Fixes the inconsistency between { success: false, message } and { error: message }
 * All error responses now use { error: message } format
 */
export function createErrorResponse(
  message: string,
  status: number = 400
): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Standardized 500 error response for unhandled exceptions
 */
export function handleRouteError(error: unknown): NextResponse {
  const message = errorMessage(error);
  return NextResponse.json(
    { error: "Internal server error", details: message },
    { status: 500 }
  );
}

/**
 * Standardized success response for consistency
 * Use this for GET responses that return data
 */
export function createSuccessResponse<T>(
  data: T,
  status: number = 200
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

/**
 * Standardized success response with message
 * Use this for create/update/delete operations
 */
export function createSuccessMessageResponse(
  message: string,
  data?: any,
  status: number = 200
): NextResponse {
  const response: any = {
    success: true,
    message,
  };

  if (data !== undefined) {
    response.data = data;
  }

  return NextResponse.json(response, { status });
}

/**
 * Standardized unauthorized error (401)
 */
export function createUnauthorizedError(
  message: string = "Unauthorized"
): NextResponse {
  return createErrorResponse(message, 401);
}

/**
 * Standardized forbidden error (403)
 */
export function createForbiddenError(
  message: string = "Forbidden"
): NextResponse {
  return createErrorResponse(message, 403);
}

/**
 * Standardized not found error (404)
 */
export function createNotFoundError(
  message: string = "Not found"
): NextResponse {
  return createErrorResponse(message, 404);
}

/**
 * Standardized conflict error (409)
 */
export function createConflictError(
  message: string = "Resource already exists"
): NextResponse {
  return createErrorResponse(message, 409);
}
