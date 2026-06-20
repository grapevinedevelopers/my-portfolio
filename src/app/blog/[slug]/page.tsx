// src/app/blog/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getBlogPostBySlug, getAllBlogPosts } from '@/services/blogService'; // Service is now site-aware
import { format } from 'date-fns';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import Image from 'next/image';
import type { Metadata, ResolvingMetadata } from 'next';

// Function to safely render HTML content (ensure it's defined or imported)
const createMarkup = (htmlContent?: string) => {
  // Basic sanitization (replace with a more robust library like DOMPurify if needed)
  const sanitizedHtml = htmlContent?.replace(/<script.*?>.*?<\/script>/gi, '') || '';
  return { __html: sanitizedHtml };
};

// --- Metadata Generation ---
type Props = {
  params: { slug: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

// Define the constant OG image URL (ensure this image is accessible)
const BLOG_POST_DEFAULT_OG_IMAGE_URL = '/default-blog-og.png'; // Example: place in /public folder

export async function generateMetadata(
  { params }: Props, // Only params needed here
  parent: ResolvingMetadata
): Promise<Metadata> {
  const siteId = process.env.NEXT_PUBLIC_SITE_ID || 'unknown-site';
  const slug = params.slug;
  let title = 'Blog Post';
  let description = 'Read this blog post.';
  // Use the constant default OG image URL
  const ogImageUrl = BLOG_POST_DEFAULT_OG_IMAGE_URL;

  // Fetch blog post data specifically for metadata
  try {
    const post = await getBlogPostBySlug(slug); // Fetches site-specific post
    if (post) {
      title = post.title || title; // Use post title if available
      description = post.summary || description; // Use post summary if available
      console.log(`Metadata (Blog - Site: ${siteId}, Slug: ${slug}): Title="${title}", Desc="${description.substring(0, 50)}...", OG Image="${ogImageUrl}"`);
    } else {
      console.warn(`Metadata: Blog post with slug "${slug}" not found for site "${siteId}". Using defaults.`);
    }
  } catch (error) {
    console.error(`Metadata Error: Failed to fetch blog post for slug "${slug}" (Site ${siteId}):`, error);
    // Use default title/description on error
  }

  // Construct absolute URL for the OG image
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002'; // Fallback for local dev
  let absoluteOgImageUrl = ogImageUrl;
  if (ogImageUrl.startsWith('/') && baseUrl) {
    absoluteOgImageUrl = `${baseUrl.replace(/\/$/, '')}${ogImageUrl}`;
  }

  console.log(`Final absolute OG Image URL for blog post ${slug}: ${absoluteOgImageUrl}`);

  // Construct the canonical URL for the blog post
  const canonicalUrl = `${baseUrl}/blog/${slug}`;

  return {
    metadataBase: process.env.NEXT_PUBLIC_BASE_URL ? new URL(process.env.NEXT_PUBLIC_BASE_URL) : undefined,
    title: title,
    description: description.substring(0, 160), // Limit description length
    openGraph: {
      title: title,
      description: description.substring(0, 160),
      images: [
        {
          url: absoluteOgImageUrl, // Use the determined absolute URL
          width: 1200, // Standard OG width
          height: 630, // Standard OG height
          alt: `${title} - Blog Post Image`,
        },
      ],
      type: 'article', // More specific type for blog posts
      url: canonicalUrl, // URL of the specific blog post
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description.substring(0, 160),
      images: [absoluteOgImageUrl],
    },
    alternates: {
      canonical: canonicalUrl,
    },
  };
}


// --- Blog Post Page Component ---
export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const siteId = process.env.NEXT_PUBLIC_SITE_ID || 'unknown-site';
  // Fetch site-specific post by slug
  const post = await getBlogPostBySlug(params.slug);

  if (!post) {
    console.warn(`Blog post with slug "${params.slug}" not found for site "${siteId}".`);
    notFound(); // Show 404 if post doesn't exist for this site
  }

  // Format the date for display
  let formattedDate = 'Date unavailable';
  try {
    if (post.date) {
      formattedDate = format(new Date(post.date), 'MMMM d, yyyy'); // e.g., July 22, 2024
    }
  } catch (e) {
    console.error(`Error formatting date for post ${post.id} (Site ${siteId}):`, e);
  }

  // Basic author info (replace with actual author data fetching if needed)
   // TODO: Consider fetching author details from a separate 'users' collection based on post.authorId
   const author = {
     name: post.authorName || 'Author Name', // Fallback name
     // Use a generic default or fetch author-specific image
     imageUrl: '/default-profile.png', // Assuming a generic default in /public
     initials: post.authorName?.split(' ').map(n => n[0]).join('') || 'A',
   };


  return (
    <div className="container mx-auto max-w-screen-lg px-4 py-12 md:py-16 lg:py-20">
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" asChild className="mb-8 -ml-4 text-muted-foreground hover:text-primary transition-colors duration-200 group">
          <Link href="/blog">
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" /> Back to Blog
          </Link>
        </Button>
        <Card className="shadow-lg border rounded-xl overflow-hidden bg-card mb-10">
          {/* Optional: Featured Image */}
          {post.imageUrl && (
             <div className="relative w-full h-64 md:h-80 lg:h-[500px] overflow-hidden">
                <Image
                  src={post.imageUrl}
                  alt={post.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 66vw"
                  style={{ objectFit: "cover" }}
                  priority
                  data-ai-hint={post.dataAiHint || 'blog post cover image article'}
                  unoptimized={post.imageUrl.startsWith('data:image')}
                  className="rounded-t-xl" // Only round top corners if image is at the top
                />
             </div>
          )}
          <CardHeader className="p-6 md:p-8 lg:p-10">
            <CardTitle className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight text-foreground">
              {post.title}
            </CardTitle>
             {/* Author and Date Info */}
             <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
               <div className="flex items-center space-x-2">
                 <Avatar className="h-8 w-8">
                   <AvatarImage src={author.imageUrl} alt={author.name} />
                   <AvatarFallback>{author.initials}</AvatarFallback>
                 </Avatar>
                 <span>By {author.name}</span>
               </div>
                <div className="flex items-center space-x-2">
                  <CalendarDays className="h-4 w-4" />
                  <span>Published on {formattedDate}</span>
               </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 md:p-8 lg:p-10 pt-0">
            {/* Render HTML/Markdown content using Tailwind Typography */}
            <article
              className="prose prose-lg dark:prose-invert max-w-none
                         prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-foreground prose-headings:mt-12 prose-headings:mb-4
                         prose-p:leading-relaxed prose-p:text-muted-foreground prose-p:my-6 prose-p:text-justify
                         prose-a:text-primary hover:prose-a:text-primary/80 prose-a:font-medium prose-a:no-underline hover:prose-a:underline prose-a:break-words
                         prose-li:my-2 prose-li:marker:text-primary prose-li:text-muted-foreground
                         prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground prose-blockquote:my-8
                         prose-code:bg-muted prose-code:text-foreground prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:font-mono prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
                         prose-pre:bg-muted prose-pre:text-foreground prose-pre:p-4 prose-pre:rounded-md prose-pre:my-8
                         prose-strong:text-foreground
                         prose-ul:list-disc prose-ul:pl-6 prose-ol:list-decimal prose-ol:pl-6
                         prose-img:rounded-lg prose-img:my-8 prose-img:shadow-md
                         prose-hr:my-12 prose-hr:border-border/50"
              dangerouslySetInnerHTML={createMarkup(post.content)}
             />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Generate static paths - Needs to be aware of the siteId during build
// This requires setting NEXT_PUBLIC_SITE_ID at build time.
export async function generateStaticParams() {
    const siteId = process.env.NEXT_PUBLIC_SITE_ID;
     if (!siteId) {
        console.warn("NEXT_PUBLIC_SITE_ID not set during build for blog/[slug]. Cannot generate static params.");
        return [];
    }
  try {
    // Fetch posts specifically for the site being built
    const posts = await getAllBlogPosts(); // This service call is now site-aware
    const validPosts = posts.filter(post => post.slug);
    console.log(`Generating static params for blog slugs (Site: ${siteId}): ${validPosts.map(p => p.slug).join(', ')}`);
    return validPosts.map((post) => ({
      slug: post.slug,
    }));
  } catch (error) {
      console.error(`Error generating static params for blog posts (Site: ${siteId}):`, error);
      return [];
  }
}
