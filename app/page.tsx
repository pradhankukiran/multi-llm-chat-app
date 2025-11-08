"use client"

import type React from "react"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import ChatGrid from "@/components/chat-grid"
import { Loader2 } from "lucide-react"

interface LLMResponse {
  model: string
  response: string
  error?: string
}

const MODELS = [
  { id: "cerebras-llama-3.1-8b", name: "Llama 3.1 8B", provider: "cerebras", modelId: "llama3.1-8b" },
  { id: "cerebras-gpt-oss-120b", name: "GPT OSS 120B", provider: "cerebras", modelId: "gpt-oss-120b" },
  { id: "cerebras-zai-glm-4.6", name: "Z.ai GLM 4.6", provider: "cerebras", modelId: "zai-glm-4.6" },
  { id: "groq-llama-3.3-70b", name: "Llama 3.3 70B", provider: "groq", modelId: "llama-3.3-70b-versatile" },
  { id: "groq-gpt-oss-20b", name: "GPT OSS 20B", provider: "groq", modelId: "openai/gpt-oss-20b" },
  { id: "groq-qwen-3-32b", name: "Qwen 3 32B", provider: "groq", modelId: "qwen/qwen3-32b" },
]

export default function Home() {
  const [query, setQuery] = useState("")
  const [responses, setResponses] = useState<LLMResponse[]>([])
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)

    // Initialize responses with empty content for all 6 models
    setResponses(MODELS.map(model => ({
      model: model.name,
      response: ""
    })))

    try {
      const result = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          models: MODELS.map(m => ({ id: m.id, provider: m.provider, modelId: m.modelId }))
        }),
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
      MODELS.forEach(m => responsesByModel[m.id] = "")

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

                // Update responses array
                setResponses(MODELS.map(model => ({
                  model: model.name,
                  response: responsesByModel[model.id],
                  error: undefined,
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
            } catch (e) {
              // Skip malformed JSON
            }
          }
        }
      }
    } catch (error) {
      console.error("Error:", error)
      setResponses([
        {
          model: "Error",
          response: "Failed to fetch responses from LLMs",
          error: String(error),
        },
      ])
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12 border-l-4 border-white pl-6">
          <h1 className="text-5xl font-black text-white mb-2 tracking-tight">MULTI-LLM CHAT</h1>
          <p className="text-base text-white font-bold uppercase letter-spacing-wide">LLAMA / GPT / QWEN / GLM</p>
        </div>

        {/* Input Section */}
        <div className="bg-white border-4 border-black p-0 mb-8">
          <form onSubmit={handleSubmit} className="flex">
            <Input
              type="text"
              placeholder="ENTER YOUR QUERY..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
              className="flex-1 text-base h-14 border-0 bg-white font-bold uppercase focus:outline-none focus-visible:ring-0 placeholder:text-gray-400"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-8 font-black text-white bg-black border-l-4 border-black hover:bg-gray-900 disabled:opacity-50 h-14 flex items-center gap-2 uppercase"
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
        <ChatGrid responses={responses} models={MODELS} />
      </div>
    </main>
  )
}
