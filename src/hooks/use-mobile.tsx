import * as React from "react"
import { MOBILE_BREAKPOINT } from "@/lib/constants"

export function useIsMobile() {
  // 1. Initialize state directly to prevent a double-render flash on mount
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches
  })

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    // 2. Read directly from the event match property instead of checking window.innerWidth
    const onChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches)
    }
    
    mql.addEventListener("change", onChange)
    
    // Sync initial state accurately
    setIsMobile(mql.matches)
    
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}
