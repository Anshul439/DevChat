'use client';  // This tells Next.js to treat this component as a Client Component

import { signIn, signOut, useSession } from 'next-auth/react';

export default function Home() {
  const { data: session } = useSession();
  console.log(signIn);
  

  return (
    <div>
      {!session ? (
        <>
          <p>You are not signed in</p>
          <button onClick={() => signIn('google')}>Sign in with Google</button>
        </>
      ) : (
        <>
          <p>Signed in as {session.user?.email}</p>
          <button onClick={() => signOut()}>Sign out</button>
        </>
      )}
    </div>
  );
}
