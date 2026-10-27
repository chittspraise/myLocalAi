import{McpServer} from  '@modelcontextprotocol/sdk/server/mcp.js'
import{StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js'
import{createClient} from '@supabase/supabase-js'
import z from 'zod'


const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const supabase= createClient(url,key)


const server = new McpServer({
name:'myai-server',
version:'1.00'
})

server.tool(
  'add_traveller',
  'function to add travellers',
  {
    traveler_name: z.string().describe('Full name of the traveller'),
    from_country: z.string().describe('Country travelling from'),
    to_country: z.string().describe('Country travelling to'),
    departure_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Departure date, YYYY-MM-DD'),
    return_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Return date, YYYY-MM-DD'),
    budget: z.string().optional().describe('Budget, e.g. R5000'),
    notes: z.string().optional().describe('Extra notes'),
    is_available: z.boolean().optional().describe('Defaults to true')
  },
  async (args) => {
    const { data, error } = await supabase
      .from('travel')
      .insert(args)
      .select()
    if(error){
      return {content:[{
        type:'text',
        text:`error:${error.message}`,
        }],
        isError:true
    }
    }

     return {
        content:[{
            type:'text',
            text:JSON.stringify(data,null,2)
        }]
     }        
   }  
)

server.tool(
  'add_numbers',
  'function to add numbers',
  { a: z.number(),
    b:z.number()
  },
   async ({a,b})=>{
    const result = a+b
   return {
    content:[{type:'text',
    text: JSON.stringify(result)
    }]
   }
  })


server.tool(
'query_travellers',
'get all travellers from the database',{

},
async()=>{
const {data,error} = await supabase
.from ('travel')
.select('*')
if(error){
return {
  content:[{
    type:'text',
    text:error.message
  }],
  isError:true
}}
return {
  content:[{
  type:'text',
  text:JSON.stringify(data,null,2)
  }]
}
})

  const transport =  new StdioServerTransport()
  console.log(transport)
  await server.connect(transport)