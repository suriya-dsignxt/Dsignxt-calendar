import { createGroq } from '@ai-sdk/groq';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { Appointment, Task } from '@/lib/models';
import { connectToDatabase } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { startOfDay, endOfDay } from 'date-fns';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const session = await getSession();

    if (!session) {
      return new Response('Unauthorized', { status: 401 });
    }

    await connectToDatabase();

    if (!process.env.GROQ_API_KEY) {
      console.error('Chat API Error: GROQ_API_KEY is not defined in .env');
      return new Response(JSON.stringify({ error: "AI API Key missing. Please check your .env file." }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const groq = createGroq({
      apiKey: process.env.GROQ_API_KEY,
    });

    const result = await streamText({
      model: groq('llama-3.3-70b-versatile'),
      messages,
      maxSteps: 5,
      onFinish: (result) => {
        console.log('AI Response Finished:', result.text);
      },
      onStepFinish: (step) => {
        console.log('AI Step Finished:', step.toolCalls?.length || 0, 'tool calls');
      },
      system: `You are the Dsignxt AI Personal Assistant, a sophisticated and helpful scheduling expert. 
      Your goal is to help admins and team members manage their calendar and tasks efficiently.
      
      Context:
      - Current Date: ${new Date().toLocaleDateString()}
      - User: ${session.email} (${session.role})
      
      Guidelines:
      - Be extremely fast, professional, and proactive.
      - You can manage appointments, list team members, and handle daily tasks.
      - If asked to schedule or task someone, always confirm the details.
      - Maintain the premium, "Zinc/Slate" aesthetic in your tone.
      
      Capabilities:
      - Use 'getAppointments' to see what's on the schedule.
      - Use 'addDailyTask' to help the user stay organized.
      - Use 'listTasks' to check progress.
      - Use 'updateAppointmentStatus' to help with approvals or cancellations.`,
      tools: {
        getAppointments: tool({
          description: 'Get appointments for a specific date or range',
          parameters: z.object({
            date: z.string().optional().describe('ISO date string, defaults to today'),
          }),
          execute: async ({ date }) => {
            const dateVal = date ? new Date(date) : new Date();
            const appointments = await Appointment.find({
              date: {
                $gte: startOfDay(dateVal),
                $lte: endOfDay(dateVal),
              },
            }).sort({ startTime: 1 });
            
            return appointments.map(a => ({
              id: a._id,
              client: a.clientName,
              time: `${a.startTime} - ${a.endTime}`,
              status: a.status,
              title: a.title
            }));
          },
        }),
        addDailyTask: tool({
          description: 'Add a new daily task to the planner',
          parameters: z.object({
            title: z.string().describe('The task heading'),
            description: z.string().optional().describe('Additional details'),
            dueDate: z.string().optional().describe('ISO date string, defaults to today'),
          }),
          execute: async ({ title, description, dueDate }) => {
            const task = await Task.create({
              title,
              description,
              dueDate: dueDate ? new Date(dueDate) : new Date(),
              assignedTo: session.id,
              createdBy: session.id,
              status: 'pending'
            });
            return { success: true, taskId: task._id, message: `Task "${title}" created.` };
          },
        }),
        listTasks: tool({
          description: 'List pending tasks for a specific date',
          parameters: z.object({
            date: z.string().optional().describe('ISO date string, defaults to today'),
          }),
          execute: async ({ date }) => {
            const dateVal = date ? new Date(date) : new Date();
            const tasks = await Task.find({
              assignedTo: session.id,
              dueDate: {
                $gte: startOfDay(dateVal),
                $lte: endOfDay(dateVal),
              },
              status: 'pending'
            });
            return tasks.map(t => ({ title: t.title, status: t.status }));
          },
        }),
        updateAppointmentStatus: tool({
          description: 'Update the status of an appointment (approve, reject, cancel)',
          parameters: z.object({
            appointmentId: z.string(),
            newStatus: z.enum(['approved', 'rejected', 'cancelled']),
          }),
          execute: async ({ appointmentId, newStatus }) => {
            const updated = await Appointment.findByIdAndUpdate(
              appointmentId,
              { status: newStatus },
              { new: true }
            );
            return { success: !!updated, status: updated?.status };
          },
        }),
      },
    });

    return result.toDataStreamResponse();
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
