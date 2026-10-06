import { isAxiosError } from "axios"
import { ZodError } from "zod"

/** RFC 9457 problem details, as the API sends them. */
interface Problem {
  title?: string
  detail?: string
  status?: number
  errors?: unknown
}

export type ErrorCode =
  | "offline"
  | "timeout"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "too_large"
  | "invalid"
  | "rate_limited"
  | "unavailable"
  | "server"
  | "unexpected_response"
  | "unknown"

export class ApiError extends Error {
  readonly code: ErrorCode
  readonly status?: number

  constructor(code: ErrorCode, message: string, status?: number) {
    super(message)
    this.code = code
    this.status = status
  }
}

const BY_STATUS: Record<number, ErrorCode> = {
  400: "invalid",
  401: "unauthorized",
  403: "forbidden",
  404: "not_found",
  409: "conflict",
  413: "too_large",
  429: "rate_limited",
  503: "unavailable",
}

/** Any thrown value → an ApiError with a code the screens can word (and the API's own detail as message). */
export function errorCode(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (error instanceof ZodError)
    return new ApiError("unexpected_response", "The API answered in an unexpected shape")
  if (isAxiosError(error)) {
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") return new ApiError("timeout", error.message)
    const response = error.response
    if (!response) return new ApiError("offline", error.message)
    const problem = (typeof response.data === "object" && response.data ? response.data : {}) as Problem
    const code = BY_STATUS[response.status] ?? (response.status >= 500 ? "server" : "unknown")
    return new ApiError(code, problem.detail ?? problem.title ?? `HTTP ${response.status}`, response.status)
  }
  return new ApiError("unknown", error instanceof Error ? error.message : String(error))
}
