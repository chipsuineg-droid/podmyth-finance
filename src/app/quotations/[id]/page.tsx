import { DocumentDetail } from '@/components/documents/DocumentDetail'

export const dynamic = 'force-dynamic'

export default function QuotationDetailPage({ params }: { params: { id: string } }) {
  return <DocumentDetail id={params.id} />
}
