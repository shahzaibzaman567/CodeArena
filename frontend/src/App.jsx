import { useState } from 'react'
import './App.css'
import { SignedIn, SignedOut, SignInButton, UserButton ,SignOutButton } from '@clerk/clerk-react'

function App() {


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
