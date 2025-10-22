import { clearJwtCookie } from "@/app/lib/cookie-helpers";
import { createSuccessMessageResponse } from "@/app/lib/route-helpers";

export async function POST() {
  const response = createSuccessMessageResponse("Logged out successfully");

  // Clear the JWT cookie
  clearJwtCookie(response);

  return response;
}
