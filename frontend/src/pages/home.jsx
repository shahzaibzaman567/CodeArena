import { SignedIn, SignedOut, SignInButton, UserButton ,SignOutButton } from '@clerk/clerk-react'
import { toast } from "react-hot-toast";
import { useQuery } from '@tanstack/react-query';

function HomePage(){
  
  // with tanstack
const {data,isLoading,error , refetch }=useQuery({
  queryFn:() => fetch("api/books").then(res => res.json())
})
  return(
        <>
<div>
        <button className="btn btn-success" onClick={() => {
            toast.error("This is a success toast")
        }}>click here </button>

        <SignedOut/>
        <SignInButton mode="modal">
          <button> Login </button>
        </SignInButton>
        <SignedOut />

        <SignInButton>
          <SignedOut />
        </SignInButton>
        <UserButton/>
      </div>
        </>
    )
}
export default HomePage;