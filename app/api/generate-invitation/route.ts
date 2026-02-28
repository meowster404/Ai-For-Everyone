import {
  applyRequestGuards,
  jsonError,
  jsonSuccess,
  parseISODateOnly,
  parseJsonBody,
  sanitizeSingleLine,
} from '@/lib/api-security'

type GenerateInvitationBody = {
  eventName?: string
  hostName?: string
  eventDate?: string
  location?: string
  audience?: string
  rsvpLink?: string
  tone?: string
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export async function POST(request: Request) {
  const guardFailure = applyRequestGuards(request, {
    routeKey: 'generate-invitation',
    maxBodyBytes: 16_384,
    maxRequests: 25,
    windowMs: 60_000,
  })
  if (guardFailure) return guardFailure

  const parsedBody = await parseJsonBody<GenerateInvitationBody>(request)
  if (!parsedBody.ok) return parsedBody.response

  const body = parsedBody.data
  const eventName = sanitizeSingleLine(body.eventName, 140)
  const hostName = sanitizeSingleLine(body.hostName, 120) || 'Event Team'
  const eventDateInput = sanitizeSingleLine(body.eventDate, 10)
  const location = sanitizeSingleLine(body.location, 160) || 'Venue details will be shared soon'
  const audience = sanitizeSingleLine(body.audience, 120) || 'guests'
  const rsvpLink = sanitizeSingleLine(body.rsvpLink, 240) || 'Please reply to this email to RSVP.'
  const toneInput = sanitizeSingleLine(body.tone, 20).toLowerCase()

  if (eventName.length < 2) {
    return jsonError('Event name is required and must contain at least 2 characters.', 400)
  }

  const parsedDate = parseISODateOnly(eventDateInput)
  if (!parsedDate) {
    return jsonError('Event date is invalid. Use YYYY-MM-DD format.', 400)
  }

  const tone = new Set(['formal', 'friendly', 'excited']).has(toneInput) ? toneInput : 'friendly'
  const greetingLine =
    tone === 'formal'
      ? `Dear ${audience},`
      : tone === 'excited'
        ? `Hi ${audience}, we have something special for you!`
        : `Hi ${audience},`

  const dateLabel = formatDateLabel(parsedDate)
  const subject = `Invitation: ${eventName} on ${dateLabel}`

  const bodyText = [
    greetingLine,
    '',
    `You are invited to ${eventName}.`,
    `Hosted by: ${hostName}`,
    `Date: ${dateLabel}`,
    `Location: ${location}`,
    '',
    tone === 'formal'
      ? 'We would be honored by your presence.'
      : tone === 'excited'
        ? 'We would love to celebrate with you.'
        : 'We would love to have you join us.',
    '',
    `RSVP: ${rsvpLink}`,
    '',
    `Best regards,`,
    hostName,
  ].join('\n')

  return jsonSuccess({
    subject,
    body: bodyText,
  })
}
