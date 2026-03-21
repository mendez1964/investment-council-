import { getIPOCalendar } from '@/lib/finnhub'

export const revalidate = 3600

export async function GET() {
  try {
    const events = await getIPOCalendar(90)
    return Response.json(events)
  } catch {
    return Response.json([])
  }
}
