// src/app/projects/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { ArrowLeft, ExternalLink, Tag, CalendarDays, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { Project } from '@/services/projectService';
import { getProjectBySlug, getAllProjects } from '@/services/projectService'; // Service is now site-aware
import Image from 'next/image';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import type { Metadata, ResolvingMetadata } from 'next';

// Function to safely render HTML content
const createMarkup = (htmlContent?: string) => {
  const sanitizedHtml = htmlContent?.replace(/<script.*?>.*?<\/script>/gi, '') || '';
  return { __html: sanitizedHtml };
};


// --- Metadata Generation ---
type Props = {
  params: { slug: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

// Define the constant OG image URL for projects
const PROJECT_DEFAULT_OG_IMAGE_URL = '/default-project-og.png'; // Example: place in /public folder

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const siteId = process.env.NEXT_PUBLIC_SITE_ID || 'unknown-site';
  const slug = params.slug;
  let title = 'Project Details';
  let description = 'View details about this project.';
  // Use the constant default OG image URL
  const ogImageUrl = PROJECT_DEFAULT_OG_IMAGE_URL;

  // Fetch project data specifically for metadata
  try {
    const project = await getProjectBySlug(slug); // Fetches site-specific project
    if (project) {
      title = project.title || title; // Use project title if available
      description = project.description || description; // Use project description if available
      console.log(`Metadata (Project - Site: ${siteId}, Slug: ${slug}): Title="${title}", Desc="${description.substring(0, 50)}...", OG Image="${ogImageUrl}"`);
    } else {
      console.warn(`Metadata: Project with slug "${slug}" not found for site "${siteId}". Using defaults.`);
    }
  } catch (error) {
    console.error(`Metadata Error: Failed to fetch project for slug "${slug}" (Site ${siteId}):`, error);
    // Use default title/description on error
  }

  // Construct absolute URL for the OG image
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002'; // Fallback for local dev
  let absoluteOgImageUrl = ogImageUrl;
  if (ogImageUrl.startsWith('/') && baseUrl) {
    absoluteOgImageUrl = `${baseUrl.replace(/\/$/, '')}${ogImageUrl}`;
  }

  console.log(`Final absolute OG Image URL for project ${slug}: ${absoluteOgImageUrl}`);

   // Construct the canonical URL for the project page
   const canonicalUrl = `${baseUrl}/projects/${slug}`;

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
          alt: `${title} - Project Image`,
        },
      ],
      type: 'article', // Or 'website' if more appropriate
      url: canonicalUrl, // URL of the specific project page
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


// Define the props for the ProjectPage component
interface ProjectPageProps {
  params: { slug: string };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const slug = params.slug;
  const siteId = process.env.NEXT_PUBLIC_SITE_ID || 'unknown-site';

  if (!slug || typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      console.error(`Invalid slug format received: "${slug}"`);
      notFound();
  }

  console.log(`Fetching project with slug: "${slug}" for site "${siteId}"`);

  let project: Project | null = null;
  try {
      project = await getProjectBySlug(slug); // Fetches site-specific project
  } catch (error: any) {
      console.error(`Error fetching project with slug "${slug}" for site "${siteId}":`, error);
      notFound();
  }

  if (!project) {
     console.warn(`Project with slug "${slug}" not found for site "${siteId}".`);
    notFound();
  }

   // --- Safely access project properties ---
   const projectTitle = project.title || 'Untitled Project';
   const projectDescription = project.description || 'No description available.';
   const projectImageUrl = project.imageUrl || `https://picsum.photos/seed/${project.slug || 'default-project'}/600/400`;
   const projectDetails = project.details || '';
   const projectPrivacyPolicy = project.privacyPolicy || '';
   const projectLink = project.link && project.link !== '#' ? project.link : null;
   const projectTags = Array.isArray(project.tags) ? project.tags : [];
   const projectDataAiHint = project.dataAiHint || 'project cover image technology';

   // --- Format date safely ---
   let formattedDate = 'Date unavailable';
   try {
      const dateToFormat = project.updatedAt || project.createdAt;
      // Assuming date is already ISO string from the service mapping
      if (dateToFormat && typeof dateToFormat === 'string') {
          const dateObject = new Date(dateToFormat);
           if (!isNaN(dateObject.getTime())) {
              formattedDate = format(dateObject, 'MMMM d, yyyy');
          } else {
               console.warn(`Invalid date string received for project ${project.id} (Site ${siteId}): ${dateToFormat}`);
          }
      }
   } catch (e) {
      console.error(`Error formatting date for project ${project.id} (Site ${siteId}):`, e);
   }

  return (
    <div className="container mx-auto max-w-screen-lg px-4 py-12 md:py-16 lg:py-20">
      <div className="max-w-4xl mx-auto">
         {/* Back Button */}
        <Button variant="ghost" asChild className="mb-8 -ml-4 text-muted-foreground hover:text-primary transition-colors duration-200 group">
          <Link href="/projects">
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" /> Back to Projects
          </Link>
        </Button>

        {/* Main Content Article */}
        <article className="bg-card rounded-xl shadow-lg overflow-hidden border border-border/80">
          {/* Project Header */}
          <header className="p-6 md:p-10 lg:p-12">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight text-foreground break-words">
              {projectTitle}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-6 leading-relaxed">{projectDescription}</p>
            {/* Meta Info: Tags & Date */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground mb-6">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary/80"/>
                <span className="sr-only">Tags:</span>
                <div className="flex flex-wrap gap-2">
                  {projectTags.length > 0 ? (
                    projectTags.map(tag => (
                      <span key={tag} className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">{tag}</span>
                    ))
                  ) : (
                    <span className="text-xs italic">No tags</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary/80"/>
                <span className="sr-only">Date:</span>
                <span>{formattedDate}</span>
              </div>
            </div>
          </header>

          {/* Project Image */}
          {projectImageUrl && (
            <div className="relative w-full h-64 md:h-80 lg:h-[500px] overflow-hidden my-8 lg:my-12">
              <Image
                src={projectImageUrl}
                alt={projectTitle}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 66vw" // Adjust sizes as needed
                style={{ objectFit: "cover" }}
                priority
                data-ai-hint={projectDataAiHint}
                className="rounded-none"
                unoptimized={projectImageUrl.startsWith('data:image')} // Disable optimization for Base64
              />
            </div>
          )}

          {/* Main Project Details */}
          <div className="p-6 md:p-10 lg:p-12 pt-0">
            {projectDetails ? (
              <div
                 className="prose prose-lg dark:prose-invert max-w-none
                            prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-foreground prose-headings:mt-12 prose-headings:mb-4
                            prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl
                            prose-p:leading-relaxed prose-p:text-muted-foreground prose-p:my-6 prose-p:text-justify
                            prose-a:text-primary hover:prose-a:text-primary/80 prose-a:font-medium prose-a:no-underline hover:prose-a:underline prose-a:break-words
                            prose-li:my-2 prose-li:marker:text-primary prose-li:text-muted-foreground
                            prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground prose-blockquote:my-8
                            prose-code:bg-muted prose-code:text-foreground prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:font-mono prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
                            prose-pre:bg-muted prose-pre:text-foreground prose-pre:p-4 prose-pre:rounded-md prose-pre:my-8
                            prose-strong:text-foreground
                            prose-ul:list-disc prose-ul:pl-6 prose-ol:list-decimal prose-ol:pl-6
                            prose-img:rounded-lg prose-img:my-8 prose-img:shadow-md
                            prose-hr:my-12 prose-hr:border-border/50
                            [style*='text-align: justify']"
                 dangerouslySetInnerHTML={createMarkup(projectDetails)} // Use sanitized HTML
               />
            ) : (
              <p className="text-muted-foreground italic text-center py-12">No detailed description provided for this project.</p>
            )}
          </div>

          {/* Project Footer Links */}
          <footer className="p-6 md:p-10 lg:p-12 pt-6 border-t border-border/80 mt-8 flex flex-wrap gap-4 items-center">
            {projectLink && (
              <Button asChild size="lg">
                <Link href={projectLink} target="_blank" rel="noopener noreferrer">
                  Visit Project <ExternalLink className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            )}
            {projectPrivacyPolicy && (
              <Button asChild variant="secondary">
                <Link href={`/projects/${project.slug}/privacy`}>
                  <ShieldCheck className="mr-2 h-5 w-5" /> Privacy Policy
                </Link>
              </Button>
            )}
          </footer>
        </article>
      </div>
    </div>
  );
}

// Generate static paths - Needs to be site-aware during build
export async function generateStaticParams(): Promise<{ slug: string }[]> {
    const siteId = process.env.NEXT_PUBLIC_SITE_ID;
     if (!siteId) {
        console.warn("NEXT_PUBLIC_SITE_ID not set during build for projects/[slug]. Cannot generate static params.");
        return [];
    }
  try {
    // Fetch projects for the specific site being built
    const projects: Project[] = await getAllProjects(); // Service is now site-aware
    const validProjects = projects.filter(project =>
      project?.slug && typeof project.slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.slug)
    );

    if (!validProjects || validProjects.length === 0) {
        console.warn(`No valid projects found with slugs for site "${siteId}" for generating static params.`);
        return [];
    }
     console.log(`Generating static params for project slugs (Site: ${siteId}): ${validProjects.map(p => p.slug).join(', ')}`);
    return validProjects.map((project) => ({
      slug: project.slug,
    }));
  } catch (error) {
      console.error(`Error generating static params for projects (Site: ${siteId}):`, error);
      return [];
  }
}
