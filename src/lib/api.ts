// API route helpers — shared types
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
}

export function ok<T>(data: T): Response {
  return Response.json({ data } satisfies ApiResponse<T>)
}

export function err(message: string, status = 400): Response {
  return Response.json({ error: message } satisfies ApiResponse, { status })
}
