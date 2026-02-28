'use client'

import { useState, type FormEvent } from 'react'
import { Copy, Sparkles, WandSparkles } from 'lucide-react'

import { StudioShell } from '@/components/studio-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type PostResponse = {
  post: string
  hashtags: string[]
  characterCount: number
}

const inputClassName =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

export default function PostGeneratorPage() {
  const [form, setForm] = useState({
    platform: 'LinkedIn',
    tone: 'Professional',
    audience: 'Founders and marketing teams',
    topic: '',
    keywords: '',
  })
  const [postResult, setPostResult] = useState<PostResponse | null>(null)
  const [postLoading, setPostLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleGenerate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')
    setPostLoading(true)

    try {
      const response = await fetch('/api/generate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await response.json()
      if (!response.ok || !json.success) {
        throw new Error(json.error ?? 'Post generation failed')
      }
      setPostResult(json.data as PostResponse)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Post generation failed')
    } finally {
      setPostLoading(false)
    }
  }

  const copyPost = async () => {
    if (!postResult?.post || typeof navigator === 'undefined') return
    await navigator.clipboard.writeText(`${postResult.post}\n\n${postResult.hashtags.join(' ')}`)
  }

  return (
    <StudioShell
      description="Create platform-specific copy in one step."
      title="AI Post Generator"
    >
      {errorMessage ? (
        <div className="mb-6 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      <div className="mx-auto max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-5" />
              AI Post Generator
            </CardTitle>
            <CardDescription>Generate ready-to-publish social content for your audience.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form className="space-y-4" onSubmit={handleGenerate}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="text-muted-foreground">Platform</span>
                  <select
                    className={inputClassName}
                    value={form.platform}
                    onChange={(event) => setForm((prev) => ({ ...prev, platform: event.target.value }))}
                  >
                    <option>LinkedIn</option>
                    <option>X</option>
                    <option>Instagram</option>
                    <option>Facebook</option>
                  </select>
                </label>

                <label className="space-y-1 text-sm">
                  <span className="text-muted-foreground">Tone</span>
                  <select
                    className={inputClassName}
                    value={form.tone}
                    onChange={(event) => setForm((prev) => ({ ...prev, tone: event.target.value }))}
                  >
                    <option>Professional</option>
                    <option>Friendly</option>
                    <option>Persuasive</option>
                    <option>Bold</option>
                  </select>
                </label>
              </div>

              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Audience</span>
                <input
                  className={inputClassName}
                  value={form.audience}
                  onChange={(event) => setForm((prev) => ({ ...prev, audience: event.target.value }))}
                />
              </label>

              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Topic</span>
                <textarea
                  className={inputClassName}
                  rows={4}
                  placeholder="Example: Why small teams should automate weekly reporting."
                  value={form.topic}
                  onChange={(event) => setForm((prev) => ({ ...prev, topic: event.target.value }))}
                  required
                />
              </label>

              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Keywords (comma separated)</span>
                <input
                  className={inputClassName}
                  placeholder="automation, growth, productivity"
                  value={form.keywords}
                  onChange={(event) => setForm((prev) => ({ ...prev, keywords: event.target.value }))}
                />
              </label>

              <Button className="w-full" disabled={postLoading} type="submit">
                <WandSparkles className="size-4" />
                {postLoading ? 'Generating post...' : 'Generate Post'}
              </Button>
            </form>

            <div className="min-h-52 space-y-3 rounded-lg border border-border bg-muted/40 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Generated Copy</p>
                <Button onClick={copyPost} size="sm" variant="outline" disabled={!postResult}>
                  <Copy className="size-4" />
                  Copy
                </Button>
              </div>

              {postResult ? (
                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  <p className="whitespace-pre-wrap text-sm">{postResult.post}</p>
                  <p className="text-xs text-muted-foreground">{postResult.characterCount} characters</p>
                  <p className="text-sm text-primary">{postResult.hashtags.join(' ')}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Your generated post will appear here after you click Generate Post.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </StudioShell>
  )
}
