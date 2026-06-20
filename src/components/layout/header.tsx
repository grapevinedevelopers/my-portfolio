// src/components/layout/header.tsx
'use client'; // Mark as Client Component

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Menu, LogIn, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import { getPersonalDetails } from '@/services/personalDetailsService'; // Import service

const NavLink = ({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <Link
    href={href}
    className={cn(
      'text-base font-medium text-muted-foreground transition-colors hover:text-primary px-4 py-2 rounded-lg hover:bg-accent/50 dark:hover:bg-accent/10', // Increased padding
      className
    )}
  >
    {children}
  </Link>
);

const MobileNavLink = ({ href, children, onClick }: { href?: string; children: React.ReactNode, onClick?: () => void }) => (
  <SheetClose asChild>
    {href ? (
      <Link
        href={href}
        className="block px-4 py-3 rounded-lg text-muted-foreground transition-colors hover:text-primary hover:bg-accent/50 dark:hover:bg-accent/10 text-lg font-medium" // Increased padding
      >
        {children}
      </Link>
    ) : (
      <button
        onClick={onClick}
        className="block w-full text-left px-4 py-3 rounded-lg text-muted-foreground transition-colors hover:text-primary hover:bg-accent/50 dark:hover:bg-accent/10 text-lg font-medium" // Increased padding
      >
        {children}
      </button>
    )}
  </SheetClose>
);

export default function Header() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [siteName, setSiteName] = useState<string>('Portfolio'); // Default generic name

  // Fetch personal details to get the site owner's name
  useEffect(() => {
    const fetchSiteName = async () => {
      try {
        const details = await getPersonalDetails(); // Fetches details for the current siteId
        if (details && details.name && !details.name.startsWith('Your Name')) { // Check if name exists and is not the default placeholder
          setSiteName(details.name);
        } else {
             setSiteName('Portfolio'); // Fallback if no specific name is set
        }
      } catch (error) {
        console.error("Header: Failed to fetch personal details for site name:", error);
        setSiteName('Portfolio'); // Fallback on error
      }
    };
    fetchSiteName();
  }, []); // Fetch only once on mount

  const handleSignOut = async () => {
    if (!auth) {
      console.error('Firebase Auth is not initialized.');
      toast({
        title: "Error",
        description: "Authentication service not available.",
        variant: "destructive",
      });
      return;
    }
    try {
      await signOut(auth);
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      });
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Sign Out Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container mx-auto flex h-20 max-w-screen-xl items-center"> {/* Adjusted height */}
        <Link href="/" className="mr-8 flex items-center space-x-3"> {/* Adjusted spacing */}
          {/* Logo SVG */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-8 w-8 text-primary" // Adjusted size
          >
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          {/* Use dynamic site name or fallback */}
          <span className="font-bold text-xl sm:inline-block">{siteName}</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden flex-1 items-center justify-end space-x-2 md:flex"> {/* Adjusted space */}
          <NavLink href="/#about">About</NavLink>
          <NavLink href="/#blog">Blog</NavLink>
          <NavLink href="/#projects">Projects</NavLink>
          <NavLink href="/#resume">Resume</NavLink>

          <NavLink href="/#contact">Contact</NavLink>
          {/* Admin/Auth Button - Desktop */}
          <div className="flex items-center space-x-2 pl-4"> {/* Added pl-4 */}
            {!loading && ( // Only render when auth state is determined
              user ? (
                <Button variant="outline" size="sm" onClick={handleSignOut} className="rounded-full">
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </Button>
              ) : (
                <Button variant="outline" size="sm" asChild className="rounded-full">
                  <Link href="/admin">
                    <LogIn className="mr-2 h-4 w-4" /> Admin Login
                  </Link>
                </Button>
              )
            )}
          </div>
        </nav>

        {/* Mobile Navigation Trigger */}
        <div className="flex flex-1 items-center justify-end md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full w-10 h-10" aria-label="Toggle Menu"> {/* Adjusted size and rounded */}
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] p-6">
              <nav className="grid gap-6 text-lg font-medium mt-10"> {/* Adjusted gap */}
                <Link href="/" className="flex items-center gap-3 text-lg font-semibold mb-6 border-b pb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-7 w-7 text-primary"
                  >
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                  {/* Use dynamic site name or fallback */}
                  <span>{siteName}</span>
                </Link>
                <MobileNavLink href="/#about">About</MobileNavLink>
                <MobileNavLink href="/#blog">Blog</MobileNavLink>
                <MobileNavLink href="/#projects">Projects</MobileNavLink>
                <MobileNavLink href="/#resume">Resume</MobileNavLink>

                <MobileNavLink href="/#contact">Contact</MobileNavLink>
                <hr className="my-4 border-border/40" />
                {/* Mobile Auth Button */}
                 {!loading && (
                    user ? (
                        <MobileNavLink onClick={handleSignOut}>
                            <LogOut className="mr-2 h-5 w-5" /> Logout
                        </MobileNavLink>
                    ) : (
                        <MobileNavLink href="/admin">
                             <LogIn className="mr-2 h-5 w-5" /> Admin Login
                         </MobileNavLink>
                    )
                 )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
