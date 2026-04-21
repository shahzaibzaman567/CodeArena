import { useState } from 'react'
import { useUser } from "@clerk/clerk-react";
import { useEffect } from "react";
import {Routes,Route, Navigate} from "react-router-dom"
import HomePage from './pages/home.jsx';
// import AboutPage from './pages/about.jsx';
import ProbelmsPage from './probelmsPages/problemspage.jsx';
import { Toaster } from "react-hot-toast";
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

  const {isSignedIn} = useUser();


  return (
    <>
    <Routes>
    <Route path="/" element={<HomePage/>}></Route>
    {/* <Route path="/about" element={<AboutPage/>}></Route> */}
    <Route path="/problems" element={isSignedIn ? <ProbelmsPage/>:<Navigate to={"/"}/>}></Route>
    </Routes>
    <Toaster position='top-right' toastOptions={{duration:3000}}/>
    </>
  )
}

export default App

// tw daisyui , react-router-dom , reafct-hot-toast
//todo : react-query aka tanstack query ,axios
