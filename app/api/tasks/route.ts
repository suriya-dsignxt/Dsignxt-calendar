import { NextResponse } from "next/server"
import { Task } from "@/lib/models"
import { connectToDatabase } from "@/lib/mongodb"
import { getSession } from "@/lib/auth"
import { startOfDay, endOfDay, addDays } from "date-fns"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const dateStr = searchParams.get('date')
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectToDatabase()
    
    let query: any = { assignedTo: session.id }
    if (dateStr) {
      const date = new Date(dateStr)
      query.dueDate = {
        $gte: startOfDay(date),
        $lte: endOfDay(date)
      }
    }

    const tasks = await Task.find(query).sort({ createdAt: -1 })
    return NextResponse.json(tasks)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { title, description, dueDate } = await req.json()
    await connectToDatabase()

    const task = await Task.create({
      title,
      description,
      dueDate: new Date(dueDate),
      assignedTo: session.id,
      createdBy: session.id,
      status: 'pending'
    })

    return NextResponse.json(task)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { status, pushToNextDay } = body
    await connectToDatabase()

    let update: any = {}
    if (status) update.status = status
    
    if (pushToNextDay) {
      const existingTask = await Task.findById(id)
      if (existingTask) {
        // Increment the due date by 1 day
        const currentDueDate = new Date(existingTask.dueDate)
        update.dueDate = addDays(currentDueDate, 1)
        update.status = 'pending' // Ensure it's pending when pushed
      }
    }

    const task = await Task.findOneAndUpdate(
      { _id: id, assignedTo: session.id },
      update,
      { new: true }
    )

    if (!task) {
      return NextResponse.json({ error: "Task not found or access denied" }, { status: 404 })
    }

    return NextResponse.json(task)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectToDatabase()
    const result = await Task.findOneAndDelete({ _id: id, assignedTo: session.id })
    
    if (!result) {
      return NextResponse.json({ error: "Task not found or access denied" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
