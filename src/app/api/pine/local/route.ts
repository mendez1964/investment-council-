import { readdir, readFile, stat } from 'fs/promises'
import path from 'path'

const PINE_DIR = '/Users/dag/pine-scripts'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const name = searchParams.get('name')

  // Read a specific file
  if (name) {
    if (name.includes('..') || name.includes('/')) {
      return Response.json({ error: 'Invalid filename' }, { status: 400 })
    }
    try {
      const content = await readFile(path.join(PINE_DIR, name), 'utf-8')
      return Response.json({ content })
    } catch {
      return Response.json({ error: 'File not found' }, { status: 404 })
    }
  }

  // List all files
  try {
    const files = await readdir(PINE_DIR)
    const relevant = files.filter(f => f.endsWith('.txt') || f.endsWith('.pine'))
    const fileData = await Promise.all(
      relevant.map(async (fileName) => {
        const s = await stat(path.join(PINE_DIR, fileName))
        return { name: fileName, modified: s.mtime.toISOString() }
      })
    )
    return Response.json(fileData.sort((a, b) => b.modified.localeCompare(a.modified)))
  } catch {
    return Response.json({ error: 'Could not read folder' }, { status: 500 })
  }
}
