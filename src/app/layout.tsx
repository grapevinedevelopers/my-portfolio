// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { cn } from '@/lib/utils';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/context/AuthContext';
import { getPersonalDetails } from '@/services/personalDetailsService'; // Service is now site-aware

// --- Open Graph & Metadata Generation ---

// Define default metadata values
const defaultMetadata = {
  title: 'Personal Portfolio & Blog', // More generic title
  description: 'A personal portfolio and blog website.',
  defaultImage: '/default-og-image.png', // A generic default OG image
};

// Function to generate metadata dynamically based on siteId
export async function generateMetadata(): Promise<Metadata> {
  let ogImageUrl = defaultMetadata.defaultImage;
  let title = defaultMetadata.title;
  let description = defaultMetadata.description;
  const siteId = process.env.NEXT_PUBLIC_SITE_ID || 'default-site'; // Get current site ID

  try {
    // Fetch details for the current site
    const details = await getPersonalDetails(); // Fetches details for the current siteId

    if (details && details.name !== `Your Name (${siteId})`) { // Check if details are fetched and not the default placeholder name
      title = `${details.name} | ${details.title}`; // Use site-specific name/title
      description = details.bio.substring(0, 160); // Use site-specific bio

      // Use site-specific profile image if it's a valid URL (not Base64)
      if (details.profileImageUrl && details.profileImageUrl.startsWith('http')) {
        ogImageUrl = details.profileImageUrl;
      } else {
        console.warn(`Profile image for site "${siteId}" is Base64 or invalid/missing, falling back to default OG image: ${ogImageUrl}`);
        ogImageUrl = defaultMetadata.defaultImage; // Ensure fallback
      }
    } else {
      console.warn(`Could not fetch valid personal details for site "${siteId}" to generate metadata. Using defaults.`);
      // Use default values if fetching fails or returns default placeholder data
      title = defaultMetadata.title;
      description = defaultMetadata.description;
      ogImageUrl = defaultMetadata.defaultImage;
    }
  } catch (error) {
    console.error(`Error fetching personal details for metadata (Site: ${siteId}):`, error);
    // Use default values if fetching fails
    title = defaultMetadata.title;
    description = defaultMetadata.description;
    ogImageUrl = defaultMetadata.defaultImage;
  }

  // Construct the absolute URL for the OG image
   // Ensure the base URL ends with a slash if the image URL starts with one, or vice versa
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
  let absoluteOgImageUrl = ogImageUrl;

  if (ogImageUrl.startsWith('/') && baseUrl) {
       absoluteOgImageUrl = `${baseUrl.replace(/\/$/, '')}${ogImageUrl}`;
  } else if (!ogImageUrl.startsWith('http')) {
       // If it's a relative path not starting with '/', assume it's relative to base URL
       absoluteOgImageUrl = `${baseUrl.replace(/\/$/, '')}/${ogImageUrl.replace(/^\//, '')}`;
  }
   // If ogImageUrl is already an absolute URL (http/https), use it directly

  console.log(`Metadata Generation (Site: ${siteId}): Title: "${title}", Description: "${description.substring(0,50)}...", OG Image: ${absoluteOgImageUrl}`);


  return {
    metadataBase: process.env.NEXT_PUBLIC_BASE_URL ? new URL(process.env.NEXT_PUBLIC_BASE_URL) : undefined,
    title: title,
    description: description,
    openGraph: {
      title: title,
      description: description,
      images: [
        {
          url: absoluteOgImageUrl, // Use the determined absolute URL
          width: 400, // Consider making dimensions dynamic or using a standard size
          height: 400,
          alt: `${title} - Profile Image`,
        },
      ],
      type: 'website',
      url: process.env.NEXT_PUBLIC_BASE_URL || undefined, // Use the site's base URL
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
      images: [absoluteOgImageUrl],
      // Consider adding a site-specific Twitter handle if available in details
      // creator: details?.twitterHandle ? `@${details.twitterHandle}` : undefined,
    },
  };
}

// Optional: Define Viewport settings
export const viewport: Viewport = {
  themeColor: '#ffffff', // Example theme color (Update based on actual theme)
};


// --- Root Layout Component ---
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      {/* Add Google Fonts link tags */}
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased'
        )}
      >
        <AuthProvider> {/* Auth context remains global */}
          <div className="relative flex min-h-dvh flex-col bg-background">
            <Header /> {/* Header component */}
            <main className="flex-1">{children}</main>
            <Footer /> {/* Footer component */}
          </div>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
