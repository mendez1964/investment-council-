import { getEarningsCalendar } from '@/lib/finnhub'

export async function GET() {
  try {
    const events = await getEarningsCalendar(60)
    return Response.json(events)
  } catch {
    return Response.json([])
  }
}
