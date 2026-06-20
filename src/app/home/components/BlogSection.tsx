// src/app/home/components/BlogSection.tsx
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, CalendarDays } from 'lucide-react';
import type { BlogPost } from '@/services/blogService';
import { format } from 'date-fns';

interface BlogSectionProps {
  blogPosts: BlogPost[]; // Expects blog posts for the specific site
}

export default function BlogSection({ blogPosts }: BlogSectionProps) {
  const siteId = process.env.NEXT_PUBLIC_SITE_ID || 'default-site'; // Get siteId for logging/context if needed

  return (
    <section id="blog" className="w-full py-20 md:py-28 lg:py-32 bg-background">
      <div className="container mx-auto max-w-screen-xl px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-6 text-center mb-16">
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">Latest Insights</h2>
          <p className="max-w-3xl text-muted-foreground md:text-xl lg:text-2xl leading-relaxed">
            Exploring the intersections of technology, product management, and leadership.
          </p>
        </div>
        <div className="grid gap-8 md:gap-12 sm:grid-cols-2 lg:grid-cols-3">
          {blogPosts.map((post) => (
            <Card key={post.id} className="flex flex-col h-full overflow-hidden rounded-xl border shadow-lg hover:shadow-2xl transition-all duration-300 ease-out bg-card transform hover:-translate-y-2 hover:border-primary/50 group">
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
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div> {/* Optional overlay */}
               </div>
              {/* Content Section */}
              <CardHeader className="p-6">
                <CardTitle className="text-2xl font-semibold leading-snug">
                  <Link href={`/blog/${post.slug}`} className="hover:text-primary transition-colors duration-200">
                    {post.title}
                  </Link>
                </CardTitle>
                 <p className="text-sm text-muted-foreground pt-1 flex items-center gap-1.5">
                     <CalendarDays className="w-4 h-4" />
                     {/* Safely format date */}
                     {post.date ? format(new Date(post.date), 'MMMM d, yyyy') : 'Date unavailable'}
                 </p>
              </CardHeader>
              <CardContent className="flex-grow p-6 pt-0">
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
          {blogPosts.length === 0 && (
            <p className="text-center text-muted-foreground col-span-full py-12">
              No blog posts found{siteId !== 'default-site' ? ` for site "${siteId}"` : ''}.
            </p>
          )}
        </div>
        {blogPosts.length > 0 && ( // Only show "Explore All" if there are posts
            <div className="text-center mt-20">
            <Button variant="outline" size="lg" asChild className="shadow-lg hover:shadow-xl transition-shadow duration-300 border-2 border-border hover:border-primary text-lg px-8 py-3">
                <Link href="/blog">
                Explore All Posts <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
            </Button>
            </div>
        )}
      </div>
    </section>
  );
}
