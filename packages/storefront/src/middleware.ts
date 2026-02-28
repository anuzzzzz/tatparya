import { type NextRequest, NextResponse } from 'next/server';

/**
 * Middleware — currently a pass-through.
 *
 * The /dashboard route handles its own auth state client-side:
 * - No session → shows LoginScreen (phone OTP)
 * - Has session → shows ChatShell
 *
 * Server-side auth protection can be added later for
 * API routes or sensitive pages.
 */
export async function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
