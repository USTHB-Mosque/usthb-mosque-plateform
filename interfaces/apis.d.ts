export interface BaseSearchParams {
  limit?: number
  page?: number
}
export interface ApiResponse<T> {
  message: string
  statusCode: HttpStatusCode
  data?: T
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  totalPages: number
  currentPage: number
  total: number
}
