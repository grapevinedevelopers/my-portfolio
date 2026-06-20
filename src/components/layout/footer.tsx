// src/components/layout/footer.tsx
'use client'; // Make it a client component to fetch data client-side

import Link from 'next/link';
import { Github, Linkedin, Twitter, Mail } from 'lucide-react';
import { getPersonalDetails } from '@/services/personalDetailsService';
import { useEffect, useState } from 'react';
import type { PersonalDetails } from '@/services/personalDetailsService'; // Import type

export default function Footer() {
  const currentYear = new Date().getFullYear();
  // State to hold fetched personal details
  const [personalDetails, setPersonalDetails] = useState<PersonalDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const details = await getPersonalDetails(); // Fetches details for the current siteId
        setPersonalDetails(details);
      } catch (error) {
        console.error("Footer: Failed to fetch personal details:", error);
        // Keep personalDetails as null on error
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, []); // Fetch only once on mount

  // Use fetched details or fallbacks if details are unavailable or loading
  const siteOwnerName = !loading && personalDetails ? personalDetails.name : 'Site Owner'; // Generic fallback
  const email = !loading && personalDetails ? personalDetails.email : 'mailto:contact@example.com'; // Fallback email
  const githubUrl = !loading && personalDetails?.githubUrl && personalDetails.githubUrl !== '#' ? personalDetails.githubUrl : null;
  const linkedinUrl = !loading && personalDetails?.linkedinUrl && personalDetails.linkedinUrl !== '#' ? personalDetails.linkedinUrl : null;
  const twitterUrl = !loading && personalDetails?.twitterUrl && personalDetails.twitterUrl !== '#' ? personalDetails.twitterUrl : null;

  // Reusable class for footer links
  const linkClasses = "block p-2 rounded-full text-muted-foreground transition-all duration-300 hover:text-primary hover:scale-110 hover:bg-accent/50 dark:hover:bg-accent/10";

  return (
    <footer className="border-t border-border/40 bg-gradient-to-t from-secondary/10 via-background to-background dark:from-secondary/5 dark:via-background dark:to-background">
      <div className="container mx-auto max-w-screen-xl flex flex-col items-center justify-between gap-6 py-10 md:flex-row md:gap-4">
        <div className="text-center text-base text-muted-foreground md:text-left"> {/* Adjusted text size */}
          © {currentYear} {loading ? 'Loading...' : siteOwnerName}. All rights reserved.
        </div>
        <div className="flex items-center space-x-6"> {/* Adjusted space */}
          {/* Email Link */}
          <Link href={`mailto:${email}`} aria-label="Email" className={linkClasses}>
            <Mail className="h-6 w-6" /> {/* Adjusted icon size */}
          </Link>
           {/* Conditionally render GitHub link only if URL is valid */}
           {githubUrl && (
              <Link href={githubUrl} target="_blank" rel="noreferrer noopener" aria-label="GitHub" className={linkClasses}>
                <Github className="h-6 w-6" /> {/* Adjusted icon size */}
              </Link>
           )}
           {/* Conditionally render LinkedIn link only if URL is valid */}
           {linkedinUrl && (
              <Link href={linkedinUrl} target="_blank" rel="noreferrer noopener" aria-label="LinkedIn" className={linkClasses}>
                <Linkedin className="h-6 w-6" /> {/* Adjusted icon size */}
              </Link>
           )}
           {/* Conditionally render Twitter link only if URL is valid */}
           {twitterUrl && (
              <Link href={twitterUrl} target="_blank" rel="noreferrer noopener" aria-label="Twitter" className={linkClasses}>
                 <Twitter className="h-6 w-6" /> {/* Adjusted icon size */}
              </Link>
           )}
        </div>
      </div>
    </footer>
  );
}
