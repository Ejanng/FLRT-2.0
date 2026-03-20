import { createFileRoute } from '@tanstack/react-router'
import ReportsForm from '@/components/ReportForm'

export const Route = createFileRoute('/report-form/routes')({
  component: ReportsForm,
})