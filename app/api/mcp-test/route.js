
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import path from 'node:path'

export const runtime = 'nodejs'

export async function GET() {
  const client = new Client({
    name: 'myai-client',
    version: '1.0.0'
  })

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.join(process.cwd(), 'mcp-server.js')],
    cwd: process.cwd()
  })

  try {
    await client.connect(transport)

    const tools = await client.listTools()

   /* const result = await client.callTool({
      name: 'query_travelers',
      arguments: {}
    })*/

    return Response.json(tools)
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    )
  } finally {
    await client.close()
  }
}
