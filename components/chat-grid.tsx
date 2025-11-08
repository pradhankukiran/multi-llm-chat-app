import { AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

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
  const responsesByModel = new Map(responses.map(response => [response.model, response]))
  const displayItems = models.map(model => {
    return responsesByModel.get(model.name) ?? {
      model: model.name,
      response: "",
      isPlaceholder: true
    }
  })

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {displayItems.map((res, index) => {
        const model = models[index]
        const hasResponse = Boolean(res.response)
        const hasError = Boolean(res.error)
        const state = hasError ? "error" : hasResponse ? "complete" : "pending"

        const cardClass = cn(
          "relative z-10 border-4 bg-black flex flex-col overflow-hidden transition-all duration-300 ease-out rounded-none",
          "hover:-translate-y-1 hover:bg-gray-900",
          state === "complete" && "border-white/80 shadow-[0_30px_60px_rgba(255,255,255,0.18)]",
          state === "pending" && "border-white/50 opacity-90",
          state === "error" && "border-red-500 shadow-[0_20px_45px_rgba(248,113,113,0.35)]"
        )

        const statusBadge = cn(
          "text-[10px] font-black uppercase tracking-wide px-2 py-0.5 border rounded-sm transition-colors duration-300",
          state === "complete" && "bg-black text-white border-black",
          state === "pending" && "bg-gray-100 text-gray-700 border-gray-400 animate-pulse",
          state === "error" && "bg-red-600 text-white border-red-700"
        )

        const statusLabel = state === "complete"
          ? "Ready"
          : state === "error"
            ? "Error"
            : "Waiting"

        return (
          <div key={model?.id || index} className="relative group">
            {state === "complete" && (
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/15 via-transparent to-white/15 blur-2xl opacity-0 group-hover:opacity-70 transition-opacity duration-500" />
            )}
            <div className={cardClass}>
              {/* Model Header */}
              <div className="bg-white px-6 py-4 text-black font-black text-sm uppercase border-b-4 border-black flex items-center justify-between gap-4">
                <span className="truncate">{res.model}</span>
                <span className={statusBadge}>{statusLabel}</span>
              </div>

              {/* Response Content */}
              <div className="flex-1 p-6 overflow-y-auto min-h-[200px]">
                {res.error ? (
                  <div className="flex items-start gap-3 text-red-300">
                    <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-black mb-2 uppercase text-sm">ERROR</p>
                      <p className="text-sm font-bold whitespace-pre-wrap">{res.error}</p>
                    </div>
                  </div>
                ) : res.response ? (
                  <p className="text-white leading-relaxed whitespace-pre-wrap font-sans text-sm font-bold">{res.response}</p>
                ) : (
                  <p className="text-gray-500 text-sm font-bold uppercase tracking-wide animate-pulse">Awaiting response...</p>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
