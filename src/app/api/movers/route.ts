import { getTopMovers } from '@/lib/alpha-vantage'

export async function GET() {
  try {
    const data = await getTopMovers()
    return Response.json(data ?? {})
  } catch {
    return Response.json({})
  }
}
