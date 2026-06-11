// proxy.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// eslint-disable-next-line
export function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/apartments/:path*",
    "/history/:path*",
    "/profile/:path*",
  ],
};
