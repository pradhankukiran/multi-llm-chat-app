import { AlertCircle } from "lucide-react"

interface LLMResponse {
  model: string
  response: string
  error?: string
  isPlaceholder?: boolean
}

interface Model {
  id: string
  name: string
  provider: string
  modelId: string
}

interface ChatGridProps {
  responses: LLMResponse[]
  models: Model[]
}

export default function ChatGrid({ responses, models }: ChatGridProps) {
  // Create array of 6 items: either actual responses or placeholder objects
  const displayItems = [...responses]

  // Fill remaining slots with placeholders if we have fewer than 6 responses
  while (displayItems.length < 6) {
    displayItems.push({
      model: models[displayItems.length]?.name || "Model",
      response: "",
      isPlaceholder: true
    })
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {displayItems.map((res, index) => {
        const model = models[index]

        return (
          <div
            key={model?.id || index}
            className="border-4 border-white bg-black flex flex-col overflow-hidden hover:bg-gray-900 transition-colors"
          >
            {/* Model Header */}
            <div className="bg-white px-6 py-4 text-black font-black text-sm uppercase border-b-4 border-black">
              {res.model}
            </div>

            {/* Response Content */}
            <div className="flex-1 p-6 overflow-y-auto min-h-[200px]">
              {res.error ? (
                <div className="flex items-start gap-3 text-red-400">
                  <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black mb-2 uppercase text-sm">ERROR</p>
                    <p className="text-sm font-bold">{res.error}</p>
                  </div>
                </div>
              ) : res.response ? (
                <p className="text-white leading-relaxed whitespace-pre-wrap font-sans text-sm font-bold">{res.response}</p>
              ) : (
                <p className="text-gray-600 text-sm font-bold uppercase">Awaiting response...</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
