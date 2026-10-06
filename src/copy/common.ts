import { type ErrorCode } from "@/api/errors"

export const APP = {
  name: "GlotCast",
  area: "Admin",
}

export const COMMON = {
  retry: "Try again",
  refresh: "Refresh",
  loadMore: "Load more",
  previous: "Previous",
  next: "Next",
  range: (from: number, to: number, total: number) => `${from}–${to} of ${total}`,
  copy: "Copy",
  copied: "Copied",
  copyFailed: "Couldn't copy",
  loadFailed: "Couldn't load",
  never: "Never",
  none: "None",
  yes: "Yes",
  no: "No",
  save: "Save",
  saving: "Saving…",
  saved: "Saved",
  create: "Create",
  cancel: "Cancel",
  delete: "Delete",
  remove: "Remove",
  edit: "Edit",
  open: "Open",
  discard: "Discard changes",
  close: "Close",
  undo: "Undo",
  clear: "Clear",
  optional: "optional",
  unsaved: "Unsaved changes",
  leaveWarning: "You have unsaved changes. Leave anyway?",
  clearFilters: "Clear filters",
  theme: { light: "Light", dark: "Dark", system: "System", label: "Theme" },
}

/** What an API failure means for the admin, by code. */
export const ERRORS: Record<ErrorCode, string> = {
  offline: "The API can't be reached. Is it running?",
  timeout: "The API took too long to answer.",
  unauthorized: "Your session ended. Sign in again.",
  forbidden: "This account isn't an admin.",
  not_found: "Not found — it may have been deleted.",
  conflict: "That clashes with something that already exists.",
  too_large: "That is too large for the API.",
  invalid: "The API refused the request.",
  rate_limited: "Too many requests — wait a moment.",
  unavailable: "The API can't do this right now (a service it needs isn't configured).",
  server: "The API had a problem answering.",
  unexpected_response: "The API answered in an unexpected shape (run npm run gen:schemas?).",
  unknown: "Something went wrong.",
}
