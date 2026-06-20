// src/app/projects/page.tsx
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { getAllProjects } from '@/services/projectService'; // Service is now site-aware

export default async function ProjectsIndexPage() {
  // Fetch all projects for the current site (implicitly determined by env var in service)
  const allProjects = await getAllProjects();
  const siteId = process.env.NEXT_PUBLIC_SITE_ID || 'default-site';

  return (
    <div className="container mx-auto max-w-screen-xl px-4 py-12 md:py-16 lg:py-20">
       <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">Projects Showcase</h1>
          <p className="max-w-[700px] text-muted-foreground md:text-xl/relaxed">
            Browse through all featured projects and contributions{siteId !== 'default-site' ? ` for ${siteId}` : ''}.
          </p>
        </div>

      <div className="grid gap-8 md:gap-12 sm:grid-cols-2 lg:grid-cols-3">
        {allProjects.map((project) => (
           <Card key={project.id} className="overflow-hidden rounded-xl border-2 border-border/80 shadow-lg hover:shadow-2xl transition-all duration-300 ease-out group bg-card transform hover:-translate-y-2 hover:border-primary/50">
             <div className="relative aspect-video overflow-hidden rounded-t-xl">
               <Image
                 src={project.imageUrl || `https://picsum.photos/seed/${project.slug || 'default-project'}/600/400`} // Fallback image
                 alt={project.title}
                 fill
                 sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                 style={{ objectFit: "cover" }}
                 className="transition-transform duration-500 ease-out group-hover:scale-110"
                 data-ai-hint={project.dataAiHint || 'project image technology application'}
                 unoptimized={project.imageUrl?.startsWith('data:image')} // Disable optimization for Base64
               />
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-end p-6">
                 <CardTitle className="text-xl font-semibold text-white leading-tight">{project.title}</CardTitle>
               </div>
             </div>
             <CardContent className="p-6">
               {/* Use line-clamp-3 for description */}
               <p className="text-base text-muted-foreground mb-4 leading-relaxed line-clamp-3">{project.description}</p>
               <div className="flex flex-wrap gap-2">
                 {(project.tags || []).map(tag => (
                   <span key={tag} className="text-sm bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">{tag}</span>
                 ))}
               </div>
             </CardContent>
             <CardFooter className="p-6 pt-0">
               {/* Updated Link: Points to the project detail page using slug */}
               <Button variant="outline" asChild size="sm" className="shadow-md hover:shadow-lg transition-shadow duration-300 border-2 border-border hover:border-primary">
                 <Link href={`/projects/${project.slug}`}> {/* Use slug here */}
                   View Details <ArrowRight className="ml-1.5 h-4 w-4" />
                 </Link>
               </Button>
             </CardFooter>
           </Card>
        ))}
         {allProjects.length === 0 && (
            <p className="text-center text-muted-foreground col-span-full py-12">No projects found{siteId !== 'default-site' ? ` for site "${siteId}"` : ''}.</p>
        )}
      </div>
    </div>
  );
}
