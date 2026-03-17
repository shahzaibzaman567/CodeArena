import { useState } from 'react'
import './App.css'
import { SignedIn, SignedOut, SignInButton, UserButton ,SignOutButton } from '@clerk/clerk-react'
// home work
//rsa 2048 alternative 
//reverse proxy
//front proxy
//RBAC / ABACK
//api Gateway
//rate limitization || this is use for encryption
//Pegasis
//what app kaya use karta ha ka ham message likta ha to os ka pata other user ko lagjata ha 
// Rode map 
//2 to 3 applications 
//CI / CD
//what is cloud computing
//AWS developer associate || Certificate
//Microservices
//Docker
//GraphQL
function App() {
  //count variable
function pra1(name){
  console.log(name.split('').reverse().join(''))
}
pra1("madam")
pra1("shah")


let number = [1,2,3,4,5,1,2,3]
let unique=[];

  for(let i=0 ; i<number.length ; i++){
   let isInclude = unique.includes(number[i]);
      if(!isInclude){
       unique.push(number[i])
      }
      
      // console.log(number[j],number[i])
 console.log(unique)
    }


  return (
    <>
    <h1>Welcome to codeArena</h1>
    <SignedOut>
    <SignInButton mode='modal'>
       <button className=''> 
              Login
        </button>
    </SignInButton>
    </SignedOut>
    
    <SignedIn>
      <SignOutButton/>     
    <UserButton/>
    </SignedIn>
    </>
  )
}

export default App
