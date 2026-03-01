import 'server-only'

// `pg` runtime package is available; we keep type usage light to avoid
// adding extra type packages in this project.
import { randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { Pool } from 'pg'

export interface SupabaseForm {
  id: string
  name: string
  description: string
  event_id: string | null
  form_config: Record<string, unknown>
  submission_count: number
  created_at: string
  updated_at: string
}

export interface SupabaseSubmission {
  id: string
  form_id: string
  submission_data: Record<string, unknown>
  payment_status: 'pending' | 'completed' | 'failed'
  payment_id?: string
  payment_method?: string
  payment_amount?: number
  receipt_url?: string
  created_at: string
  updated_at: string
}

type LocalStore = {
  forms: SupabaseForm[]
  submissions: SupabaseSubmission[]
}

const databaseUrl = process.env.DATABASE_URL || process.env.DIRECT_URL
const persistentStoreEnabled = process.env.USE_PERSISTENT_STORE === 'true'
const storeFilePath = path.join(process.cwd(), '.data', 'store.json')

let cachedPool: any = null
let localStore: LocalStore = { forms: [], submissions: [] }
let localStoreLoaded = false
let forceLocalStore = !databaseUrl
let localFallbackLogged = false

function getPool() {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL (or DIRECT_URL) is not configured.')
  }

  if (!cachedPool) {
    const useSsl = /supabase\.com/i.test(databaseUrl)
    cachedPool = new Pool({
      connectionString: databaseUrl,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
      max: 5,
    })
  }

  return cachedPool
}

function normalizeCustomLink(value: string): string {
  return value.trim().toLowerCase().replace(/^\/+/, '').replace(/\/+$/, '')
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function toObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function mapFormRow(row: Record<string, unknown>): SupabaseForm {
  return {
    id: String(row.id),
    name: String(row.name || ''),
    description: String(row.description || ''),
    event_id: row.event_id ? String(row.event_id) : null,
    form_config: toObject(row.form_config),
    submission_count: Number(row.submission_count || 0),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

function mapSubmissionRow(row: Record<string, unknown>): SupabaseSubmission {
  return {
    id: String(row.id),
    form_id: String(row.form_id),
    submission_data: toObject(row.submission_data),
    payment_status: String(row.payment_status || 'pending') as SupabaseSubmission['payment_status'],
    payment_id: row.payment_id ? String(row.payment_id) : undefined,
    payment_method: row.payment_method ? String(row.payment_method) : undefined,
    payment_amount:
      typeof row.payment_amount === 'number' ? row.payment_amount : undefined,
    receipt_url: row.receipt_url ? String(row.receipt_url) : undefined,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

async function ensureLocalStoreLoaded() {
  if (localStoreLoaded) return
  localStoreLoaded = true

  if (!persistentStoreEnabled) return

  try {
    const content = await fs.readFile(storeFilePath, 'utf8')
    const parsed = JSON.parse(content) as Partial<LocalStore>
    localStore = {
      forms: Array.isArray(parsed.forms)
        ? parsed.forms.map((row) => mapFormRow(row as unknown as Record<string, unknown>))
        : [],
      submissions: Array.isArray(parsed.submissions)
        ? parsed.submissions.map((row) =>
            mapSubmissionRow(row as unknown as Record<string, unknown>)
          )
        : [],
    }
  } catch {
    localStore = { forms: [], submissions: [] }
  }
}

async function persistLocalStore() {
  if (!persistentStoreEnabled) return

  try {
    await fs.mkdir(path.dirname(storeFilePath), { recursive: true })
    await fs.writeFile(storeFilePath, JSON.stringify(localStore, null, 2), 'utf8')
  } catch (error) {
    console.error('Could not persist local store:', error)
  }
}

function shouldFallbackToLocal(error: unknown) {
  if (!error || typeof error !== 'object') return false

  const anyError = error as { code?: unknown; message?: unknown }
  const code = typeof anyError.code === 'string' ? anyError.code.toUpperCase() : ''
  const message = typeof anyError.message === 'string' ? anyError.message.toLowerCase() : ''

  const recoverableCodes = new Set([
    'ECONNREFUSED',
    'ECONNRESET',
    'ENOTFOUND',
    'ETIMEDOUT',
    '57P01',
    '57P03',
    '08001',
    '08006',
    '28P01',
    '3D000',
    '42P01',
  ])

  if (code && recoverableCodes.has(code)) return true

  const recoverableMessages = [
    'database_url',
    'connection',
    'connect',
    'timeout',
    'getaddrinfo',
    'no pg_hba',
    'password authentication failed',
    'relation "public.forms" does not exist',
    'relation "public.form_submissions" does not exist',
    'does not exist',
  ]

  return recoverableMessages.some((token) => message.includes(token))
}

function enableLocalStoreFallback(reason: unknown) {
  forceLocalStore = true
  if (!localFallbackLogged) {
    localFallbackLogged = true
    console.warn('Falling back to local store:', reason)
  }
}

async function withStoreFallback<T>(
  databaseOperation: () => Promise<T>,
  localOperation: () => Promise<T>
): Promise<T> {
  if (forceLocalStore) {
    return localOperation()
  }

  try {
    return await databaseOperation()
  } catch (error) {
    if (!shouldFallbackToLocal(error)) {
      throw error
    }

    enableLocalStoreFallback(error)
    return localOperation()
  }
}

async function listFormsLocal(): Promise<SupabaseForm[]> {
  await ensureLocalStoreLoaded()
  return [...localStore.forms].sort((a, b) => b.created_at.localeCompare(a.created_at))
}

async function getFormByIdLocal(id: string): Promise<SupabaseForm | null> {
  await ensureLocalStoreLoaded()
  if (!isUuid(id)) return null
  return localStore.forms.find((form) => form.id === id) || null
}

async function getFormByIdOrCustomLinkLocal(identifier: string): Promise<SupabaseForm | null> {
  await ensureLocalStoreLoaded()

  const normalizedIdentifier = identifier.trim()
  if (!normalizedIdentifier) return null

  if (isUuid(normalizedIdentifier)) {
    const byId = await getFormByIdLocal(normalizedIdentifier)
    if (byId) return byId
  }

  const customLink = normalizeCustomLink(normalizedIdentifier)
  if (!customLink) return null

  return (
    localStore.forms.find((form) => {
      const formLink = normalizeCustomLink(
        String((form.form_config as { customLink?: unknown }).customLink || '')
      )
      return formLink === customLink
    }) || null
  )
}

async function createFormLocal(input: {
  id?: string
  name: string
  description?: string
  eventId?: string | null
  formConfig?: Record<string, unknown>
}): Promise<SupabaseForm> {
  await ensureLocalStoreLoaded()

  if (input.id && !isUuid(input.id)) {
    throw new Error('Form ID must be a valid UUID when provided.')
  }

  const now = new Date().toISOString()
  const inputConfig = toObject(input.formConfig)
  const fields = Array.isArray(inputConfig.fields) ? inputConfig.fields : []

  const form: SupabaseForm = {
    id: input.id || randomUUID(),
    name: input.name,
    description: input.description || '',
    event_id: input.eventId || null,
    form_config: {
      ...inputConfig,
      fields,
    },
    submission_count: 0,
    created_at: now,
    updated_at: now,
  }

  localStore.forms.unshift(form)
  await persistLocalStore()
  return form
}

async function updateFormLocal(
  id: string,
  updates: Partial<
    Pick<SupabaseForm, 'name' | 'description' | 'event_id' | 'form_config' | 'submission_count'>
  >
): Promise<SupabaseForm | null> {
  await ensureLocalStoreLoaded()
  if (!isUuid(id)) return null

  const index = localStore.forms.findIndex((form) => form.id === id)
  if (index < 0) return null

  const existing = localStore.forms[index]
  const updated: SupabaseForm = {
    ...existing,
    name: updates.name ?? existing.name,
    description: updates.description ?? existing.description,
    event_id: updates.event_id ?? existing.event_id,
    form_config: updates.form_config ?? existing.form_config,
    submission_count: updates.submission_count ?? existing.submission_count,
    updated_at: new Date().toISOString(),
  }

  localStore.forms[index] = updated
  await persistLocalStore()
  return updated
}

async function deleteFormLocal(id: string): Promise<boolean> {
  await ensureLocalStoreLoaded()
  if (!isUuid(id)) return false

  const previousCount = localStore.forms.length
  localStore.forms = localStore.forms.filter((form) => form.id !== id)
  localStore.submissions = localStore.submissions.filter((submission) => submission.form_id !== id)

  const deleted = localStore.forms.length !== previousCount
  if (deleted) {
    await persistLocalStore()
  }
  return deleted
}

async function listSubmissionsByFormIdLocal(formId: string): Promise<SupabaseSubmission[]> {
  await ensureLocalStoreLoaded()
  if (!isUuid(formId)) return []

  return [...localStore.submissions]
    .filter((submission) => submission.form_id === formId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

async function createSubmissionLocal(input: {
  formId: string
  submissionData: Record<string, unknown>
  paymentStatus?: 'pending' | 'completed' | 'failed'
}): Promise<SupabaseSubmission> {
  await ensureLocalStoreLoaded()

  if (!isUuid(input.formId)) {
    throw new Error('formId must be a valid UUID.')
  }

  const now = new Date().toISOString()
  const submission: SupabaseSubmission = {
    id: randomUUID(),
    form_id: input.formId,
    submission_data: toObject(input.submissionData),
    payment_status: input.paymentStatus || 'pending',
    created_at: now,
    updated_at: now,
  }

  localStore.submissions.unshift(submission)

  const formIndex = localStore.forms.findIndex((form) => form.id === input.formId)
  if (formIndex >= 0) {
    const form = localStore.forms[formIndex]
    localStore.forms[formIndex] = {
      ...form,
      submission_count: (form.submission_count || 0) + 1,
      updated_at: now,
    }
  }

  await persistLocalStore()
  return submission
}

export async function listForms(): Promise<SupabaseForm[]> {
  return withStoreFallback(
    async () => {
      const result = await getPool().query(
        `SELECT id, name, description, event_id, form_config, submission_count, created_at, updated_at
         FROM public.forms
         ORDER BY created_at DESC`
      )
      return result.rows.map((row: Record<string, unknown>) => mapFormRow(row))
    },
    listFormsLocal
  )
}

export async function getFormById(id: string): Promise<SupabaseForm | null> {
  return withStoreFallback(
    async () => {
      if (!isUuid(id)) {
        return null
      }

      const result = await getPool().query(
        `SELECT id, name, description, event_id, form_config, submission_count, created_at, updated_at
         FROM public.forms
         WHERE id = $1
         LIMIT 1`,
        [id]
      )

      if (result.rows.length === 0) {
        return null
      }

      return mapFormRow(result.rows[0] as Record<string, unknown>)
    },
    async () => getFormByIdLocal(id)
  )
}

export async function getFormByIdOrCustomLink(identifier: string): Promise<SupabaseForm | null> {
  return withStoreFallback(
    async () => {
      const normalizedIdentifier = identifier.trim()
      if (!normalizedIdentifier) {
        return null
      }

      const byId = await getFormById(normalizedIdentifier)
      if (byId) {
        return byId
      }

      const customLink = normalizeCustomLink(normalizedIdentifier)
      if (!customLink) {
        return null
      }

      const result = await getPool().query(
        `SELECT id, name, description, event_id, form_config, submission_count, created_at, updated_at
         FROM public.forms
         WHERE lower(trim(both '/' from coalesce(form_config->>'customLink', ''))) = $1
         LIMIT 1`,
        [customLink]
      )

      if (result.rows.length === 0) {
        return null
      }

      return mapFormRow(result.rows[0] as Record<string, unknown>)
    },
    async () => getFormByIdOrCustomLinkLocal(identifier)
  )
}

export async function createForm(input: {
  id?: string
  name: string
  description?: string
  eventId?: string | null
  formConfig?: Record<string, unknown>
}): Promise<SupabaseForm> {
  return withStoreFallback(
    async () => {
      const now = new Date().toISOString()
      const inputConfig = toObject(input.formConfig)
      const fields = Array.isArray(inputConfig.fields) ? inputConfig.fields : []
      const formConfig = JSON.stringify({
        ...inputConfig,
        fields,
      })

      const withCustomId = Boolean(input.id)
      const query = withCustomId
        ? `INSERT INTO public.forms (id, name, description, event_id, form_config, submission_count, created_at, updated_at)
           VALUES ($1::uuid, $2, $3, $4::uuid, $5::jsonb, 0, $6::timestamptz, $6::timestamptz)
           RETURNING id, name, description, event_id, form_config, submission_count, created_at, updated_at`
        : `INSERT INTO public.forms (name, description, event_id, form_config, submission_count, created_at, updated_at)
           VALUES ($1, $2, $3::uuid, $4::jsonb, 0, $5::timestamptz, $5::timestamptz)
           RETURNING id, name, description, event_id, form_config, submission_count, created_at, updated_at`
      const values = withCustomId
        ? [input.id, input.name, input.description || '', input.eventId || null, formConfig, now]
        : [input.name, input.description || '', input.eventId || null, formConfig, now]

      const result = await getPool().query(query, values)
      return mapFormRow(result.rows[0] as Record<string, unknown>)
    },
    async () => createFormLocal(input)
  )
}

export async function updateForm(
  id: string,
  updates: Partial<
    Pick<SupabaseForm, 'name' | 'description' | 'event_id' | 'form_config' | 'submission_count'>
  >
): Promise<SupabaseForm | null> {
  return withStoreFallback(
    async () => {
      if (!isUuid(id)) {
        return null
      }

      const assignments: string[] = []
      const values: unknown[] = []

      if (updates.name !== undefined) {
        values.push(updates.name)
        assignments.push(`name = $${values.length}`)
      }
      if (updates.description !== undefined) {
        values.push(updates.description)
        assignments.push(`description = $${values.length}`)
      }
      if (updates.event_id !== undefined) {
        values.push(updates.event_id)
        assignments.push(`event_id = $${values.length}::uuid`)
      }
      if (updates.form_config !== undefined) {
        values.push(JSON.stringify(updates.form_config))
        assignments.push(`form_config = $${values.length}::jsonb`)
      }
      if (updates.submission_count !== undefined) {
        values.push(updates.submission_count)
        assignments.push(`submission_count = $${values.length}`)
      }

      values.push(new Date().toISOString())
      assignments.push(`updated_at = $${values.length}::timestamptz`)

      values.push(id)

      const result = await getPool().query(
        `UPDATE public.forms
         SET ${assignments.join(', ')}
         WHERE id = $${values.length}::uuid
         RETURNING id, name, description, event_id, form_config, submission_count, created_at, updated_at`,
        values
      )

      if (result.rows.length === 0) {
        return null
      }

      return mapFormRow(result.rows[0] as Record<string, unknown>)
    },
    async () => updateFormLocal(id, updates)
  )
}

export async function deleteForm(id: string): Promise<boolean> {
  return withStoreFallback(
    async () => {
      if (!isUuid(id)) {
        return false
      }

      const result = await getPool().query(`DELETE FROM public.forms WHERE id = $1::uuid RETURNING id`, [id])
      return result.rows.length > 0
    },
    async () => deleteFormLocal(id)
  )
}

export async function listSubmissionsByFormId(formId: string): Promise<SupabaseSubmission[]> {
  return withStoreFallback(
    async () => {
      if (!isUuid(formId)) {
        return []
      }

      const result = await getPool().query(
        `SELECT id, form_id, submission_data, payment_status, payment_id, payment_method, payment_amount, receipt_url, created_at, updated_at
         FROM public.form_submissions
         WHERE form_id = $1::uuid
         ORDER BY created_at DESC`,
        [formId]
      )

      return result.rows.map((row: Record<string, unknown>) => mapSubmissionRow(row))
    },
    async () => listSubmissionsByFormIdLocal(formId)
  )
}

export async function createSubmission(input: {
  formId: string
  submissionData: Record<string, unknown>
  paymentStatus?: 'pending' | 'completed' | 'failed'
}): Promise<SupabaseSubmission> {
  return withStoreFallback(
    async () => {
      const now = new Date().toISOString()
      const client = await getPool().connect()

      try {
        await client.query('BEGIN')

        const insertResult = await client.query(
          `INSERT INTO public.form_submissions (form_id, submission_data, payment_status, created_at, updated_at)
           VALUES ($1::uuid, $2::jsonb, $3, $4::timestamptz, $4::timestamptz)
           RETURNING id, form_id, submission_data, payment_status, payment_id, payment_method, payment_amount, receipt_url, created_at, updated_at`,
          [input.formId, JSON.stringify(input.submissionData), input.paymentStatus || 'pending', now]
        )

        await client.query(
          `UPDATE public.forms
           SET submission_count = coalesce(submission_count, 0) + 1,
               updated_at = $2::timestamptz
           WHERE id = $1::uuid`,
          [input.formId, new Date().toISOString()]
        )

        await client.query('COMMIT')
        return mapSubmissionRow(insertResult.rows[0] as Record<string, unknown>)
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    },
    async () => createSubmissionLocal(input)
  )
}
