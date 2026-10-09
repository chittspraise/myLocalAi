import pdf from 'pdf-parse/lib/pdf-parse.js'
import { supabaseServerClient } from '@/lib/supabase/server'



export async function POST(request){

const supabase =  supabaseServerClient 

const  formData = await request.formData()
const file = formData.get('file')

const buffer = Buffer.from(await file.arrayBuffer())
const parse = pdf(buffer)
const result = await parse

const info= result.text

function infoChunks(text,number,overlap){
const words = text.split(/\s+/)
const chunks = []
for(let i=0;i<words.length;i+=number-overlap){
 const chunk = words.slice(i,i+number).join(' ')
 chunks.push(chunk)
}

return chunks
}

const chunks= infoChunks(info,20,5)

async function createEmbeddings(chunks){
const embeddings =[]
for (const chunk of chunks){
try{
const response = await fetch('http://localhost:11434/api/embed',{
    method:'POST',
    headers:{
        'Content-Type':'application/json'
    },
    body:JSON.stringify({
      model:'nomic-embed-text',
      input: chunk,
    }),
})

 const data = await response.json()
 
 if(!response.ok){
  console.log(data.error)
  throw new Error('failed to embed text')
 }
 embeddings.push(data.embeddings[0])
 
}catch(error){
console.log(error)
}
}
return embeddings
}


async function addEmbeddings(){
const embeddings = await createEmbeddings(chunks) 

for(let i=0;i<chunks.length;i++){
const {data,error} = await supabase
.from('documents')
.insert({
   content:chunks[i],
   embedding:embeddings[i]
})

if(error){
console.log(error)
console.log(data)
}
}
}
await addEmbeddings()
return Response.json({
message:'successfully stored the data'
})
}
