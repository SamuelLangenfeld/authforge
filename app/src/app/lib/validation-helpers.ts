import { NextResponse } from "next/server";
import { ZodSafeParseResult } from "zod";

/**
 * Standardized validation error response
 * Used across all API routes for consistent error handling
 */
export function handleValidationError<T>(
  validationResult: ZodSafeParseResult<T>
): NextResponse | null {
  if (!validationResult.success) {
    const errors = validationResult.error.issues.map((err: any) => ({
      field: err.path.join("."),
      message: err.message,
    }));

    return NextResponse.json(
      {
        success: false,
        message: "Validation failed",
        errors,
      },
      { status: 400 }
    );
  }

  return null;
}

/**
 * Standardized validation error response for query parameters
 * Provides more detail about invalid query params
 */
export function handleQueryValidationError<T>(
  validationResult: ZodSafeParseResult<T>
): NextResponse | null {
  if (!validationResult.success) {
    const errors = validationResult.error.issues.map((err: any) => ({
      field: err.path.join("."),
      message: err.message,
    }));

    return NextResponse.json(
      {
        error: "Invalid query parameters",
        errors,
      },
      { status: 400 }
    );
  }

  return null;
}
