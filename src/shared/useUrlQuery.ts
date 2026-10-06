"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useMemo } from "react"

/**
 * A list page's query, kept in the URL (back and reload keep the filters): parsed with the domain's parser,
 * written with its writer (defaults left out).
 */
export function useUrlQuery<T>(
  parse: (params: URLSearchParams) => T,
  write: (query: T) => URLSearchParams,
): [T, (next: T) => void] {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const search = params.toString()
  const query = useMemo(() => parse(new URLSearchParams(search)), [parse, search])
  const setQuery = useCallback(
    (next: T) => {
      const qs = write(next).toString()
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [router, pathname, write],
  )
  return [query, setQuery]
}
