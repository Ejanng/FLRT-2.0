import { createFileRoute } from '@tanstack/react-router'
import FoundForm from '../../components/FoundForm'

type SearchParams = {
  id: string
  name: string
  location: string
  date: string
  category: string
}

export const Route = createFileRoute('/claim/foundForm')({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    id: String(search.id || ''),
    name: String(search.name || ''),
    location: String(search.location || ''),
    date: String(search.date || ''),
    category: String(search.category || ''),
  }),
  component: FoundFormPage,
})

function FoundFormPage() {
  const { id, name, location, date, category } = Route.useSearch()

  return (
    <FoundForm
      reportId={id}
      itemName={name}
      location={location}
      date={date}
      category={category}
    />
  )
}
