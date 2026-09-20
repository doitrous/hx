import { api as realApi } from './api'
import { mockApi } from './mock'

/** VITE_MOCK=1 serves every screen from in-memory fixtures instead of the server. */
export const USING_MOCK = import.meta.env.VITE_MOCK === '1'

// mockApi is structurally identical to `api` (see mock.ts's header comment);
// the cast documents that contract rather than papering over a mismatch.
export const client: typeof realApi = USING_MOCK ? (mockApi as unknown as typeof realApi) : realApi
