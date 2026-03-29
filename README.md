<div align="center">

# Multi-LLM Chat

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**Query 8 LLMs simultaneously. Compare responses side-by-side in real time.**

[Getting Started](#getting-started) &bull; [Models](#supported-models) &bull; [Architecture](#architecture) &bull; [Contributing](#contributing)

</div>

---

## Overview

Multi-LLM Chat is a unified interface that sends a single prompt to **8 large language models** across 3 providers in parallel, streaming all responses back in a responsive grid. Useful for comparing model quality, speed, and reasoning across different architectures.

### Highlights

- **Parallel streaming** &mdash; all models respond concurrently via Server-Sent Events
- **3 providers, 8 models** &mdash; Groq, Cerebras, and SambaNova inference APIs
- **Expand & copy** &mdash; full-screen view with one-click copy for any response
- **Abort mid-stream** &mdash; cancel all in-flight requests instantly
- **Zero database** &mdash; fully stateless, no data stored

---

## Supported Models

| Provider | Model | Parameters |
|----------|-------|------------|
| **Cerebras** | Llama 3.1 8B | 8B |
| **Cerebras** | Qwen 3 235B | 235B (22B active) |
| **Groq** | Llama 3.3 70B Versatile | 70B |
| **Groq** | GPT OSS 20B | 20B |
| **Groq** | Qwen 3 32B | 32B |
| **Groq** | Llama 4 Scout 17B | 17B (16 experts) |
| **SambaNova** | DeepSeek V3.1 | 671B (37B active) |
| **SambaNova** | DeepSeek V3 | 671B (37B active) |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/)
- API keys from [Groq](https://console.groq.com/), [Cerebras](https://cloud.cerebras.ai/), and [SambaNova](https://cloud.sambanova.ai/)

### Setup

```bash
git clone https://github.com/pradhankukiran/multi-llm-chat-app.git
cd multi-llm-chat-app
pnpm install
```

Create a `.env.local` file in the project root:

```env
GROQ_API_KEY=your_groq_key
CEREBRAS_API_KEY=your_cerebras_key
SAMBANOVA_API_KEY=your_sambanova_key
```

### Run

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Architecture

```
User Input
    |
    v
[POST] /api/chat
    |
    v
streamModel() x 8 (parallel)
    |--- Groq API (4 models)
    |--- Cerebras API (2 models)
    '--- SambaNova API (2 models)
    |
    v
Server-Sent Events
    |
    v
React streaming state update
    |
    v
Responsive 4-column grid
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Frontend | React 19, TypeScript 5.9 |
| Styling | Tailwind CSS 4 |
| Icons | Lucide React |
| Streaming | SSE via ReadableStream |
| Analytics | Vercel Analytics |
| Package Manager | pnpm |

---

## Project Structure

```
app/
  api/chat/route.ts    # Streaming API endpoint
  layout.tsx           # Root layout
  page.tsx             # Main chat interface
  globals.css          # Global styles & CSS variables
components/
  chat-grid.tsx        # Response grid component
  ui/input.tsx         # Input component
lib/
  types.ts             # Shared TypeScript interfaces
  utils.ts             # Utility functions
```

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes
4. Push to the branch and open a Pull Request

---

## License

This project is licensed under the MIT License.
