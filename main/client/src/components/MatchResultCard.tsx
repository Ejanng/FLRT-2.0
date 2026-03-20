import { ExternalLink } from 'lucide-react'

interface MatchResult {
  name: string
  score?: number
  gdrive_view_link?: string
}

export default function MatchResultCard({ match }: { match: MatchResult }) {
  return (
    <div className="mb-6 bg-gradient-to-r from-[#f5e102]/20 to-[#f5e102]/5 border-2 border-[#f5e102] rounded-xl p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="bg-[#0217f7] text-white text-xs font-bold px-3 py-1 rounded-full">Match Found</span>
      </div>
      <p className="text-gray-700 dark:text-gray-300 text-sm mb-2">
        <span className="font-semibold">Item:</span> {match.name}
      </p>
      {match.gdrive_view_link && (
        <a
          href={match.gdrive_view_link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[#0217f7] dark:text-[#f5e102] text-sm font-medium hover:underline"
        >
          View Image <ExternalLink size={14} />
        </a>
      )}
    </div>
  )
}