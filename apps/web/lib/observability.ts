import { NextResponse } from "next/server";

export const REQUEST_ID_HEADER = "x-request-id";
const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;

export interface RequestLogFields {
  requestId?: string;
  method?: string;
  route?: string;
  status?: number;
  code?: string;
  scope?: string;
  errorName?: string;
}

export function getRequestId(request: Request): string {
  const supplied = request.headers.get(REQUEST_ID_HEADER)?.trim();
  return supplied && REQUEST_ID_PATTERN.test(supplied) ? supplied : crypto.randomUUID();
}

export function withRequestId(response: NextResponse, request: Request, requestId = getRequestId(request)): NextResponse {
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

export function requestLogFields(request: Request): Pick<RequestLogFields, "requestId" | "method" | "route"> {
  return {
    requestId: getRequestId(request),
    method: request.method.slice(0, 16),
    route: new URL(request.url).pathname.slice(0, 300),
  };
}

export function logEvent(level: "info" | "warn" | "error", event: string, fields: RequestLogFields = {}): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event: event.slice(0, 100),
    ...Object.fromEntries(Object.entries(fields)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, typeof value === "string" ? value.slice(0, 300) : value])),
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}
