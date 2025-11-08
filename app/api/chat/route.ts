import { type NextRequest, NextResponse } from "next/server"

async function queryOpenRouter(query: string): Promise<string> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "Multi-LLM Chat",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [{ role: "user", content: query }],
      temperature: 0.7,
      max_tokens: 1000,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenRouter error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

async function queryGroq(query: string): Promise<string> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mixtral-8x7b-32768",
      messages: [{ role: "user", content: query }],
      temperature: 0.7,
      max_tokens: 1000,
    }),
  })

  if (!response.ok) {
    throw new Error(`Groq error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

async function queryCerebras(query: string): Promise<string> {
  const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.CEREBRAS_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b",
      messages: [{ role: "user", content: query }],
      temperature: 0.7,
      max_tokens: 1000,
    }),
  })

  if (!response.ok) {
    throw new Error(`Cerebras error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Invalid query" }, { status: 400 })
    }

    const [openRouterRes, groqRes, cerebrasRes] = await Promise.allSettled([
      queryOpenRouter(query),
      queryGroq(query),
      queryCerebras(query),
    ])

    const responses = [
      {
        model: "OpenRouter (GPT-4o Mini)",
        response: openRouterRes.status === "fulfilled" ? openRouterRes.value : "Failed to get response",
        error: openRouterRes.status === "rejected" ? openRouterRes.reason.message : undefined,
      },
      {
        model: "Groq (Mixtral 8x7B)",
        response: groqRes.status === "fulfilled" ? groqRes.value : "Failed to get response",
        error: groqRes.status === "rejected" ? groqRes.reason.message : undefined,
      },
      {
        model: "Cerebras (Llama 3.3 70B)",
        response: cerebrasRes.status === "fulfilled" ? cerebrasRes.value : "Failed to get response",
        error: cerebrasRes.status === "rejected" ? cerebrasRes.reason.message : undefined,
      },
    ]

    return NextResponse.json({ responses })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
