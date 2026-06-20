// src/app/admin/layout.tsx
'use client';

import { useAuth } from '@/context/AuthContext';
import Login from '@/components/auth/Login';
import { type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state
import { AlertTriangle } from 'lucide-react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, loading, authInitialized } = useAuth(); // Add authInitialized

  if (loading) {
    // Show a loading state while checking authentication
    return (
      <div className="container mx-auto p-8 flex justify-center items-center min-h-[calc(100vh-10rem)]">
         <div className="space-y-4 w-full max-w-md">
            <Skeleton className="h-8 w-3/4 mx-auto" />
            <Skeleton className="h-6 w-1/2 mx-auto" />
             <Skeleton className="h-12 w-full mt-6" />
        </div>
      </div>
    );
  }

  // If auth failed to initialize, show an error message instead of Login/children
  if (!authInitialized) {
     return (
       <div className="container mx-auto p-8 flex flex-col justify-center items-center min-h-[calc(100vh-10rem)] text-center text-destructive">
           <AlertTriangle className="w-12 h-12 mb-4" />
           <h2 className="text-xl font-semibold mb-2">Authentication Error</h2>
           <p>Could not initialize Firebase Authentication.</p>
           <p>Please check your Firebase configuration and environment variables.</p>
       </div>
     );
  }


  if (!user) {
    // If user is not logged in, show the Login component
    return <Login />;
  }

  // If user is logged in, render the admin page content
  return <>{children}</>;
}