import { supabaseServerClient } from '@/lib/supabase/server'
import pdf from 'pdf-parse/lib/pdf-parse.js'


export async function POST (request){
const supabase = supabaseServerClient

if(request.headers.get('content-type')?.includes('multipart/form-data')){
const formData = await request.formData()

const  file = formData.get('file')
const question = formData.get('question')

if(!file){
return;
}


const buffer = Buffer.from(await file.arrayBuffer())
const parse = pdf(buffer)
const result = await parse

const info = result.text.split(/Answer Key\s*&\s*Solutions/i)[0]
async  function chunkInfo(text,chunkSize,overlap){
 const questions = text.split(/(?=Question\s+\d+\b)/i)
 const validQuestions = questions.filter(q =>
  /^Question\s+\d+\b/i.test(q.trim())
)
 if(validQuestions.length>1){
  return validQuestions.map(content=>({
   content:content.trim(),
   number:content.match(/question\s+(\d+)/i)?.[1]
  }))
 
 }

 const words = text.split(/\s+/)
 const chunks= []

 for(let i=0;i<words.length;i+=chunkSize-overlap){
  const chunk= words.slice(i,i+chunkSize).join(' ') 
  chunks.push({
    content:chunk
  })
 }
return chunks
}
 const chunks = await chunkInfo(info,50,10)
 console.log(chunks.map(q => q.number))

 console.log(chunks)
async function createChunkEmbeddings(chunks){
const embeddings = []

 try{
  for( const chunk of chunks){
  const response = await fetch('http://localhost:11434/api/embed',{
    method:'POST',
    headers:{
      'Content-Type':'application/json'
    },
    body:JSON.stringify({
    model:'nomic-embed-text',
    input:chunk.content
    })
   })
  const data = await response.json()
  if(!response.ok){
  throw new Error('failed to embedd')
  }
  embeddings.push(data.embeddings[0]) 
}
return embeddings 

}catch(error){
  throw new Error('failed.Please try again')
}
}

const embeddings = await createChunkEmbeddings(chunks)

async function semanticSearch(embeddings,count){
const results=[]
for (const embedding of embeddings){
const {data,error} = await supabase
.rpc('match_documents',{
query_embedding:embedding,
match_count:count
})
if(error){
console.log(error)
throw new Error(error.message)
}
results.push(data)

}
return results
}
const semanticResults =  (await  semanticSearch (embeddings,3))
const questionContext = semanticResults
.map((results,index)=>({
  question:chunks[index].content,
  number:chunks[index].number?? index+1,
  context: results.map(item=>item.content).join('\n\n')
}))
console.log(JSON.stringify(questionContext, null, 2))
try{
  const response = await fetch('http://localhost:11434/api/chat',{
  method:'POST' ,
  headers:{
    'Content-Type':'application/json'
  },
  body:JSON.stringify({
   model:'deepseek-r1:1.5b',
   messages:[{
    role:'user',
    content:  `
You are a document question-answering assistant.

Instructions:
1. Answer the user's request using only the provided context.
2. If a question cannot be answered from the context, say "I don't know."
3. Do not guess or invent information.

User's request:
${question || 'Answer the following questions from this paper.'}

Questions and relevant context:
${JSON.stringify(questionContext, null, 2)}
`
   }],
   
   stream:false
  })
  })

const data = await response.json()
console.log(data)
if(!response.ok){
  throw new Error('failed to respond')
}
return Response.json({
answer: data.message.content
})
}catch(error){
  return Response.json({
   error:'failed to respond' 
  })
}

}else{

const body = await request.json()
const question = body.question


async function createQuestionEmbedding (question){
 try {const response = await  fetch('http://localhost:11434/api/embed',{
  method:'POST',
  headers:{
    'Content-Type':'application/json'
  },
  body:JSON.stringify({
  model:'nomic-embed-text',
  input : question
  }),
  
})
const data = await response.json()
if(!response.ok){
  console.log(data.error)
  throw new Error('failed to embedd')
}

return data.embeddings[0]

 }catch(error){
 console.log(error)
 }

}
const questionEmbedding = await createQuestionEmbedding(question)

async function semanticSearch(questionEmbedding,count){
const {data,error}= await supabase
.rpc('match_documents',{
  query_embedding:questionEmbedding,
  match_count:count
})
if(error){
  console.log(data)
}


return data
}

const semanticInfo= await semanticSearch(questionEmbedding,3)

const context = semanticInfo.map((item)=>(
 item.content 
)).join('\n\n')
console.log(context)

try{
const response = await fetch('http://localhost:11434/api/chat',{
  method:'POST',
  headers:{
    'Content-Type':'application/json'
  },
  body: JSON.stringify({
  model: 'deepseek-r1:1.5b',
  messages: [{
    role: 'user',
    content: `
You are a document question-answering assistant.

Instructions:
1. Answer ONLY using the information in the context.
2. If the context does not contain enough information to answer, say "I don't know."
3. Do not use your own knowledge.
4. Do not guess or make up information.

Context:
${context}

Question:
${question}

Answer:
`
  }],
  stream: false
})
})

const data = await response.json()
console.log(data)

if(!response.ok){
throw new Error('failed to respond')
}
return Response.json({
 answer: data.message?.content
})

}catch(error){
console.log(error)

return Response.json({
 message: error.message || 'An error occurred' 
}, { status: 500 })
}
}

}
