import { NextResponse } from "next/server";
import { ZodSafeParseReturnType } from "zod";

/**
 * Standardized validation error response
 * Used across all API routes for consistent error handling
 */
export function handleValidationError<T>(
  validationResult: ZodSafeParseReturnType<T, T>
): NextResponse | null {
  if (!validationResult.success) {
    const errors = validationResult.error.issues.map((err) => ({
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
  validationResult: ZodSafeParseReturnType<T, T>
): NextResponse | null {
  if (!validationResult.success) {
    return NextResponse.json(
      {
        error: "Invalid query parameters",
        details: validationResult.error.flatten(),
      },
      { status: 400 }
    );
  }

  return null;
}
