import { getReconciledFinanceMetrics, ReconciledFinanceMetrics } from './reconciliation'

export type ReconciledAnalytics = ReconciledFinanceMetrics

export async function getReconciledAnalytics(): Promise<ReconciledFinanceMetrics> {
  return getReconciledFinanceMetrics()
}
