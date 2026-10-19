import{createClient} from '@supabase/supabase-js'

const NEXT_PUBLIC_SUPABASE_URL=''
const NEXT_PUBLIC_SUPABASE_ANON_KEY=''
const supabase = createClient(
NEXT_PUBLIC_SUPABASE_URL,
NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function deleteDuplicate(){

let documentA

const{data,error}= await supabase
.from('documents')
.select('*')
if(error)
{console.log(error)}

console.log(data.length)
const duplicates=[]

for(let i=0;i<data.length<0;i++){
for(let j=i+1;j<data.length;j++){
const contentA = data[i].content
const contentB= data[j].content
if(JSON.stringify(contentA)===JSON.stringify(contentB)){
duplicates.push({
 idA: data[i].id ,
 idB: data[j].id
})
}
}
}
console.log(duplicates)
if(duplicates.length==0){
console.log('no duplicates')
}


return duplicates
}

deleteDuplicate()
