import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import { Note, NoteFolder } from '@/lib/models'
import { ensureDefaultNoteFolder } from '@/lib/notes'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectToDatabase()
    await ensureDefaultNoteFolder(session.id)

    const folders = await NoteFolder.find({ ownerId: session.id }).sort({ isDefault: -1, name: 1 }).lean()
    const foldersWithCounts = await Promise.all(
      folders.map(async (folder) => ({
        ...folder,
        noteCount: await Note.countDocuments({ ownerId: session.id, folderId: folder._id }),
      }))
    )

    return NextResponse.json(foldersWithCounts)
  } catch (error) {
    console.error('Error fetching note folders:', error)
    return NextResponse.json(
      { error: 'Failed to load note folders.' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    await connectToDatabase()

    const folder = await NoteFolder.create({
      ownerId: session.id,
      name: body.name?.trim() || 'New Folder',
      color: body.color || '#f59e0b',
      icon: body.icon || 'Folder',
      isDefault: false,
    })

    return NextResponse.json(folder)
  } catch (error: any) {
    console.error('Error creating note folder:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create folder.' },
      { status: 500 }
    )
  }
}
