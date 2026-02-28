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

  const assignments: Assignment[] = tasks.map((task, index) => {
    const volunteer = volunteers[index % volunteers.length]
    const backupVolunteer = volunteers[(index + 1) % volunteers.length]
    return {
      task,
      volunteer,
      backupVolunteer,
    }
  })

  return jsonSuccess({
    eventName,
    totalTasks: assignments.length,
    assignments,
  })
}
