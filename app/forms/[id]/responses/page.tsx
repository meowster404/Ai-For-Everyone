'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, ExternalLink, Sheet } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface FormResponse {
  id: string
  submittedAt: string
  submittedBy: string
  email: string
  phone?: string
  data: Record<string, any>
}

export default function FormResponsesPage() {
  const params = useParams<{ id: string }>()
  const formId = Array.isArray(params.id) ? params.id[0] : params.id
  const [responses, setResponses] = useState<FormResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [sheetName, setSheetName] = useState('')
  const [sheetUrl, setSheetUrl] = useState('')

  useEffect(() => {
    if (!formId) {
      setLoading(false)
      return
    }

    const loadResponses = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/submissions?formId=${formId}`)
        const json = await res.json()
        if (!json.success || !Array.isArray(json.data)) return

        const mapped: FormResponse[] = json.data.map((row: any) => {
          const data = (row.submissionData || row.submission_data || {}) as Record<string, any>
          const submittedBy =
            data.name || data.fullName || data.firstName || data.username || 'Anonymous'
          return {
            id: row.id,
            submittedAt: row.createdAt || row.created_at || new Date().toISOString(),
            submittedBy: String(submittedBy),
            email: String(data.email || ''),
            phone: data.phone ? String(data.phone) : undefined,
            data,
          }
        })
        setResponses(mapped)
      } catch (error) {
        console.error('Failed to load responses:', error)
      } finally {
        setLoading(false)
      }
    }

    loadResponses()
  }, [formId])

  useEffect(() => {
    if (!formId) return

    const loadSheetInfo = async () => {
      try {
        const res = await fetch(`/api/forms/${formId}`)
        const json = await res.json()
        if (!json.success || !json.data) return

        const googleSheet =
          json.data?.formConfig?.googleSheet ||
          json.data?.form_config?.googleSheet

        if (googleSheet?.connected && googleSheet?.url) {
          setSheetUrl(String(googleSheet.url))
          setSheetName(String(googleSheet.name || 'Sheet Link'))
        } else {
          setSheetUrl('')
          setSheetName('')
        }
      } catch (error) {
        console.error('Failed to load sheet info:', error)
      }
    }

    loadSheetInfo()
  }, [formId])

  return (
    <div className="min-h-screen bg-linear-to-br from-background to-secondary/10 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">Form Responses</h1>
            <p className="text-muted-foreground">View and manage form submissions</p>
          </div>
          {sheetUrl ? (
            <a href={sheetUrl} target="_blank" rel="noreferrer">
              <Button className="gap-2">
                <Sheet size={18} />
                {sheetName || 'Sheet Link'}
                <ExternalLink size={14} />
              </Button>
            </a>
          ) : (
            <Link href={`/forms/${formId}/integrate`}>
              <Button variant="outline" className="gap-2">
                <Sheet size={18} />
                Connect Sheet
              </Button>
            </Link>
          )}
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Responses</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{responses.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{responses.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">100%</p>
            </CardContent>
          </Card>
        </div>

        {/* Responses Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Responses</CardTitle>
            <CardDescription>View all form submissions for this form</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading responses...</p>
              </div>
            ) : responses.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No responses yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Submitted At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {responses.map(response => (
                      <TableRow key={response.id}>
                        <TableCell className="font-medium">{response.submittedBy}</TableCell>
                        <TableCell>{response.email}</TableCell>
                        <TableCell>{response.phone || '-'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(response.submittedAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
