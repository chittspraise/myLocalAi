import {updateSession} from './lib/supabase/proxy.js'

export function proxy(request){
return updateSession(request)
}

export const config={
    matcher:[
      '/','/auth'
    ]
}


