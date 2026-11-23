import { ok } from '@/lib/api'
import { getReconciledAnalytics } from '@/lib/analytics'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const data = await getReconciledAnalytics()
  return ok(data)
}
