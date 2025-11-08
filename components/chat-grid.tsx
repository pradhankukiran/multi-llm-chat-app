'use client'

import { AlertCircle, Maximize2 } from "lucide-react"
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
  onExpand?: (payload: { model: string; response: string; error?: string }) => void
  awaitingQuery?: boolean
}

export default function ChatGrid({ responses, models, onExpand, awaitingQuery = false }: ChatGridProps) {
  const hasAnyResponse = responses.some(res => Boolean(res.response) || Boolean(res.error))
  const responsesByModel = new Map(responses.map(response => [response.model, response]))
  const displayItems = models.map(model => {
    return responsesByModel.get(model.name) ?? {
      model: model.name,
      response: "",
      isPlaceholder: true
    }
  })
  const cardHeightClass = hasAnyResponse ? "h-[360px] md:h-[380px]" : "h-[280px]"

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {displayItems.map((res, index) => {
        const model = models[index]
        const hasResponse = Boolean(res.response)
        const hasError = Boolean(res.error)
        const state = hasError ? "error" : hasResponse ? "complete" : "pending"
        const canExpand = hasResponse || hasError

        const cardClass = cn(
          "relative z-10 border-4 bg-white flex flex-col overflow-hidden transition-all duration-300 ease-out rounded-none",
          "transition-[min-height,height]",
          cardHeightClass,
          "hover:-translate-y-1 hover:bg-gray-100",
          state === "complete" && "border-gray-900/80 shadow-[0_30px_60px_rgba(0,0,0,0.18)]",
          state === "pending" && "border-gray-500 opacity-95",
          state === "error" && "border-red-600 shadow-[0_20px_45px_rgba(220,38,38,0.35)]"
        )

        const waitingLabel = awaitingQuery ? "Awaiting query..." : "Awaiting response..."

        const statusBadge = cn(
          "text-[10px] font-black uppercase tracking-wide px-2 py-0.5 border rounded-sm transition-colors duration-300",
          state === "complete" && "bg-white text-gray-900 border-gray-900",
          state === "pending" && "bg-gray-900 text-white border-gray-900 animate-pulse",
          state === "error" && "bg-red-700 text-white border-red-800"
        )

        const statusLabel = state === "complete"
          ? "Ready"
          : state === "error"
            ? "Error"
            : "Waiting"

        return (
          <div key={model?.id || index} className="relative group">
            {state === "complete" && (
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/15 via-transparent to-black/15 blur-2xl opacity-0 group-hover:opacity-70 transition-opacity duration-500" />
            )}
            <div className={cardClass}>
              {/* Model Header */}
              <div className="bg-gray-900 px-6 py-4 text-white font-black text-sm uppercase border-b-4 border-white flex items-center justify-between gap-3">
                <span className="truncate">{res.model}</span>
                <div className="flex items-center gap-2">
                  <span className={statusBadge}>{statusLabel}</span>
                  <button
                    type="button"
                    onClick={() => canExpand && onExpand?.({ model: res.model, response: res.response, error: res.error })}
                    disabled={!canExpand}
                    className="p-1 border-2 border-white text-white hover:bg-white hover:text-gray-900 transition-colors disabled:opacity-40 disabled:border-white/40 disabled:text-white/60 disabled:hover:bg-gray-900"
                    aria-label={`Expand ${res.model} response`}
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Response Content */}
              <div className="flex-1 p-6 overflow-y-auto min-h-[200px]">
                {res.error ? (
                  <div className="flex items-start gap-3 text-red-600">
                    <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-black mb-2 uppercase text-sm">ERROR</p>
                      <p className="text-sm font-bold whitespace-pre-wrap">{res.error}</p>
                    </div>
                  </div>
                ) : res.response ? (
                  <p className="text-black leading-relaxed whitespace-pre-wrap font-sans text-sm font-bold">{res.response}</p>
                ) : (
                  <p className="text-gray-600 text-sm font-bold uppercase tracking-wide animate-pulse">{waitingLabel}</p>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
