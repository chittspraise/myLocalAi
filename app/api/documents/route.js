import pdf from 'pdf-parse/lib/pdf-parse.js'
import { supabaseServerClient } from '@/lib/supabase/server'

const supabase = supabaseServerClient

export async function POST(request){
const formData = await request.formData()
const file = formData.get('file')
if(!file){
return Response.json({
error:'failed to receive file'  
})
}
const buffer = Buffer.from(await file.arrayBuffer())
const parse =  pdf(buffer)
const data = await parse

const text = data.text

try{
   const {data,error}= await supabase
   .from('infomation')
   .insert({
   text:text
   })
   .select()
    
if(error){
console.log(error)
throw new Error('failed to  upload')
}
console.log(data)
}catch(error){
   return Response.json({
      error:'failed to load information'
   })
}
return Response.json({
   answer: text
})
}