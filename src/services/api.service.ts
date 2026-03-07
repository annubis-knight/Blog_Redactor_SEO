/** Fetch wrapper for the backend API — GET */
export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const message = body?.error?.message ?? `Erreur HTTP ${res.status}`
    throw new Error(message)
  }
  const json = await res.json()
  return json.data as T
}

/** Fetch wrapper for the backend API — POST */
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const json = await res.json().catch(() => null)
    const message = json?.error?.message ?? `Erreur HTTP ${res.status}`
    throw new Error(message)
  }
  const json = await res.json()
  return json.data as T
}

/** Fetch wrapper for the backend API — PUT */
export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const json = await res.json().catch(() => null)
    const message = json?.error?.message ?? `Erreur HTTP ${res.status}`
    throw new Error(message)
  }
  const json = await res.json()
  return json.data as T
}
