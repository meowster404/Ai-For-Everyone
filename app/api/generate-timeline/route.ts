import { generateJson } from '@/lib/ai'
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

type AITimelineDraft = {
  projectName?: unknown
  items?: unknown
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

function normalizeAiItems(
  value: unknown,
  projectName: string,
  startDate: Date,
  durationWeeks: number
): TimelineItem[] {
  if (!Array.isArray(value)) return []

  const normalized: TimelineItem[] = []
  for (const candidate of value) {
    if (!candidate || typeof candidate !== 'object') continue

    const row = candidate as {
      week?: unknown
      title?: unknown
      date?: unknown
      summary?: unknown
    }

    const weekRaw = Number(row.week)
    const week = Number.isFinite(weekRaw)
      ? Math.max(1, Math.min(durationWeeks, Math.floor(weekRaw)))
      : normalized.length + 1

    const title = sanitizeSingleLine(row.title, 140)
    if (!title) continue

    const parsedDate = parseISODateOnly(sanitizeSingleLine(row.date, 10))
    const date = parsedDate ? asISODate(parsedDate) : asISODate(addWeeks(startDate, week - 1))
    const summary = sanitizeSingleLine(row.summary, 260) || `${title} for ${projectName}.`

    normalized.push({
      week,
      title,
      date,
      summary,
    })

    if (normalized.length >= 30) break
  }

  const dedupedByWeek = new Map<number, TimelineItem>()
  for (const item of normalized) {
    if (!dedupedByWeek.has(item.week)) {
      dedupedByWeek.set(item.week, item)
    }
  }

  return Array.from(dedupedByWeek.values()).sort((a, b) => a.week - b.week)
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

  const fallbackItems: TimelineItem[] = milestones.map((title, index) => {
    const week = Math.min(durationWeeks, 1 + index * interval)
    const date = asISODate(addWeeks(startDate, week - 1))
    return {
      week,
      title,
      date,
      summary: `${title} for ${projectName}.`,
    }
  })

  if (fallbackItems[fallbackItems.length - 1].week !== durationWeeks) {
    fallbackItems.push({
      week: durationWeeks,
      title: 'Final review and handoff',
      date: asISODate(addWeeks(startDate, durationWeeks - 1)),
      summary: `Finalize outcomes and handoff for ${projectName}.`,
    })
  }

  const aiDraft = await generateJson<AITimelineDraft>({
    system:
      'You generate project timelines. Return strict JSON with keys projectName and items. items must be an array of objects with week (number), title (string), date (YYYY-MM-DD), summary (string). No markdown.',
    user: JSON.stringify({
      projectName,
      startDate: asISODate(startDate),
      durationWeeks,
      milestones,
    }),
    temperature: 0.45,
    maxTokens: 1200,
  })

  const aiItems = normalizeAiItems(aiDraft?.items, projectName, startDate, durationWeeks)
  const items = aiItems.length ? aiItems : fallbackItems

  if (items[items.length - 1]?.week !== durationWeeks) {
    items.push({
      week: durationWeeks,
      title: 'Final review and handoff',
      date: asISODate(addWeeks(startDate, durationWeeks - 1)),
      summary: `Finalize outcomes and handoff for ${projectName}.`,
    })
  }

  return jsonSuccess({
    projectName: sanitizeSingleLine(aiDraft?.projectName, 120) || projectName,
    items,
  })
}
