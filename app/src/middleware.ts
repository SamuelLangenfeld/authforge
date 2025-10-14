import { NextResponse, NextRequest } from "next/server";
import { verifyToken } from "./app/lib/jwt";

const publicRoutes = [
  "/api/auth/token",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
];

const clientRoutes = ["/dashboard", "/api/organizations"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    publicRoutes.some((route) => {
      return pathname.startsWith(route);
    })
  ) {
    return NextResponse.next();
  }
  let token: string | undefined = "";

  // client-side routes are authorized with JWT cookies
  if (clientRoutes.some((route) => pathname.startsWith(route))) {
    token = request.cookies.get("jwt")?.value;
    if (!token) {
      if (pathname.startsWith("/api")) {
        return NextResponse.json(
          { error: "Unauthorized - No JWT" },
          { status: 401 }
        );
      }
      return NextResponse.redirect(`${process.env.HOST_URL}`);
    }
    try {
      const tokenData = (await verifyToken(token)) as any;
      const { userId } = tokenData;
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-user-id", userId);
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (e) {
      if (pathname.startsWith("/api")) {
        return NextResponse.json(
          { error: "Unauthorized - Invalid JWT" },
          { status: 401 }
        );
      }
      return NextResponse.redirect(`${process.env.HOST_URL}`);
    }
  }

  // other /api routes are for SaaS apps
  if (pathname.startsWith("/api")) {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
      const tokenData = await verifyToken(token);
      const { orgId } = tokenData as any;
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-org-id", orgId);
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
