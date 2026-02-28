import {
  applyRequestGuards,
  jsonError,
  jsonSuccess,
  parseISODateOnly,
  parseJsonBody,
  sanitizeLineList,
  sanitizeSingleLine,
} from '@/lib/api-security'

type GenerateTimelineBody = {
  projectName?: string
  eventName?: string
  startDate?: string | Date
  durationWeeks?: number | string
  milestones?: string
}

type TimelineItem = {
  week: number
  title: string
  date: string
  summary: string
}

function parseMilestones(milestones: string) {
  return milestones
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function addWeeks(baseDate: Date, weeks: number) {
  const next = new Date(baseDate)
  next.setDate(next.getDate() + weeks * 7)
  return next
}

function asISODate(value: Date) {
  return value.toISOString().slice(0, 10)
}

export async function POST(request: Request) {
  const guardFailure = applyRequestGuards(request, {
    routeKey: 'generate-timeline',
    maxBodyBytes: 16_384,
    maxRequests: 20,
    windowMs: 60_000,
  })
  if (guardFailure) return guardFailure

  const parsedBody = await parseJsonBody<GenerateTimelineBody>(request)
  if (!parsedBody.ok) return parsedBody.response

  const body = parsedBody.data
  const projectName = sanitizeSingleLine(body.projectName || body.eventName, 120)
  const durationWeeks = Number(body.durationWeeks ?? 8)
  const startDateInput = sanitizeSingleLine(
    typeof body.startDate === 'string' ? body.startDate : '',
    10
  )
  const startDate = startDateInput ? parseISODateOnly(startDateInput) : parseISODateOnly(asISODate(new Date()))
  const rawMilestones = sanitizeLineList(body.milestones, 12, 90)

  if (projectName.length < 2) {
    return jsonError('Project name is required and must contain at least 2 characters.', 400)
  }

  if (!Number.isFinite(durationWeeks) || durationWeeks < 2 || durationWeeks > 52) {
    return jsonError('Duration must be a number between 2 and 52 weeks.', 400)
  }

  if (!startDate) {
    return jsonError('Start date is invalid. Use YYYY-MM-DD format.', 400)
  }

  const defaultMilestones = [
    'Discovery and planning',
    'Draft and asset production',
    'Launch readiness',
    'Go-live and optimization',
  ]

  const milestones = rawMilestones.length ? parseMilestones(rawMilestones.join('\n')) : defaultMilestones
  const interval = Math.max(1, Math.floor(durationWeeks / milestones.length))

  const items: TimelineItem[] = milestones.map((title, index) => {
    const week = Math.min(durationWeeks, 1 + index * interval)
    const date = asISODate(addWeeks(startDate, week - 1))
    return {
      week,
      title,
      date,
      summary: `${title} for ${projectName}.`,
    }
  })

  if (items[items.length - 1].week !== durationWeeks) {
    items.push({
      week: durationWeeks,
      title: 'Final review and handoff',
      date: asISODate(addWeeks(startDate, durationWeeks - 1)),
      summary: `Finalize outcomes and handoff for ${projectName}.`,
    })
  }

  return jsonSuccess({
    projectName,
    items,
  })
}
