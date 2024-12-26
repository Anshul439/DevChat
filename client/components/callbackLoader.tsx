'use client'

import { Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

const LoadingPage = () => {

    const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  useEffect(() => {
    if (code) {
      exchangeCodeForToken(code);
    }
  }, [code]);

  const exchangeCodeForToken = async (code: string) => {
    try {
      const response = await fetch('http://localhost:8000/api/auth/github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
        credentials: 'include',
      });
      console.log(response);
      

      const data = await response.json();
      console.log(data);
      
      if (data.success) {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Authentication error:', error);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <Loader2 className="animate-spin text-blue-500" size={48} />
    </div>
  );
};

export default LoadingPage;
