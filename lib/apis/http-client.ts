type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

interface RequestConfig {
  headers?: Record<string, string>
  body?: unknown
  useAuth?: boolean
}

async function fetchWithAuth(url: string, method: HttpMethod = 'GET', config?: RequestConfig): Promise<Response> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || ''
  const fullUrl = url.startsWith('http') ? url : `${baseUrl}/api${url.startsWith('/') ? url : `/${url}`}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...config?.headers,
  }

  const fetchConfig: RequestInit = {
    method,
    headers,
    credentials: 'include',
    body: config?.body ? JSON.stringify(config.body) : undefined,
  }

  const response = await fetch(fullUrl, fetchConfig)

  if (response.status === 401 && config?.useAuth === true) {
    const currentUrl = window.location.pathname
    if (!currentUrl.startsWith('/auth')) {
      window.location.href = '/auth/login?redirect=' + encodeURIComponent(currentUrl)
    }
  }

  return response
}

export const httpClient = {
  get: <T>(url: string, config?: RequestConfig): Promise<T> =>
    fetchWithAuth(url, 'GET', config).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      return res.json() as Promise<T>
    }),

  post: <T>(url: string, body?: unknown, config?: RequestConfig): Promise<T> =>
    fetchWithAuth(url, 'POST', { ...config, body }).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      return res.json() as Promise<T>
    }),

  put: <T>(url: string, body?: unknown, config?: RequestConfig): Promise<T> =>
    fetchWithAuth(url, 'PUT', { ...config, body }).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      return res.json() as Promise<T>
    }),

  delete: <T>(url: string, config?: RequestConfig): Promise<T> =>
    fetchWithAuth(url, 'DELETE', config).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      return res.json() as Promise<T>
    }),
}
