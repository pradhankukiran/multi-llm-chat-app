import { type NextRequest } from "next/server"

async function streamModel(
  query: string,
  modelId: string,
  provider: string,
  apiModel: string,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
) {
  try {
    const apiUrl = provider === "groq"
      ? "https://api.groq.com/openai/v1/chat/completions"
      : "https://api.cerebras.ai/v1/chat/completions"

    const apiKey = provider === "groq"
      ? process.env.GROQ_API_KEY
      : process.env.CEREBRAS_API_KEY

    const requestBody: any = {
      model: apiModel,
      messages: [{ role: "user", content: query }],
      temperature: 0.7,
      max_tokens: 1000,
      stream: true,
    }

    // Add reasoning_effort for Qwen models
    if (apiModel.toLowerCase().includes('qwen')) {
      requestBody.reasoning_effort = "none"
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
            let content = parsed.choices[0]?.delta?.content
            if (content) {
              // Remove thinking tags and their content
              content = content.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
              content = content.replace(/<\/thinking>/gi, '')
              content = content.replace(/<thinking>/gi, '')

              // Only send if there's content after filtering
              if (content.trim()) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ modelId, content })}\n\n`))
              }
            }
          } catch (e) {
            // Skip malformed JSON
          }
        }
      }
    }

    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ modelId, done: true })}\n\n`))
  } catch (error: any) {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ modelId, error: error.message })}\n\n`))
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query, models } = await request.json()

    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "Invalid query" }), {
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
        // Stream all 6 models in parallel
        await Promise.all(
          models.map(model =>
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
    console.error("API error:", error)
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
