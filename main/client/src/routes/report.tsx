import { createFileRoute } from '@tanstack/react-router'
import ReportForm from '../components/ReportForm'

export const Route = createFileRoute('/report')({
  component: ReportPage,
})

function ReportPage() {
  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Report an <span className="text-gradient">Item</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Help us reunite lost items with their owners
          </p>
        </div>
        <ReportForm />
      </div>
    </div>
  )
}