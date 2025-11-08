import { AlertCircle } from "lucide-react"

interface LLMResponse {
  model: string
  response: string
  error?: string
}

interface ChatGridProps {
  responses: LLMResponse[]
}

export default function ChatGrid({ responses }: ChatGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {responses.map((res, index) => (
        <div
          key={res.model}
          className="border-4 border-white bg-black flex flex-col overflow-hidden hover:bg-gray-900 transition-colors"
        >
          {/* Model Header */}
          <div className="bg-white px-6 py-4 text-black font-black text-sm uppercase border-b-4 border-black">
            {res.model}
          </div>

          {/* Response Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {res.error ? (
              <div className="flex items-start gap-3 text-red-400">
                <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-black mb-2 uppercase text-sm">ERROR</p>
                  <p className="text-sm font-bold">{res.error}</p>
                </div>
              </div>
            ) : (
              <p className="text-white leading-relaxed whitespace-pre-wrap font-sans text-sm">{res.response}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
