import 'server-only'

type GenerateJsonInput = {
  system: string
  user: string
  temperature?: number
  maxTokens?: number
}

type OpenAIChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.AI_API_KEY || ''
const OPENAI_MODEL = process.env.OPENAI_MODEL || process.env.AI_MODEL || 'gpt-4o-mini'
const OPENAI_BASE_URL =
  (process.env.OPENAI_BASE_URL || process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '')

function extractFirstJsonObject(content: string): string | null {
  const startIndex = content.indexOf('{')
  if (startIndex < 0) return null

  let depth = 0
  let inString = false
  let escape = false

  for (let i = startIndex; i < content.length; i += 1) {
    const char = content[i]

    if (escape) {
      escape = false
      continue
    }

    if (char === '\\') {
      escape = true
      continue
    }

    if (char === '"') {
      inString = !inString
      continue
    }

    if (inString) continue

    if (char === '{') depth += 1
    if (char === '}') depth -= 1

    if (depth === 0) {
      return content.slice(startIndex, i + 1)
    }
  }

  return null
}

export function isAiConfigured() {
  return OPENAI_API_KEY.length > 0
}

export async function generateJson<T>(input: GenerateJsonInput): Promise<T | null> {
  if (!isAiConfigured()) {
    return null
  }

  try {
    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: input.temperature ?? 0.3,
        max_tokens: input.maxTokens ?? 1000,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: input.system,
          },
          {
            role: 'user',
            content: input.user,
          },
        ],
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      console.error('AI request failed:', response.status, body)
      return null
    }

    const payload = (await response.json()) as OpenAIChatCompletionResponse
    const content = payload.choices?.[0]?.message?.content

    if (!content) {
      return null
    }

    const direct = content.trim()
    const jsonCandidate = direct.startsWith('{') ? direct : extractFirstJsonObject(direct)
    if (!jsonCandidate) return null

    return JSON.parse(jsonCandidate) as T
  } catch (error) {
    console.error('AI generation error:', error)
    return null
  }
}
