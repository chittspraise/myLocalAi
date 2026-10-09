'use client'
import {useState, useRef, useEffect} from 'react'
import styles from './page.module.css'

export default  function Home (){
const[fileName,setFileName]=useState('')
const[message,setMessage]=useState('')
const[error,setError] =useState('')
const[conversation,setConversation]=useState([])
const[file,setFile]=useState(null)
const conversationEndRef = useRef(null)

useEffect(() => {
  conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' })
}, [conversation, error])


function handleFileUpload(e){
const file = e.target.files[0]
if(file){
setFileName(file.name)
setFile(file)
}
}
function handleText(e){
setMessage(e.target.value)

}
async function sendFile(){
 
  if(!file){
    setError('no file attached ')
    return
  }
  const formData = new FormData()
  formData.append('file',file)

  const UserMessage={
    role:'user',
    content:{
      file:file.name,
    }
  }
  setConversation(prev=>[...prev,UserMessage])
  setFileName('')

  try{const response = await fetch('/api/embed',{
   method:'POST',
   body:formData 
  })

  const data = await response.json()
  if(!response.ok){
    throw new Error('An error ocuured. Please try again')
  }

const aiMessage={
  role:'ai',
  content: data.message || data.answer
}
setConversation(prev=>[...prev,aiMessage])
  
 }catch(error){
 setError(error.message)
}
}

async function sendMessage(){
  
  if(!message){
    setError('No text to send ')
    return;
  }
  setError('')

 if(file){
 const formData = new FormData()
 formData.append('file',file)
 formData.append('question',message)

 const userMessage={
  role:'user',
  content:`${file.name}\n${message}`
 }
 setConversation(prev=>[...prev,userMessage])
 setMessage('')
 setFileName('')

 try { 
  const response = await fetch('/ai/ask',{
    method:'POST',
    body:formData
  })
  
  const data = await response.json()


  if(!response.ok){
  throw new Error('failed to respond')
  }

setConversation(prev=>[...prev,aiMessage])
  const aiMessage={
   role:'AI',
   content:data.answer
  }

}catch(error){
  setError(error.message)
}
return
}
  const userMessage={
  role:'user',
  content:message,
  }

 setConversation(prev=>[...prev,userMessage])
 setMessage('')
  try{
    const response = await fetch('/ai/ask',{
      method:'POST',
      headers: {
    'Content-Type': 'application/json'
  },
      body:JSON.stringify({
        question:message
      })
    })

    const data = await response.json()
    if(!response.ok || !data.answer){
      throw new Error (data.message || 'Failed to respond. Please try again')
    }

  const assistantMessage={
   role:'AI',
   content:data.answer
    }
   setConversation(prev=>[...prev,assistantMessage])

  }
  catch(error){
  setError(error.message || 'An Error occured, Please try again')
  console.log(error)
}
}
return (
 <div className={styles.container}>
  <div className={styles.conversation}>
  {conversation.map((message,index)=>{
    return (
    <div key={index}
      className={
        message.role==='user' ?
        styles.userMessage:
        message.role==='error' ?
        styles.errorMessage:
        styles.aiMessage
      }
    >
      <strong>{message.role}:{' '}</strong>
      {typeof message.content ==='string' ?
      (<span>{message.content}</span>): message.content ? (
      <span>{message.content.file && <div>{message.content.file}</div>}
      <div>{message.content.message}</div>
      </span>
    ) : null
      }
      
    </div>
    )
  })}
  {error && (
    <div className={styles.errorMessage}>
      <strong>Error:{' '}</strong>
      <span>{error}</span>
    </div>
  )}
  <div ref={conversationEndRef} />
  </div>
  <div className={styles.inputRow}>
  <img src={'/images/iss.png'}
  className={styles.clipIcon}
  onClick={()=>document.getElementById('fileInput').click()}
  />
  {fileName  &&(<p className={styles.response}>{fileName}</p> )}
  <input
  style={{display:"none"}}
  id="fileInput"
  type='file'
  onChange={(e)=>handleFileUpload(e)}
  />
  <button className={styles.dataButton}
  onClick={sendFile}
  
   >
   <img src='/images/knowledge.png'
   className={styles.dataInput}
   />
  </button>
  
  <input 
  className={styles.messageInput}
  placeholder='What can I help you with...'
  value={message}
  onChange={(e)=>handleText(e)}
  onKeyDown={(e)=>{if(e.key === 'Enter') sendMessage()}}
  />
  <img src={'/images/si.png'}
  className={styles.searchIcon}
  onClick={sendMessage}
  />
</div>
 </div>
)
}