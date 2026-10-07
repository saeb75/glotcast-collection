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
  /** A validation 400: the API's message per failed field ("streakSaver.time" → "must be outside …"). */
  readonly fields: Record<string, string>

  constructor(code: ErrorCode, message: string, status?: number, fields: Record<string, string> = {}) {
    super(message)
    this.code = code
    this.status = status
    this.fields = fields
  }
}

/** The `errors` of a validation problem (zod issues: `path` and `message`) by dotted path, first one each. */
function issueFields(errors: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  if (!Array.isArray(errors)) return out
  for (const issue of errors as { path?: unknown; message?: unknown }[]) {
    if (!issue || !Array.isArray(issue.path) || typeof issue.message !== "string") continue
    const key = issue.path.map(String).join(".")
    if (key && !(key in out)) out[key] = issue.message
  }
  return out
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
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT")
      return new ApiError("timeout", error.message)
    const response = error.response
    if (!response) return new ApiError("offline", error.message)
    const problem = (typeof response.data === "object" && response.data ? response.data : {}) as Problem
    const code = BY_STATUS[response.status] ?? (response.status >= 500 ? "server" : "unknown")
    return new ApiError(
      code,
      problem.detail ?? problem.title ?? `HTTP ${response.status}`,
      response.status,
      issueFields(problem.errors),
    )
  }
  return new ApiError("unknown", error instanceof Error ? error.message : String(error))
}
