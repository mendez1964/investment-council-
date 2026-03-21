export const revalidate = 3600 // cache 1 hour — index updates once daily

export async function GET() {
  try {
    const res = await fetch('https://api.alternative.me/fng/?limit=30', {
      next: { revalidate: 3600 },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return Response.json(data.data ?? [])
  } catch {
    return Response.json([])
  }
}
