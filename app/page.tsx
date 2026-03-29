"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import ChatGrid from "@/components/chat-grid"
import { Check, Copy, Loader2, RotateCcw, X } from "lucide-react"
import type { LLMResponse, Model } from "@/lib/types"

const MODELS: Model[] = [
  { id: "cerebras-llama-3.1-8b", name: "Llama 3.1 8B", provider: "cerebras", modelId: "llama3.1-8b" },
  { id: "cerebras-gpt-oss-120b", name: "GPT OSS 120B", provider: "cerebras", modelId: "gpt-oss-120b" },
  { id: "groq-llama-3.3-70b", name: "Llama 3.3 70B", provider: "groq", modelId: "llama-3.3-70b-versatile" },
  { id: "groq-gpt-oss-20b", name: "GPT OSS 20B", provider: "groq", modelId: "openai/gpt-oss-20b" },
  { id: "groq-qwen-3-32b", name: "Qwen 3 32B", provider: "groq", modelId: "qwen/qwen3-32b" },
  { id: "groq-llama-4-scout-17b", name: "Llama 4 Scout 17B", provider: "groq", modelId: "meta-llama/llama-4-scout-17b-16e-instruct" },
  { id: "sambanova-minimax-m2.5", name: "MiniMax M2.5", provider: "sambanova", modelId: "MiniMax-M2.5" },
  { id: "sambanova-deepseek-v3-0324", name: "DeepSeek V3", provider: "sambanova", modelId: "DeepSeek-V3-0324" },
]

export default function Home() {
  const [query, setQuery] = useState("")
  const [responses, setResponses] = useState<LLMResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedResponse, setExpandedResponse] = useState<{ model: string; response: string; error?: string } | null>(null)
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle")
  const requestControllerRef = useRef<AbortController | null>(null)
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hasSessionContent = query.trim().length > 0 || responses.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setExpandedResponse(null)
    setLoading(true)
    requestControllerRef.current?.abort()

    // Initialize responses with empty content for all models
    setResponses(MODELS.map(model => ({
      model: model.name,
      response: ""
    })))

    const controller = new AbortController()
    requestControllerRef.current = controller

    try {
      const result = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          models: MODELS.map(m => ({ id: m.id, provider: m.provider, modelId: m.modelId }))
        }),
        signal: controller.signal,
      })

      if (!result.ok) {
        throw new Error("Failed to fetch responses")
      }

      const reader = result.body?.getReader()
      if (!reader) throw new Error("No response body")

      const decoder = new TextDecoder()
      let buffer = ""

      // Track responses by model ID
      const responsesByModel: Record<string, string> = {}
      MODELS.forEach(m => {
        responsesByModel[m.id] = ""
      })

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6)
            try {
              const parsed = JSON.parse(data)

              if (parsed.type === "complete") {
                setLoading(false)
                continue
              }

              if (parsed.modelId && parsed.content) {
                responsesByModel[parsed.modelId] += parsed.content

                setResponses(prev => prev.map((item, i) => ({
                  ...item,
                  response: responsesByModel[MODELS[i].id] ?? "",
                })))
              }

              if (parsed.modelId && parsed.error) {
                const modelIndex = MODELS.findIndex(m => m.id === parsed.modelId)
                if (modelIndex !== -1) {
                  setResponses((prev) => {
                    const updated = [...prev]
                    updated[modelIndex] = {
                      ...updated[modelIndex],
                      error: parsed.error,
                    }
                    return updated
                  })
                }
              }

              if (parsed.modelId && parsed.done) {
                // model stream finished
              }
            } catch (e) {
              // Skip malformed JSON
            }
          }
        }
      }
      setLoading(false)
    } catch (error) {
      if ((error as DOMException).name === "AbortError") {
        if (requestControllerRef.current === controller) {
          requestControllerRef.current = null
        }
        return
      }
      setResponses([
        {
          model: "Error",
          response: "Failed to fetch responses from LLMs",
          error: String(error),
        },
      ])
      setLoading(false)
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null
      }
    }
  }

  const handleClear = () => {
    requestControllerRef.current?.abort()
    requestControllerRef.current = null
    setQuery("")
    setResponses([])
    setLoading(false)
    setExpandedResponse(null)
  }

  useEffect(() => {
    if (expandedResponse) {
      const previousOverflow = document.body.style.overflow
      document.body.style.overflow = "hidden"
      setCopyStatus("idle")

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") setExpandedResponse(null)
      }
      document.addEventListener("keydown", handleEscape)

      return () => {
        document.body.style.overflow = previousOverflow
        document.removeEventListener("keydown", handleEscape)
        if (copyTimeoutRef.current) {
          clearTimeout(copyTimeoutRef.current)
          copyTimeoutRef.current = null
        }
        setCopyStatus("idle")
      }
    }

    if (!expandedResponse && copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current)
      copyTimeoutRef.current = null
      setCopyStatus("idle")
    }
  }, [expandedResponse])

  const handleExpand = (payload: { model: string; response: string; error?: string }) => {
    setExpandedResponse(payload)
  }

  const handleCopyExpanded = async () => {
    if (!expandedResponse) return
    const textToCopy = expandedResponse.response || expandedResponse.error || ""
    if (!textToCopy.trim()) return

    try {
      if (!navigator?.clipboard) return
      await navigator.clipboard.writeText(textToCopy)
      setCopyStatus("copied")
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current)
      }
      copyTimeoutRef.current = setTimeout(() => {
        setCopyStatus("idle")
      }, 2000)
    } catch {
      // clipboard write failed
    }
  }

  return (
    <main className="min-h-screen bg-white p-6 text-black">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12 border-l-4 border-black pl-6">
          <h1 className="text-5xl font-black text-black mb-2 tracking-tight">MULTI-LLM CHAT</h1>
          <p className="text-base text-black font-bold uppercase letter-spacing-wide">LLAMA / GPT / QWEN / DEEPSEEK / MINIMAX</p>
        </div>

        {/* Input Section */}
        <div className="bg-gray-900 border-4 border-white p-0 mb-8">
          <form onSubmit={handleSubmit} className="flex">
            <label htmlFor="chat-query" className="sr-only">Enter your query</label>
            <Input
              id="chat-query"
              type="text"
              placeholder="ENTER YOUR QUERY..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
              className="flex-1 text-base h-14 border-4 border-black bg-white text-gray-900 font-bold uppercase focus:outline-none focus-visible:ring-0 placeholder:text-gray-500"
            />
            <button
              type="button"
              onClick={handleClear}
              disabled={!loading && !hasSessionContent}
              className="px-4 h-14 border-l-4 border-white bg-gray-900 text-white flex items-center justify-center hover:bg-gray-800 disabled:opacity-40 disabled:hover:bg-gray-900 transition-colors"
              title="Clear conversation"
            >
              <RotateCcw className="w-5 h-5" />
              <span className="sr-only">Clear conversation</span>
            </button>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-8 font-black text-white bg-gray-900 border-l-4 border-white hover:bg-gray-800 disabled:opacity-50 h-14 flex items-center gap-2 uppercase"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="hidden sm:inline">SENDING</span>
                </>
              ) : (
                "SEND"
              )}
            </button>
          </form>
        </div>

        {/* Responses Grid */}
        <ChatGrid
          responses={responses}
          models={MODELS}
          onExpand={handleExpand}
          awaitingQuery={!query.trim()}
        />

        {expandedResponse && (
          <div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-center justify-center px-4 py-8" role="dialog" aria-modal="true" aria-labelledby="expanded-model-title">
            <div className="w-full max-w-4xl border-4 border-black bg-white text-black p-6 relative flex flex-col max-h-full">
              <div className="flex items-start justify-between gap-4 bg-gray-900 text-white px-4 py-3 -mx-4 -mt-4 mb-4 border-b-4 border-white">
                <h2 id="expanded-model-title" className="text-2xl font-black">{expandedResponse.model}</h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyExpanded}
                    className="p-2 border-2 border-white text-white hover:bg-white hover:text-gray-900 transition-colors disabled:opacity-40"
                    aria-label="Copy response"
                    disabled={!expandedResponse.response && !expandedResponse.error}
                  >
                    {copyStatus === "copied" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpandedResponse(null)}
                    className="p-2 border-2 border-white text-white hover:bg-white hover:text-gray-900 transition-colors"
                    aria-label="Close expanded response"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="mt-4 flex-1 overflow-y-auto pr-2">
                {expandedResponse.error ? (
                  <div className="text-red-600 font-bold whitespace-pre-wrap">{expandedResponse.error}</div>
                ) : (
                  <pre className="whitespace-pre-wrap font-sans font-bold text-sm leading-relaxed text-black">{expandedResponse.response}</pre>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
