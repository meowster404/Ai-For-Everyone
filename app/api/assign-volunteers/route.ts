import { generateJson } from '@/lib/ai'
import {
  applyRequestGuards,
  jsonError,
  jsonSuccess,
  parseJsonBody,
  sanitizeLineList,
  sanitizeSingleLine,
} from '@/lib/api-security'

type AssignVolunteersBody = {
  eventName?: string
  volunteers?: string
  tasks?: string
}

type Assignment = {
  task: string
  volunteer: string
  backupVolunteer: string
}

type AIAssignmentDraft = {
  assignments?: unknown
}

function normalizeAssignments(
  rawAssignments: unknown,
  tasks: string[],
  volunteers: string[]
): Assignment[] {
  if (!Array.isArray(rawAssignments)) return []

  const assignments: Assignment[] = []

  for (let index = 0; index < rawAssignments.length; index += 1) {
    const candidate = rawAssignments[index]
    if (!candidate || typeof candidate !== 'object') continue

    const row = candidate as {
      task?: unknown
      volunteer?: unknown
      backupVolunteer?: unknown
    }

    const task = sanitizeSingleLine(row.task, 120) || tasks[index % tasks.length]
    const volunteer = sanitizeSingleLine(row.volunteer, 80) || volunteers[index % volunteers.length]

    let backupVolunteer =
      sanitizeSingleLine(row.backupVolunteer, 80) || volunteers[(index + 1) % volunteers.length]

    if (backupVolunteer === volunteer && volunteers.length > 1) {
      backupVolunteer = volunteers[(index + 1) % volunteers.length]
    }

    assignments.push({
      task,
      volunteer,
      backupVolunteer,
    })
  }

  return assignments
}

export async function POST(request: Request) {
  const guardFailure = applyRequestGuards(request, {
    routeKey: 'assign-volunteers',
    maxBodyBytes: 24_576,
    maxRequests: 25,
    windowMs: 60_000,
  })
  if (guardFailure) return guardFailure

  const parsedBody = await parseJsonBody<AssignVolunteersBody>(request)
  if (!parsedBody.ok) return parsedBody.response

  const body = parsedBody.data
  const eventName = sanitizeSingleLine(body.eventName, 140)
  const volunteers = sanitizeLineList(body.volunteers, 120, 80)
  const tasks = sanitizeLineList(body.tasks, 120, 120)

  if (eventName.length < 2) {
    return jsonError('Event name is required and must contain at least 2 characters.', 400)
  }
  if (volunteers.length < 1) {
    return jsonError('Add at least one volunteer (one per line).', 400)
  }
  if (tasks.length < 1) {
    return jsonError('Add at least one task (one per line).', 400)
  }

  const fallbackAssignments: Assignment[] = tasks.map((task, index) => {
    const volunteer = volunteers[index % volunteers.length]
    const backupVolunteer = volunteers[(index + 1) % volunteers.length]
    return {
      task,
      volunteer,
      backupVolunteer,
    }
  })

  const aiDraft = await generateJson<AIAssignmentDraft>({
    system:
      'You assign volunteers to tasks. Return strict JSON with one key: assignments. assignments must be an array of objects containing task, volunteer, backupVolunteer.',
    user: JSON.stringify({
      eventName,
      volunteers,
      tasks,
      rules: [
        'Every task must have one owner and one backup.',
        'Try to distribute ownership fairly.',
      ],
    }),
    temperature: 0.4,
    maxTokens: 1000,
  })

  const aiAssignments = normalizeAssignments(aiDraft?.assignments, tasks, volunteers)

  const aiByTask = new Map<string, Assignment>()
  for (const item of aiAssignments) {
    aiByTask.set(item.task.toLowerCase(), item)
  }

  const assignments = tasks.map((task, index) => {
    const match = aiByTask.get(task.toLowerCase())
    return match || fallbackAssignments[index]
  })

  return jsonSuccess({
    eventName,
    totalTasks: assignments.length,
    assignments,
  })
}
