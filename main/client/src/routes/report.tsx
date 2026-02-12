import { createFileRoute } from '@tanstack/react-router'
import ReportForm from '../components/ReportForm'

export const Route = createFileRoute('/report')({
  component: ReportForm,
})
