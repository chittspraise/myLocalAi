import {NextResponse} from 'next/server'
import {createServerClient} from '@supabase/ssr'

export async function updateSession(request){
let supabaseResponse= NextResponse.next({
    request
})
const supabase = createServerClient (
process.env.NEXT_PUBLIC_SUPABASE_URL,
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{

cookies:{
    getAll(){
        return request.cookies.getAll()
    },
    setAll(cookiesToSet){
    cookiesToSet.map(({name,value})=>{
     request.cookies.set(name,value)
    })  
    supabaseResponse = NextResponse.next({
        request
    })
    cookiesToSet.map(({name,value,options})=>{
    supabaseResponse.cookies.set(name,value,options)
    })
}

}
}
)
const{data:{user},error}= await supabase.auth.getUser()

console.log('Path:', request.nextUrl.pathname)
console.log('User:', user?.id)
console.log('Auth error:', error?.message)
if(!user && request.nextUrl.pathname==='/'){
return NextResponse.redirect(
new URL('/auth',request.url)
)
}
if(user && request.nextUrl.pathname==='/auth'){
    return NextResponse.redirect(
    new URL('/',request.url))
}

return supabaseResponse
}