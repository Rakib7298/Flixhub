import { NextRequest, NextResponse } from "next/server";
import { getRequestId, REQUEST_ID_HEADER } from "@/lib/observability";

export function middleware(request: NextRequest) {
  const requestId = getRequestId(request);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUEST_ID_HEADER, requestId);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

export const config = { matcher: ["/api/:path*"] };
