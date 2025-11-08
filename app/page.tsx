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

export default function Home() {
  const [query, setQuery] = useState("")
  const [responses, setResponses] = useState<LLMResponse[]>([])
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setResponses([])

    try {
      const result = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      })

      const data = await result.json()
      setResponses(data.responses)
    } catch (error) {
      console.error("Error:", error)
      setResponses([
        {
          model: "Error",
          response: "Failed to fetch responses from LLMs",
          error: String(error),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12 border-l-4 border-white pl-6">
          <h1 className="text-5xl font-black text-white mb-2 tracking-tight">MULTI-LLM CHAT</h1>
          <p className="text-base text-white font-bold uppercase letter-spacing-wide">OPENROUTER / GROQ / CEREBRAS</p>
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
        {responses.length > 0 && <ChatGrid responses={responses} />}

        {/* Empty State */}
        {!loading && responses.length === 0 && (
          <div className="text-center py-32 border-4 border-dashed border-white">
            <p className="text-white text-xl font-black uppercase">QUERY ALL LLMS AT ONCE</p>
          </div>
        )}
      </div>
    </main>
  )
}
