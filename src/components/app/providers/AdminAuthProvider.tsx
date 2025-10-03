import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

type AuthorizedFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const API_BASE_PATH = "/api"
const ABSOLUTE_URL_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:/

type AdminAuthContextValue = {
  adminKey: string
  hasAdminAccess: boolean
  initialized: boolean
  setAdminKey: (value: string) => void
  clearAdminKey: () => void
  authorizedFetch: AuthorizedFetch
  authorizedApiFetch: AuthorizedFetch
}

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined)

const STORAGE_KEY = "personabench.adminKey"

function readStoredKey(): string {
  if (typeof window === "undefined") {
    return ""
  }
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return value ? value.trim() : ""
  } catch {
    return ""
  }
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [adminKey, setAdminKeyState] = useState<string>("")
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    const stored = readStoredKey()
    if (stored) {
      setAdminKeyState(stored)
    }
    setInitialized(true)
  }, [])

  const persistKey = useCallback((value: string) => {
    if (typeof window === "undefined") {
      return
    }
    try {
      if (value) {
        window.localStorage.setItem(STORAGE_KEY, value)
      } else {
        window.localStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      // Ignore storage errors (private mode, quota, etc.)
    }
  }, [])

  const setAdminKey = useCallback(
    (value: string) => {
      const trimmed = value.trim()
      setAdminKeyState(trimmed)
      persistKey(trimmed)
    },
    [persistKey]
  )

  const clearAdminKey = useCallback(() => {
    setAdminKeyState("")
    persistKey("")
  }, [persistKey])

  const authorizedFetch = useCallback<AuthorizedFetch>(
    (input, init) => {
      const headers = new Headers(init?.headers ?? undefined)
      if (adminKey) {
        headers.set("X-Admin-Key", adminKey)
      }

      const config: RequestInit = {
        ...init,
        headers,
      }

      return fetch(input, config)
    },
    [adminKey]
  )

  const resolveApiPath = useCallback((path: string): string => {
    if (!path) {
      return API_BASE_PATH
    }
    if (ABSOLUTE_URL_PATTERN.test(path) || path.startsWith("//")) {
      return path
    }
    if (path.startsWith(API_BASE_PATH)) {
      return path
    }
    const normalized = path.startsWith("/") ? path.slice(1) : path
    return `${API_BASE_PATH}/${normalized}`.replace(/\/{2,}/g, "/")
  }, [])

  const authorizedApiFetch = useCallback<AuthorizedFetch>(
    (input, init) => {
      if (typeof input === "string") {
        return authorizedFetch(resolveApiPath(input), init)
      }
      if (input instanceof URL) {
        const href = input.href
        if (href && (ABSOLUTE_URL_PATTERN.test(href) || href.startsWith("//"))) {
          return authorizedFetch(input, init)
        }
        const resolved = resolveApiPath(`${input.pathname}${input.search}${input.hash}`)
        return authorizedFetch(resolved, init)
      }
      return authorizedFetch(input, init)
    },
    [authorizedFetch, resolveApiPath]
  )

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      adminKey,
      hasAdminAccess: Boolean(adminKey),
      initialized,
      setAdminKey,
      clearAdminKey,
      authorizedFetch,
      authorizedApiFetch,
    }),
    [adminKey, authorizedApiFetch, authorizedFetch, clearAdminKey, initialized, setAdminKey]
  )

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

export function useAdminAuth(): AdminAuthContextValue {
  const context = useContext(AdminAuthContext)
  if (!context) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider")
  }
  return context
}
