// src/app/home/components/ProjectSection.tsx
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, FolderKanban } from 'lucide-react';
import type { Project } from '@/services/projectService';

interface ProjectSectionProps {
  projects: Project[]; // Expects projects for the specific site
}

export default function ProjectSection({ projects }: ProjectSectionProps) {
  const siteId = process.env.NEXT_PUBLIC_SITE_ID || 'default-site'; // Get siteId for logging/context if needed

  return (
    <section id="projects" className="w-full py-20 md:py-28 lg:py-32 bg-secondary/30 dark:bg-secondary/10">
      <div className="container mx-auto max-w-screen-xl px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-6 text-center mb-16">
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">Featured Projects</h2>
          <p className="max-w-3xl text-muted-foreground md:text-xl lg:text-2xl leading-relaxed">
            Showcasing initiatives where strategy meets execution.
          </p>
        </div>
        <div className="grid gap-8 md:gap-12 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="overflow-hidden rounded-xl border shadow-lg hover:shadow-2xl transition-all duration-300 ease-out group bg-card transform hover:-translate-y-2 hover:border-primary/50">
              {/* Image Section */}
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
                 <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent flex items-end p-6">
                     <CardTitle className="text-xl font-semibold text-white leading-tight">{project.title}</CardTitle>
                </div>
             </div>
              {/* Content Section */}
              <CardContent className="p-6">
                 <p className="text-base text-muted-foreground mb-4 leading-relaxed line-clamp-3">{project.description}</p>
                 <div className="flex flex-wrap gap-2">
                    {(project.tags || []).map(tag => (
                        <span key={tag} className="text-sm bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">{tag}</span>
                    ))}
                 </div>
              </CardContent>
              <CardFooter className="p-6 pt-0">
                 <Button variant="outline" asChild size="sm" className="shadow-md hover:shadow-lg transition-shadow duration-300 border-2 border-border hover:border-primary">
                    {/* Link to the dynamic project page using the slug */}
                    <Link href={`/projects/${project.slug}`}>
                        View Details <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Link>
                 </Button>
              </CardFooter>
            </Card>
          ))}
          {projects.length === 0 && (
            <p className="text-center text-muted-foreground col-span-full py-12">
                No projects found{siteId !== 'default-site' ? ` for site "${siteId}"` : ''}.
            </p>
          )}
        </div>
        {/* Explore All Projects Button - Only show if there are projects */}
        {projects.length > 0 && (
            <div className="text-center mt-20">
            <Button variant="outline" size="lg" asChild className="shadow-lg hover:shadow-xl transition-shadow duration-300 border-2 border-border hover:border-primary text-lg px-8 py-3">
                <Link href="/projects">
                Explore All Projects <FolderKanban className="ml-2 h-5 w-5" />
                </Link>
            </Button>
            </div>
        )}
      </div>
    </section>
  );
}
