// src/app/blog/page.tsx
import Link from 'next/link';
import Image from 'next/image'; // Import Image component
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, CalendarDays } from 'lucide-react'; // Added CalendarDays
import { getAllBlogPosts } from '@/services/blogService'; // Service now fetches site-specific data
import { format } from 'date-fns'; // Import date-fns for formatting

export default async function BlogIndexPage() {
  // Fetch blog posts from the service (implicitly uses NEXT_PUBLIC_SITE_ID)
  const allBlogPosts = await getAllBlogPosts();
  const siteId = process.env.NEXT_PUBLIC_SITE_ID || 'default-site';

  return (
    <div className="container mx-auto max-w-screen-xl px-4 py-12 md:py-16 lg:py-20">
       <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">Blog Archive</h1>
          <p className="max-w-[700px] text-muted-foreground md:text-xl/relaxed">
            Browse through all published articles and thoughts{siteId !== 'default-site' ? ` for ${siteId}` : ''}.
          </p>
        </div>

      {/* Updated grid layout for consistency */}
      <div className="grid gap-8 md:gap-12 sm:grid-cols-2 lg:grid-cols-3">
        {allBlogPosts.map((post) => (
          <Card key={post.id} className="overflow-hidden rounded-xl border shadow-lg hover:shadow-2xl transition-all duration-300 ease-out group bg-card transform hover:-translate-y-2 hover:border-primary/50">
             {/* Image Section */}
             <div className="relative aspect-video overflow-hidden rounded-t-xl">
               <Image
                 src={post.imageUrl || `https://picsum.photos/seed/${post.slug || 'default-blog'}/600/400`} // Fallback image
                 alt={post.title}
                 fill
                 sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                 style={{ objectFit: "cover" }}
                 className="transition-transform duration-500 ease-out group-hover:scale-110"
                 data-ai-hint={post.dataAiHint || 'blog post cover image article'}
                 unoptimized={post.imageUrl?.startsWith('data:image')} // Disable optimization for Base64
               />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div> {/* Overlay for better text contrast */}
             </div>
             {/* Content Section */}
            <CardHeader className="p-6">
              <CardTitle className="text-2xl font-semibold leading-snug">
                 <Link href={`/blog/${post.slug}`} className="hover:text-primary transition-colors">
                   {post.title}
                 </Link>
              </CardTitle>
              <p className="text-sm text-muted-foreground pt-1 flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4" />
                  {/* Safely format date */}
                  {post.date ? format(new Date(post.date), 'MMMM d, yyyy') : 'Date unavailable'}
              </p>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              {/* Use line-clamp-3 for summary */}
              <p className="text-base text-muted-foreground leading-relaxed line-clamp-3">{post.summary}</p>
            </CardContent>
            <CardFooter className="p-6 pt-0">
              <Button variant="link" asChild className="p-0 h-auto text-primary hover:text-primary/80 font-semibold text-base">
                <Link href={`/blog/${post.slug}`}>
                  Read More <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
         {allBlogPosts.length === 0 && (
            <p className="text-center text-muted-foreground col-span-full py-12">No blog posts found{siteId !== 'default-site' ? ` for site "${siteId}"` : ''}.</p>
        )}
      </div>
    </div>
  );
}
