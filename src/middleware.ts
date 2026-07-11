import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });

  const isHospital = pathname.startsWith("/hospital");
  const isPatient = pathname.startsWith("/patient");

  if ((isHospital || isPatient) && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isHospital && token?.role !== "hospital") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isPatient && token?.role !== "patient") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname === "/login" && token) {
    const dest = token.role === "hospital" ? "/hospital" : "/patient";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/hospital/:path*", "/patient/:path*", "/login"],
};
