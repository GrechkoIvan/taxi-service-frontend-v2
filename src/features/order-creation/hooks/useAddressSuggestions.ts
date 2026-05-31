import { useEffect, useRef, useState } from 'react'

import { suggestAddress } from '../../../shared/lib/ymaps/ymapsServices'

const MIN_QUERY_LENGTH = 3
const DEBOUNCE_MS = 1000

export function useAddressSuggestions(queryRaw: string | null | undefined) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const requestIdRef = useRef(0)

  useEffect(() => {
    const query = (queryRaw ?? '').trim()

    if (query.length < MIN_QUERY_LENGTH) {
      setSuggestions([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    const requestId = ++requestIdRef.current

    const timeoutId = window.setTimeout(async () => {
      try {
        const items = await suggestAddress(query)
        if (requestIdRef.current !== requestId) return
        setSuggestions(items)
      } catch {
        if (requestIdRef.current !== requestId) return
        setSuggestions([])
      } finally {
        if (requestIdRef.current === requestId) {
          setIsLoading(false)
        }
      }
    }, DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [queryRaw])

  return { suggestions, isLoading }
}
