import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import { Note, NoteFolder } from '@/lib/models'
import { ensureDefaultNoteFolder } from '@/lib/notes'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    await connectToDatabase()

    const folder = await NoteFolder.findOneAndUpdate(
      { _id: id, ownerId: session.id },
      {
        $set: {
          name: body.name?.trim(),
          color: body.color,
        },
      },
      { new: true }
    )

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found.' }, { status: 404 })
    }

    return NextResponse.json(folder)
  } catch (error: any) {
    console.error('Error updating note folder:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update folder.' },
      { status: 500 }
    )
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    await connectToDatabase()

    const folder = await NoteFolder.findOne({ _id: id, ownerId: session.id })
    if (!folder) {
      return NextResponse.json({ error: 'Folder not found.' }, { status: 404 })
    }

    if (folder.isDefault) {
      return NextResponse.json(
        { error: 'The default folder cannot be deleted.' },
        { status: 400 }
      )
    }

    const defaultFolder = await ensureDefaultNoteFolder(session.id)

    await Note.updateMany(
      { ownerId: session.id, folderId: folder._id },
      { $set: { folderId: defaultFolder._id } }
    )

    await NoteFolder.findByIdAndDelete(folder._id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting note folder:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete folder.' },
      { status: 500 }
    )
  }
}
