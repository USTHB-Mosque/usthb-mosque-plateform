type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

interface RequestConfig {
  headers?: Record<string, string>
  body?: unknown
}

// Track ongoing refresh
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value: Response) => void
  reject: (error: unknown) => void
}> = []

const processQueue = (error: unknown, response: Response | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(response!)
    }
  })
  failedQueue = []
}

async function refreshToken(): Promise<{ access_token: string; refresh_token: string }> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('refresh_token')}`,
    },
  })

  if (!res.ok) throw new Error('Token refresh failed')

  return res.json()
}

async function fetchWithAuth(url: string, method: HttpMethod = 'GET', config?: RequestConfig): Promise<Response> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || ''
  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`

  const accessToken = localStorage.getItem('access_token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...config?.headers,
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  const fetchConfig: RequestInit = {
    method,
    headers,
    body: config?.body ? JSON.stringify(config.body) : undefined,
  }

  let response = await fetch(fullUrl, fetchConfig)

  if (response.status === 401 && !url.startsWith('/auth')) {
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      })
        .then(() => {
          const newToken = localStorage.getItem('access_token')
          headers.Authorization = `Bearer ${newToken}`
          return fetch(fullUrl, { ...fetchConfig, headers })
        })
        .catch((err) => {
          throw err
        })
    }

    isRefreshing = true

    try {
      const tokens = await refreshToken()
      localStorage.setItem('access_token', tokens.access_token)
      localStorage.setItem('refresh_token', tokens.refresh_token)

      processQueue(null, response)

      headers.Authorization = `Bearer ${tokens.access_token}`
      response = await fetch(fullUrl, { ...fetchConfig, headers })
      return response
    } catch (refreshError) {
      processQueue(refreshError, null)
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      window.location.href = '/auth/login'
      throw refreshError
    } finally {
      isRefreshing = false
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
