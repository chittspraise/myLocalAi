import pdf from 'pdf-parse/lib/pdf-parse.js'


export async function POST(request){

try{

    const formData = await request.formData()
    const file = formData.get('file')
    const question = formData.get('question')
    if (!file) {
      return Response.json({ message: 'No file provided' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await  pdf(buffer)


   const response = await fetch('http://localhost:11434/api/chat',{
    method:'POST',
    headers:{
      'Content-Type':'application/json'
    },
    body:JSON.stringify({
    model:'deepseek-r1:1.5b',
    messages:[{
        role:'user',
        content:
           `PDF:${result.text}
           question:${question}`
       }

    ],
    stream:false,
     options: {
    num_ctx: 8192
  },
  })
   })

   const data = await response.json()
   if (!response.ok) {
  console.log(data)
  throw new Error('failed to respond')
  }
   

   return Response.json({
    message: data.message.content
    
 })

}catch(error){
console.log(error.message)

return Response.json({
message:'failed to parse pdf'
}, { status: 500 })}

}