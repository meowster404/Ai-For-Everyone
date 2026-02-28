import {
  applyRequestGuards,
  jsonError,
  jsonSuccess,
  parseJsonBody,
  sanitizeSingleLine,
} from '@/lib/api-security'

type GeneratePostBody = {
  platform?: string
  tone?: string
  audience?: string
  topic?: string
  keywords?: string
}

function toHashtag(value: string) {
  const cleaned = value.replace(/[^a-zA-Z0-9 ]/g, '').trim()
  if (!cleaned) return ''
  return `#${cleaned
    .split(/\s+/)
    .slice(0, 3)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('')}`
}

function trimForPlatform(platform: string, text: string) {
  if (platform.toLowerCase() !== 'x') return text
  return text.length <= 280 ? text : `${text.slice(0, 277)}...`
}

export async function POST(request: Request) {
  const guardFailure = applyRequestGuards(request, {
    routeKey: 'generate-post',
    maxBodyBytes: 12_288,
    maxRequests: 30,
    windowMs: 60_000,
  })
  if (guardFailure) return guardFailure

  const parsedBody = await parseJsonBody<GeneratePostBody>(request)
  if (!parsedBody.ok) return parsedBody.response

  const body = parsedBody.data
  const platformInput = sanitizeSingleLine(body.platform, 24)
  const toneInput = sanitizeSingleLine(body.tone, 32)
  const audience = sanitizeSingleLine(body.audience, 120) || 'general audience'
  const topic = sanitizeSingleLine(body.topic, 280)
  const keywords = sanitizeSingleLine(body.keywords, 300)

  if (topic.length < 3) {
    return jsonError('Topic is required and must contain at least 3 characters.', 400)
  }

  const allowedPlatforms = new Set(['LinkedIn', 'X', 'Instagram', 'Facebook'])
  const platform = allowedPlatforms.has(platformInput) ? platformInput : 'LinkedIn'

  const allowedTones = new Set(['Professional', 'Friendly', 'Persuasive', 'Bold'])
  const tone = allowedTones.has(toneInput) ? toneInput : 'Professional'

  const keyList = keywords
    .split(',')
    .map((item) => sanitizeSingleLine(item, 24))
    .filter(Boolean)
    .slice(0, 8)

  const generated = [
    `If you're speaking to ${audience}, this matters now:`,
    '',
    `${topic}.`,
    '',
    `Keep the message ${tone.toLowerCase()}, focus on one clear action, and close with a measurable next step.`,
    '',
    'Would you test this in your next campaign?',
  ].join('\n')

  const post = trimForPlatform(platform, generated)
  const hashtags = Array.from(
    new Set([toHashtag(topic), ...keyList.map(toHashtag), toHashtag(platform), '#AIGenerated'].filter(Boolean))
  ).slice(0, 6)

  return jsonSuccess({
    post,
    hashtags,
    characterCount: post.length,
  })
}
