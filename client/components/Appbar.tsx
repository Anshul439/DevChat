'use client'

import {signIn, signOut, useSession } from "next-auth/react"

const Appbar = () => {
const session = useSession()
  return (
    <div>
      <button
        onClick={() => {
          signIn();
        }}
      >
        Signin
      </button>
      <button
        onClick={() => {
          signOut();
        }}
      >
        Signout
      </button>

      {JSON.stringify(session)}
    </div>
  );
};

export default Appbar;
