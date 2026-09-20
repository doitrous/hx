import type {
  AnalyzeRequest,
  AnalyzeResponse,
  Bundles,
  DashboardStats,
  Doctor,
  Encounter,
  Patient,
} from './types'

/** Thrown by every client call on a non-2xx response. */
export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    ...init,
  })
  if (!res.ok) {
    let message = res.statusText
    try {
      const body = (await res.json()) as { error?: string }
      if (body?.error) message = body.error
    } catch {
      /* body wasn't JSON — keep statusText */
    }
    throw new ApiError(res.status, message)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

const get = <T>(path: string) => request<T>(path)
const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) })
const patch = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'PATCH', body: body === undefined ? undefined : JSON.stringify(body) })
const put = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'PUT', body: body === undefined ? undefined : JSON.stringify(body) })

/** Typed client for every route in docs/CONTRACT.md. Errors throw ApiError. */
export const api = {
  auth: {
    signup: (body: { email: string; password: string; name: string }) =>
      post<Doctor>('/auth/signup', body),
    login: (body: { email: string; password: string }) => post<Doctor>('/auth/login', body),
    logout: () => post<void>('/auth/logout'),
  },
  me: () => get<Doctor>('/me'),

  patients: {
    list: (q?: string) => get<Patient[]>(`/patients${q ? `?q=${encodeURIComponent(q)}` : ''}`),
    create: (body: { mrn: string; name?: string; sex?: 'M' | 'F'; birthYear?: number }) =>
      post<Patient>('/patients', body),
    get: (id: string) => get<Patient>(`/patients/${id}`),
    update: (id: string, body: Partial<{ name: string; sex: 'M' | 'F'; birthYear: number }>) =>
      patch<Patient>(`/patients/${id}`, body),
    encounters: (id: string) => get<Encounter[]>(`/patients/${id}/encounters`),
    createEncounter: (id: string, body: { mode: 'clinical' | 'operative'; title?: string }) =>
      post<Encounter>(`/patients/${id}/encounters`, body),
  },

  encounters: {
    get: (id: string) => get<Encounter>(`/encounters/${id}`),
    save: (id: string, body: Pick<Encounter, 'text' | 'sheet'>) =>
      put<Encounter>(`/encounters/${id}`, body),
    finalize: (id: string) => post<Encounter>(`/encounters/${id}/finalize`),
  },

  bundles: () => get<Bundles>('/bundles'),
  dashboardStats: () => get<DashboardStats>('/stats/dashboard'),

  analyze: (body: AnalyzeRequest) => post<AnalyzeResponse>('/analyze', body),
  demoAnalyze: (body: AnalyzeRequest) => post<AnalyzeResponse>('/demo/analyze', body),
}

export type Api = typeof api
