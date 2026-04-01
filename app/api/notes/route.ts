import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import { Note } from '@/lib/models'
import { buildNotePlainText, ensureDefaultNoteFolder } from '@/lib/notes'

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const folderId = searchParams.get('folderId')
    const query = searchParams.get('q')?.trim()
    const view = searchParams.get('view')

    await connectToDatabase()
    await ensureDefaultNoteFolder(session.id)

    const filters: Record<string, unknown> = { ownerId: session.id }

    if (folderId && folderId !== 'all') {
      filters.folderId = folderId
    }

    if (view === 'favorites') {
      filters.favorite = true
    }

    if (view === 'pinned') {
      filters.pinned = true
    }

    if (query) {
      filters.$or = [
        { title: { $regex: query, $options: 'i' } },
        { plainText: { $regex: query, $options: 'i' } },
        { tags: { $elemMatch: { $regex: query, $options: 'i' } } },
      ]
    }

    const notes = await Note.find(filters).sort({ pinned: -1, updatedAt: -1 }).lean()

    return NextResponse.json(notes)
  } catch (error) {
    console.error('Error fetching notes:', error)
    return NextResponse.json(
      { error: 'Failed to load notes.' },
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

    const defaultFolder = await ensureDefaultNoteFolder(session.id)
    const checklist = Array.isArray(body.checklist) ? body.checklist : []
    const note = await Note.create({
      ownerId: session.id,
      folderId: body.folderId || defaultFolder._id,
      title: body.title?.trim() || 'Untitled Note',
      body: body.body || '',
      checklist,
      tags: Array.isArray(body.tags) ? body.tags : [],
      pinned: !!body.pinned,
      favorite: !!body.favorite,
      color: body.color || '#f9fafb',
      plainText: buildNotePlainText(body.body || '', checklist),
    })

    return NextResponse.json(note)
  } catch (error: any) {
    console.error('Error creating note:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create note.' },
      { status: 500 }
    )
  }
}
