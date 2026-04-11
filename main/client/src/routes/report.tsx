import { createFileRoute } from '@tanstack/react-router'
import ReportForm from '../components/ReportForm'

type ReportSearchParams = {
  source?: string
  itemName?: string
  location?: string
  date?: string
  description?: string
}

export const Route = createFileRoute('/report')({
  validateSearch: (search: Record<string, unknown>): ReportSearchParams => ({
    source: search.source ? String(search.source) : undefined,
    itemName: search.itemName ? String(search.itemName) : undefined,
    location: search.location ? String(search.location) : undefined,
    date: search.date ? String(search.date) : undefined,
    description: search.description ? String(search.description) : undefined,
  }),
  component: ReportPage,
})

function ReportPage() {
  const search = Route.useSearch()
  const isFoundItemFlow = search.source === 'found-lost-item'

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Report an <span className="text-gradient">Item</span>
          </h1>
          <p className="text-gray-700">
            {isFoundItemFlow
              ? 'Thanks for finding this item. Submit the form with your contact info so admins can coordinate with the owner.'
              : 'Help us reunite lost items with their owners'}
          </p>
        </div>
        <ReportForm
          initialData={
            isFoundItemFlow
              ? {
                  itemName: search.itemName || '',
                  description: search.description || '',
                  status: 'found',
                  location: search.location || '',
                  date: search.date || '',
                }
              : undefined
          }
        />
      </div>
    </div>
  )
}