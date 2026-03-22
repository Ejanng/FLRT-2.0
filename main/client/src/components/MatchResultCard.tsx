import { ExternalLink } from 'lucide-react'

interface MatchResult {
  name: string
  score?: number
  gdrive_view_link?: string
}

const getDriveThumbnailUrl = (url?: string) => {
  if (!url) return null

  const fileIdFromPath = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1]
  let fileIdFromQuery: string | null = null
  try {
    fileIdFromQuery = new URL(url).searchParams.get('id')
  } catch {
    fileIdFromQuery = null
  }

  const fileId = fileIdFromPath || fileIdFromQuery
  if (!fileId) return null
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`
}

export default function MatchResultCard({ match }: { match: MatchResult }) {
  const thumbnailUrl = getDriveThumbnailUrl(match.gdrive_view_link)

  return (
    <div className="mb-6 bg-gradient-to-r from-[#f5e102]/20 to-[#f5e102]/5 border-2 border-[#f5e102] rounded-xl p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="bg-[#0217f7] text-white text-xs font-bold px-3 py-1 rounded-full">Match Found</span>
      </div>

      {thumbnailUrl && (
        <img
          src={thumbnailUrl}
          alt={match.name}
          className="w-full h-44 object-cover rounded-lg border border-[#f5e102]/50 mb-3"
          onError={(e) => {
            ;(e.target as HTMLImageElement).style.display = 'none'
          }}
        />
      )}

      <p className="text-gray-700 dark:text-gray-300 text-sm mb-2">
        <span className="font-semibold">Item:</span> {match.name}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {match.gdrive_view_link && (
          <a
            href={match.gdrive_view_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[#0217f7] dark:text-[#f5e102] text-sm font-medium hover:underline"
          >
            View Matched Image <ExternalLink size={14} />
          </a>
        )}
      </div>
    </div>
  )
}