import { createClient } from '@supabase/supabase-js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'


const NEXT_PUBLIC_SUPABASE_URL='https://rjntkaamdisyykpgjezm.supabase.co'
const NEXT_PUBLIC_SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqbnRrYWFtZGlzeXlrcGdqZXptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMjU3MjMsImV4cCI6MjA2NjcwMTcyM30.SnkV3sMLF_Mw38JZieZxocY-aAkCAO0-MLzmo_ZkpZk'

const supabase = createClient(
NEXT_PUBLIC_SUPABASE_URL,
NEXT_PUBLIC_SUPABASE_ANON_KEY
)
const server = new McpServer({
  name: 'myai-database',
  version: '1.0.0'
})

server.tool(
  'query_travelers',
  'Retrieve traveler names from the travel table.',
  {},
  async () => {
    const { data, error } = await supabase
      .from('travel')
      .select('traveler_name')
      .limit(5)

    if (error) {
      return {
        content: [{ type: 'text', text: error.message }],
        isError: true
      }
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(data, null, 2)
      }]
    }
  }
)

const transport = new StdioServerTransport()
await server.connect(transport)