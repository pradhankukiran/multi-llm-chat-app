export interface LLMResponse {
  model: string
  response: string
  error?: string
  isPlaceholder?: boolean
}

export interface Model {
  id: string
  name: string
  provider: string
  modelId: string
}
