export async function POST(request: Request) {
  try {
    const { password } = await request.json()
    const correct = process.env.OWNER_PASSWORD ?? 'council2024'
    if (password === correct) {
      return Response.json({ ok: true })
    }
    return Response.json({ ok: false }, { status: 401 })
  } catch {
    return Response.json({ ok: false }, { status: 400 })
  }
}
