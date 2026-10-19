'use client'
import styles from '../page.module.css'
import Signup from './signup'
import Login from './login.js'
import{useState} from 'react'
import {supabaseBrowserClient }from '@/lib/supabase/client.js'
import {useRouter} from 'next/navigation'

const supabase= supabaseBrowserClient

export default function Auth(){

const[name,setName]=useState('')
const[surname,setSurname]=useState('')
const[email,setEmail]=useState('')
const[password,setPassword]=useState('')
const[signup,setSignup]=useState(false)
const[error,setError] = useState('')
const router = useRouter()



function handleName(e){
setName(e.target.value)
}

function handleSurname(e){
    setSurname(e.target.value)
}
function  handleEmail(e){
    setEmail(e.target.value)

}
function handlePassword(e){
    setPassword(e.target.value)
}

function handleForm(){
    setSignup(prev=>!prev)
}

async function handleSignup(){
const{error}= await supabase.auth.signUp({
   email:email,
   password:password ,
   options:{
   name:name,
   surname:surname
   }
})
if(error){
setError(error.message)
console.log(error)
}
else{
    window.alert('Successfully signed up !')
    router.push('/')

}
}

async function handleLogin(){
setError('')
const{data:{user},error}= await supabase.auth.signInWithPassword({
email,
password
})
console.log(user)
if(error){
console.log(error.message)
setError(error.message)
return;
}

console.log('Login successful, navigating home')


router.push('/')
router.refresh()

}

    return(
        
    <div className={styles.authContainer}> 
    
    {signup ? (
     <Signup handleName={handleName}
            handleSurname={handleSurname}
            handleEmail={handleEmail}
            handlePassword={handlePassword}
            name={name}
            surname={surname}
            email={email}
            password={password}
            handleForm={handleForm}
            handleSignup={handleSignup}
            error={error}
            />):
    <Login  handleEmail={handleEmail}
            email={email}
            password={password}
            handlePassword={handlePassword}
            handleForm={handleForm}
            handleLogin={handleLogin}
             error={error}/>}
    </div>
    )
}