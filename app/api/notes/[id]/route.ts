import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import { Note } from '@/lib/models'
import { buildNotePlainText } from '@/lib/notes'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const checklist = Array.isArray(body.checklist) ? body.checklist : []

    await connectToDatabase()

    const note = await Note.findOneAndUpdate(
      { _id: id, ownerId: session.id },
      {
        $set: {
          title: body.title?.trim() || 'Untitled Note',
          body: body.body || '',
          checklist,
          tags: Array.isArray(body.tags) ? body.tags : [],
          pinned: !!body.pinned,
          favorite: !!body.favorite,
          color: body.color || '#f9fafb',
          folderId: body.folderId,
          plainText: buildNotePlainText(body.body || '', checklist),
        },
      },
      { new: true }
    )

    if (!note) {
      return NextResponse.json({ error: 'Note not found.' }, { status: 404 })
    }

    return NextResponse.json(note)
  } catch (error: any) {
    console.error('Error updating note:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update note.' },
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

    const note = await Note.findOneAndDelete({ _id: id, ownerId: session.id })
    if (!note) {
      return NextResponse.json({ error: 'Note not found.' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting note:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete note.' },
      { status: 500 }
    )
  }
}
