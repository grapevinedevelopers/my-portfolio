// src/components/auth/Login.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { LogIn, LogOut, User as UserIcon, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, type FormEvent } from 'react';

export default function Login() {
  const { user, loading, authInitialized } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!auth) {
      setError('Firebase Authentication is not initialized.');
      console.error('Firebase Auth is not initialized.');
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Authentication successful, user state will update via context
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else {
        setError(err.message || 'An unknown error occurred during sign-in.');
      }
      console.error("Error during Email/Password Sign-In:", err);
    }
  };

  const handleSignOut = async () => {
    if (!auth) {
      console.error('Firebase Auth is not initialized.');
      return;
    }
    try {
      await signOut(auth);
      setEmail('');
      setPassword('');
      setError(null);
    } catch (error) {
      console.error('Error signing out:', error);
      setError('Failed to sign out.');
    }
  };

  return (
    <div className='flex min-h-[calc(100vh-10rem)] items-center justify-center p-4'>
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Admin Access</CardTitle>
          <CardDescription>
            {user ? `Welcome, ${user.displayName || user.email || 'Admin'}` : "Please sign in to manage content."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-6">
          {loading ? (
            <p>Loading authentication status...</p>
          ) : !authInitialized ? (
            <div className='flex flex-col items-center space-y-2 text-destructive'>
              <AlertTriangle className='w-8 h-8' />
              <p className='text-center text-sm'>
                Authentication failed to initialize. Please check Firebase configuration.
              </p>
            </div>
          ) : user ? (
            <>
              <div className='flex items-center space-x-2 text-muted-foreground'>
                <UserIcon className='w-5 h-5' />
                <span>Signed in as {user.email}</span>
              </div>
              <Button onClick={handleSignOut} variant='outline' className='w-full'>
                <LogOut className='mr-2 h-4 w-4' /> Sign Out
              </Button>
            </>
          ) : (
            <div className="w-full space-y-6">
              <form onSubmit={handleSubmit} className='flex w-full flex-col space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='email'>Email</Label>
                  <Input
                     id='email'
                     type='email'
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     required
                     placeholder="admin@example.com"
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='password'>Password</Label>
                  <Input
                     id='password'
                     type='password'
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     required
                     placeholder="********"
                  />
                </div>
                 {error && <p className='text-destructive text-sm text-center'>{error}</p>}
                <Button type='submit' className='w-full'>
                  Sign In with Email/Password
                </Button>
              </form>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
