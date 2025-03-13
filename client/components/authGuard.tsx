'use client'
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/store/authStore';

export default function AuthGuard({
  children
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const { setTokenResponse } = useAuthStore();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/validate-token', {
          credentials: 'include'
        });
        
        setTokenResponse(response.ok);

        if (!response.ok) {
          router.push('/sign-in');
          return;
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Auth error:', error);
        router.push('/');
      }
    };

    checkAuth();
  }, [router, setTokenResponse]);

  // Add check for window object to handle hydration
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isLoading) {
    return <div>Loading...</div>;
  }

  return <>{children}</>;
}