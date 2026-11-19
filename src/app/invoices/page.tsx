import { DocumentList } from '@/components/documents/DocumentList'

export const dynamic = 'force-dynamic'

export default function InvoicesPage() {
  return <DocumentList type="INVOICE" />
}
