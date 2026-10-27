
import { supabaseServerClient } from '@/lib/supabase/server'
import pdf from 'pdf-parse/lib/pdf-parse.js'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import path from 'node:path'

const OLLAMA_URL = 'http://localhost:11434'
const MODEL = 'deepseek-r1:1.5b'

// Ask DeepSeek to generate an answer.
async function askDeepSeek(prompt) {
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      stream: false
    })
  })

  const text = await response.text()

  if (!response.ok) {
    throw new Error(`Ollama chat failed: ${text}`)
  }

  let data

  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(`Ollama returned invalid JSON: ${text}`)
  }

  if (!data.message?.content) {
    throw new Error('Ollama returned an empty answer')
  }

  return data.message.content
}

// Classify the question before choosing a data source.
async function classifyQuestion(question) {
const answer = await askDeepSeek(`
Classify this question into exactly one category:

travelers - asks about traveler database records
documents - asks about information in stored documents
general - asks about anything else

Return only the category name.

Question: ${question}
`)

  // Remove DeepSeek's optional reasoning section.
  const finalAnswer = answer.replace(
    /<think>[\s\S]*?<\/think>/gi,
    ''
  ).trim().toLowerCase()

  const match = finalAnswer.match(/\b(travelers|documents|general)\b/)

  return match?.[1] || 'general'
}

// Connect to MCP, call the traveler tool, then close the connection.
async function getTravelerContext() {
  const client = new Client({
    name: 'myai-agent',
    version: '1.0.0'
  })

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.join(process.cwd(), 'mcp-server.js')],
    cwd: process.cwd()
  })

  try {
    await client.connect(transport)

    const result = await client.callTool({
      name: 'query_travelers',
      arguments: {}
    })

    if (result.isError) {
      throw new Error('MCP traveler query failed')
    }

    return result.content
      .filter(item => item.type === 'text')
      .map(item => item.text)
      .join('\n')
  } finally {
    await client.close()
  }
}

// Create an embedding and retrieve relevant documents.
async function searchDocuments(supabase, question) {
  const response = await fetch(`${OLLAMA_URL}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'nomic-embed-text',
      input: question
    })
  })

  const text = await response.text()

  if (!response.ok) {
    throw new Error(`Embedding failed: ${text}`)
  }

  let embeddingData

  try {
    embeddingData = JSON.parse(text)
  } catch {
    throw new Error(`Invalid embedding response: ${text}`)
  }

  const { data, error } = await supabase.rpc('match_documents', {
    query_embedding: embeddingData.embeddings[0],
    match_count: 3
  })

  if (error) throw error

  return data.map(item => item.content).join('\n\n')
}

export async function POST(request) {
  const supabase = supabaseServerClient

  try {
    // PDF QUESTIONS: retain your existing document workflow.
    if (
      request.headers.get('content-type')
        ?.includes('multipart/form-data')
    ) {
      const formData = await request.formData()
      const file = formData.get('file')
      const question = formData.get('question')

      if (!file || typeof file.arrayBuffer !== 'function') {
        return Response.json(
          { message: 'No valid file attached' },
          { status: 400 }
        )
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      const parsedPdf = await pdf(buffer)

      const info = parsedPdf.text.split(
        /Answer Key\s*&\s*Solutions/i
      )[0]

      function chunkInfo(text, chunkSize, overlap) {
        const questions = text.split(
          /(?=Question\s+\d+\b)/i
        )

        const validQuestions = questions.filter(q =>
          /^Question\s+\d+\b/i.test(q.trim())
        )

        if (validQuestions.length > 1) {
          return validQuestions.map(content => ({
            content: content.trim(),
            number: content.match(
              /question\s+(\d+)/i
            )?.[1]
          }))
        }

        const words = text.split(/\s+/)
        const chunks = []

        for (
          let i = 0;
          i < words.length;
          i += chunkSize - overlap
        ) {
          chunks.push({
            content: words.slice(i, i + chunkSize).join(' ')
          })
        }

        return chunks
      }

      const chunks = chunkInfo(info, 50, 10)
      const questionContext = []

      for (const chunk of chunks) {
        const response = await fetch(`${OLLAMA_URL}/api/embed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'nomic-embed-text',
            input: chunk.content
          })
        })

        const text = await response.text()

        if (!response.ok) {
          throw new Error(`Embedding failed: ${text}`)
        }

        let embeddingData

        try {
          embeddingData = JSON.parse(text)
        } catch {
          throw new Error(`Invalid embedding response: ${text}`)
        }

        const { data, error } = await supabase.rpc(
          'match_documents',
          {
            query_embedding: embeddingData.embeddings[0],
            match_count: 3
          }
        )

        if (error) throw error

        questionContext.push({
          question: chunk.content,
          number: chunk.number,
          context: data.map(item => item.content).join('\n\n')
        })
      }

      const answer = await askDeepSeek(`
You are a document question-answering assistant.

Answer the user's exact question using the supplied context.
Do not invent facts. If the context has no useful information,
say "I don't know."

User's request:
${question || 'Answer the questions from this paper.'}

Questions and relevant context:
${JSON.stringify(questionContext, null, 2)}
`)

      return Response.json({ answer })
    }

    // NORMAL TEXT QUESTIONS.
    const body = await request.json()
    const question = body.question

    if (!question?.trim()) {
      return Response.json(
        { message: 'Please enter a question' },
        { status: 400 }
      )
    }

    // Decide which source is needed.
    const decision = await classifyQuestion(question)
    console.log('Question category:', decision)

    // TRAVELERS: use MCP only.
    if (decision === 'travelers') {
      const travelerContext = await getTravelerContext()

      const answer = await askDeepSeek(`
Answer the user's question using the traveler database results.
Do not invent records. If the results do not answer the question,
say so.

Traveler database results:
${travelerContext}

Question:
${question}
`)

      return Response.json({ answer })
    }

    // DOCUMENTS: search Supabase only.
    if (decision === 'documents') {
      const context = await searchDocuments(supabase, question)

      const answer = await askDeepSeek(`
Answer the user's question using the document context.
Do not invent facts. If the context is irrelevant or insufficient,
say "I don't know."

Document context:
${context}

Question:
${question}
`)

      return Response.json({ answer })
    }

    // GENERAL: do not call MCP or search Supabase.
    const answer = await askDeepSeek(`
Answer the user's question directly and accurately.
If you do not know the answer, say so.

Question:
${question}
`)

    return Response.json({ answer })
  } catch (error) {
    console.error('AI route error:', error)

    return Response.json(
      { message: error.message || 'An error occurred' },
      { status: 500 }
    )
  }
}
