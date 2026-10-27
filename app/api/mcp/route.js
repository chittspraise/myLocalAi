import{StdioClientTransport} from'@modelcontextprotocol/sdk/client/stdio.js'
import {Client} from '@modelcontextprotocol/sdk/client/index.js'
import path from 'node:path'

export async function POST(request){
const body = await request.json()
const message = body.message

async function classifyMessage(){

try{
    const response = await fetch('http://localhost:11434/api/chat',{
    method:'POST',
    headers:{
    'Content-Type':'application/json'
    },
    body:JSON.stringify({
    model:'deepseek-r1:1.5b',
    options:{ temperature: 0 },
    messages:[{role:'user',
    content:`
    Classify the question into exactly one category:

maths - the question asks to add numbers, e.g. "3 + 2" or "add 10 and 5"
tools - the question only asks what tools you have or can use, e.g. "what tools do you have?" or "show me tools". It does NOT ask you to do something.
addtraveller - the question asks to add or save a traveller or user in the database, e.g. "add John Smith as a traveller" or "add a user to the database"
querytravellers - the question asks to get, list or show travellers in the database, e.g. "get me all travellers" or "who is in the database?"

Rules:
If the question says "add" with numbers, it is maths.
If the question says "add" with a person's name, it is addtraveller.

Reply with only one word: maths, tools, addtraveller, querytravellers or general.

Question: ${message}
    `}],
    stream:false
    })
    })
    if(!response.ok){
    throw new Error(error)
    }
const data = await response.json()
console.log(data)
const finalanswer =  data.message.content
.replace(/<think>[\s\S]*?<\/think>/gi,
    ''
  ).trim().toLowerCase()

const match = finalanswer.match(/\b(maths|querytravellers|tools|addtraveller)\b/)

const decision = match?.[0]
console.log(decision)

return decision
}
catch(error){
console.log(error)
}
}

const decision = await classifyMessage()
if(decision==='querytravellers'){
  const data = await getTravellers()
  const traveller = JSON.parse(data.content[0].text)
const list  =  traveller.map((t)=>{
  return `${t.traveler_name} from ${t.from_country} to ${t.to_country} with a budget of ${t.budget}`
}).join('\n')
 
  return Response.json({
    answer:list 
  })
}



if(decision==='maths'){
const data= await add()
console.log(data)  
return Response.json({
answer:data
}) 
}
if(decision==='tools'){
const data =  await listTools()
console.log(data)
const tools = data.tools.map(t=>`${t.name}:${t.description}`).join('\n')
console.log(tools)
return Response.json({
answer : tools
})
}
if(decision === 'addtraveller' || decision === 'general'){

const response = await addTraveller()
const info =JSON.parse(response.content[0].text)

return Response.json({
  answer:`Successfully added ${info[0].traveler_name} who is travelling 
  from ${info[0].from_country} to ${info[0].to_country} on ${info[0].departure_date} with a budget of ${info[0].budget}
  to our database`
})

}


return Response.json({
answer:'i dont know'
})

async function extractInfo(){
  
try { const response  = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'deepseek-r1:1.5b',
      messages: [{
        role: 'user',
       content: `
Extract the trip details from the message. Return only JSON with exactly these keys:

traveler_name: the PERSON's name (never a place)
from_country: where they travel FROM
to_country: where they travel TO
departure_date: format YYYY-MM-DD
budget: the number as a string, e.g. "45000"

Use null if missing.

Example:
Message: "John is going to Rome from Lusaka on 5 March 2027, budget 20000"
{"traveler_name":"John","from_country":"Lusaka","to_country":"Rome","departure_date":"2027-03-05","budget":"20000"}

Message: ${message}
`
      }],
      stream: false
    })
  })

  if (!response.ok) {
    throw new Error('Failed to extract information')
  }

  const data = await response.json()
  return data

} catch (error) {
  console.error(error)
  return Response.json(
    { error: 'Failed to extract information' },
    { status: 500 }
  )
}
}
async function add(){

const numbers = message.match(/\d+/g)
const a = Number(numbers[0])
const b = Number(numbers[1])

const client = new Client ({
name:'myai-client',
version:'1.00'
})

const transport = new StdioClientTransport({
    command: process.execPath,
    args:[path.join(process.cwd(),'mcpp-server.js')],
    cwd:process.cwd()
})
try{
await client.connect(transport)
const response = await client.callTool({
name:'add_numbers',
arguments:{
    a:a,
    b:b}
})

const answer = JSON.parse(response.content[0].text)

return answer

}catch(error){

}
finally{
await client.close()
}
}
async function addTraveller (){

const data =  await extractInfo()
console.log('extarcted data:',data.message)


const travelerInfo =  data.message.content
const start = travelerInfo.indexOf('{')
const end = travelerInfo.lastIndexOf('}')
const info = travelerInfo.slice(start,end+1)
const travelerData = JSON.parse(info)
const {traveler_name:name,to_country: destination,
from_country:origin,budget,departure_date}= travelerData 


const client = new Client({
  name:'mcp_client' ,
  version:'1.00' 
})

const transport = new StdioClientTransport({
   command: process.execPath ,
   args:[path.join(process.cwd(),'mcpp-server.js')],
   cwd:process.cwd()
})
try{ 
  await client.connect(transport)
  const response = await client.callTool({
 name:'add_traveller',
 arguments:{ traveler_name: name,
        from_country: origin,
        to_country: destination,
        departure_date: departure_date,
        budget: budget
}

  })

  

return response

}catch(error){
console.error(error)
}
finally{
await client.close()
}
 
}
async function listTools(){

const transport = new StdioClientTransport({
    command:process.execPath,
    args:[path.join(process.cwd(),'mcpp-server.js')],
    cwd:process.cwd()
})

const client = new Client({
name:'mcp-client',
version:'1.00'
})

try{

await client.connect(transport)
const tools = await client.listTools()
return tools

}catch(error){
console.error(error)
}
finally{
await client.close()
}
}}

async function getTravellers(){
 const client = new Client({
  name:'myai-client',
  version:'1.00'
}) 
const transport = new StdioClientTransport({
command: process.execPath,
args:[path.join(process.cwd(),'mcpp-server.js')],
cwd:process.cwd()
})
try{
await client.connect(transport)
const response  = await client.callTool({
name:'query_travellers',
arguments:{} 
})

console.log(response)
return response
}catch(error){
console.error(error.message)

}finally{
await client.close()
}


}