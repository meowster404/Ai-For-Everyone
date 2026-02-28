import {
  applyRequestGuards,
  jsonError,
  jsonSuccess,
  parseISODateOnly,
  parseJsonBody,
  sanitizeSingleLine,
} from '@/lib/api-security'

type GenerateRemindersBody = {
  eventName?: string
  eventDate?: string
  channels?: string
}

type ReminderItem = {
  stage: string
  timing: string
  date: string
  message: string
  channels: string[]
}

function addDays(baseDate: Date, days: number) {
  const next = new Date(baseDate)
  next.setDate(next.getDate() + days)
  return next
}

function asISODate(value: Date) {
  return value.toISOString().slice(0, 10)
}

export async function POST(request: Request) {
  const guardFailure = applyRequestGuards(request, {
    routeKey: 'generate-reminders',
    maxBodyBytes: 12_288,
    maxRequests: 25,
    windowMs: 60_000,
  })
  if (guardFailure) return guardFailure

  const parsedBody = await parseJsonBody<GenerateRemindersBody>(request)
  if (!parsedBody.ok) return parsedBody.response

  const body = parsedBody.data
  const eventName = sanitizeSingleLine(body.eventName, 140)
  const eventDateInput = sanitizeSingleLine(body.eventDate, 10)
  const channelsInput = sanitizeSingleLine(body.channels, 160)

  if (eventName.length < 2) {
    return jsonError('Event name is required and must contain at least 2 characters.', 400)
  }

  const eventDate = parseISODateOnly(eventDateInput)
  if (!eventDate) {
    return jsonError('Event date is invalid. Use YYYY-MM-DD format.', 400)
  }

  const channels = channelsInput
    ? channelsInput
        .split(',')
        .map((channel) => sanitizeSingleLine(channel, 20).toLowerCase())
        .filter(Boolean)
        .slice(0, 6)
    : ['email', 'whatsapp']

  const reminderTemplate = [
    { stage: 'Save the date', offsetDays: -30 },
    { stage: 'Invitation follow-up', offsetDays: -14 },
    { stage: 'Registration reminder', offsetDays: -7 },
    { stage: 'Volunteer briefing reminder', offsetDays: -3 },
    { stage: 'Final reminder', offsetDays: -1 },
    { stage: 'Event day reminder', offsetDays: 0 },
    { stage: 'Thank-you follow-up', offsetDays: 1 },
  ]

  const items: ReminderItem[] = reminderTemplate.map((item) => {
    const date = addDays(eventDate, item.offsetDays)
    const timing =
      item.offsetDays === 0
        ? 'Event Day'
        : item.offsetDays < 0
          ? `T-${Math.abs(item.offsetDays)} days`
          : `T+${item.offsetDays} day`

    return {
      stage: item.stage,
      timing,
      date: asISODate(date),
      message: `${item.stage} for ${eventName}.`,
      channels,
    }
  })

  return jsonSuccess({
    eventName,
    eventDate: asISODate(eventDate),
    items,
  })
}
