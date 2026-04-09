import { useState } from 'react'
import './App.css'
import { SignedIn, SignedOut, SignInButton, UserButton ,SignOutButton } from '@clerk/clerk-react'

import { useUser } from "@clerk/clerk-react";
import { useEffect } from "react";

function App() {

  const { user } = useUser();

  useEffect(() => {
    if (user) {
      fetch("https://your-backend.vercel.app", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkId: user.id,
          email: user.primaryEmailAddress?.emailAddress,
          name: user.fullName,
          profileImage: user.imageUrl,
        }),
      });
    }
  }, [user]);


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
