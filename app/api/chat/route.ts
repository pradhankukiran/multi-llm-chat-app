import { type NextRequest } from "next/server"

interface ChatCompletionRequest {
  model: string
  messages: Array<{ role: string; content: string }>
  temperature: number
  max_tokens: number
  stream: boolean
  reasoning_effort?: string
}

interface ModelInput {
  id: string
  provider: string
  modelId: string
}

async function streamModel(
  query: string,
  modelId: string,
  provider: string,
  apiModel: string,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
) {
  try {
    let apiUrl: string
    let apiKey: string | undefined

    if (provider === "groq") {
      apiUrl = "https://api.groq.com/openai/v1/chat/completions"
      apiKey = process.env.GROQ_API_KEY
    } else if (provider === "sambanova") {
      apiUrl = "https://api.sambanova.ai/v1/chat/completions"
      apiKey = process.env.SAMBANOVA_API_KEY
    } else {
      apiUrl = "https://api.cerebras.ai/v1/chat/completions"
      apiKey = process.env.CEREBRAS_API_KEY
    }

    if (!apiKey) {
      throw new Error(`${provider} error: missing API key`)
    }

    const requestBody: ChatCompletionRequest = {
      model: apiModel,
      messages: [{ role: "user", content: query }],
      temperature: 0.7,
      max_tokens: 1000,
      stream: true,
      ...(provider === "groq" && apiModel.toLowerCase().includes('qwen') && { reasoning_effort: "none" }),
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      throw new Error(`${provider} error: ${response.statusText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error("No response body")

    const decoder = new TextDecoder()
    let buffer = ""

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() || ""

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6)
          if (data === "[DONE]") continue

          try {
            const parsed = JSON.parse(data)
            const rawContent = parsed.choices[0]?.delta?.content
            if (rawContent) {
              const withoutThinkingBlocks = rawContent.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
              const strippedTags = withoutThinkingBlocks.replace(/<\/?thinking>/gi, '')

              const hasVisibleChars = strippedTags.replace(/\s+/g, '').length > 0
              const fallbackContent = rawContent.replace(/<\/?thinking>/gi, '')
              const contentToSend = hasVisibleChars ? strippedTags : fallbackContent

              if (contentToSend.trim()) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ modelId, content: contentToSend })}\n\n`))
              }
            }
          } catch (e) {
            // Skip malformed JSON
          }
        }
      }
    }

    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ modelId, done: true })}\n\n`))
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ modelId, error: message })}\n\n`))
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query, models } = await request.json() as { query: unknown; models: unknown }

    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "Invalid query" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (query.length > 4000) {
      return new Response(JSON.stringify({ error: "Query too long" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (!models || !Array.isArray(models)) {
      return new Response(JSON.stringify({ error: "Invalid models" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        await Promise.all(
          (models as ModelInput[]).map(model =>
            streamModel(query, model.id, model.provider, model.modelId, controller, encoder)
          )
        )

        // Signal completion
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "complete" })}\n\n`))
        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
