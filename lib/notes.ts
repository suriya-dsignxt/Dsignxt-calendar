import { NoteFolder } from '@/lib/models'

export function buildNotePlainText(body: string, checklist: Array<{ text: string; checked: boolean }>) {
  const checklistLines = checklist.map((item) => `${item.checked ? '[x]' : '[ ]'} ${item.text}`)
  return [body, ...checklistLines].join('\n').trim()
}

export async function ensureDefaultNoteFolder(ownerId: string) {
  let folder = await NoteFolder.findOne({ ownerId, isDefault: true })

  if (!folder) {
    folder = await NoteFolder.create({
      ownerId,
      name: 'Notes',
      color: '#f59e0b',
      icon: 'NotebookPen',
      isDefault: true,
    })
  }

  return folder
}
