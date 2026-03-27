import axios, { AxiosError } from 'axios'

export const httpClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
})

const refreshHttpClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
})

// Track ongoing refresh
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value: string) => void
  reject: (error: unknown) => void
}> = []

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token!)
    }
  })
  failedQueue = []
}

httpClient.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('access_token')
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
    return config
  },
  (error) => {
    console.error('❌ [API REQUEST ERROR]', error)
    return Promise.reject(error)
  },
)

httpClient.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const originalRequest = err.config

    if (!originalRequest) return Promise.reject(err)

    if (err.response?.status === 401 && !err.config?.url?.startsWith('/auth')) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return httpClient(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      isRefreshing = true

      try {
        const response = await refreshHttpClient.post(
          '/auth/refresh',
          {},
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('refresh_token')}`,
            },
          },
        )

        const { access_token, refresh_token } = response.data
        localStorage.setItem('access_token', access_token)
        localStorage.setItem('refresh_token', refresh_token)

        // Process all queued requests with new token
        processQueue(null, access_token)

        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${access_token}`
        return httpClient(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)

        if (refreshError instanceof AxiosError && refreshError.config?.url === '/auth/refresh') {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          // Optional: redirect to login
          window.location.href = '/login'
        }
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(err)
  },
)
