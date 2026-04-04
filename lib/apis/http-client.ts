type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

interface RequestConfig {
  headers?: Record<string, string>
  body?: unknown
}

export const httpClient = {
  get: <T>(url: string, config?: RequestConfig): Promise<T> =>
    fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers,
      },
      credentials: 'include',
    }).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      return res.json() as Promise<T>
    }),

  post: <T>(url: string, body?: unknown, config?: RequestConfig): Promise<T> =>
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    }).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      return res.json() as Promise<T>
    }),

  put: <T>(url: string, body?: unknown, config?: RequestConfig): Promise<T> =>
    fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    }).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      return res.json() as Promise<T>
    }),

  delete: <T>(url: string, config?: RequestConfig): Promise<T> =>
    fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers,
      },
      credentials: 'include',
    }).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      return res.json() as Promise<T>
    }),
}
