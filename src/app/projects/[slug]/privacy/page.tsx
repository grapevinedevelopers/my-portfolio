// src/app/projects/[slug]/privacy/page.tsx
import { notFound } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getProjectBySlug, getAllProjects } from '@/services/projectService';
import type { Metadata } from 'next';

// Function to safely render HTML content
const createMarkup = (htmlContent?: string) => {
  const sanitizedHtml = htmlContent?.replace(/<script.*?>.*?<\/script>/gi, '') || '';
  return { __html: sanitizedHtml };
};

// --- Metadata Generation ---
type Props = {
  params: { slug: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = params.slug;
  let projectTitle = 'Privacy Policy';

  try {
    const project = await getProjectBySlug(slug);
    if (project) {
      projectTitle = `${project.title} - Privacy Policy`;
    } else {
      console.warn(`Metadata: Project with slug "${slug}" not found for privacy page. Using default title.`);
    }
  } catch (error) {
    console.error(`Metadata Error: Failed to fetch project for slug "${slug}" on privacy page:`, error);
  }

  return {
    title: projectTitle,
    description: `Privacy policy for the project: ${projectTitle.replace(' - Privacy Policy', '')}`,
    robots: {
      index: false, // Generally a good idea to no-index privacy policy pages
      follow: true,
    },
  };
}

// --- Privacy Policy Page Component ---
export default async function ProjectPrivacyPolicyPage({ params }: { params: { slug: string } }) {
  const siteId = process.env.NEXT_PUBLIC_SITE_ID || 'unknown-site';
  const project = await getProjectBySlug(params.slug);

  if (!project || !project.privacyPolicy) {
    console.warn(`Project with slug "${params.slug}" not found or has no privacy policy for site "${siteId}".`);
    notFound();
  }

  return (
    <div className="container mx-auto max-w-screen-lg px-4 py-12 md:py-16 lg:py-20">
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" asChild className="mb-8 -ml-4 text-muted-foreground hover:text-primary transition-colors duration-200 group">
          <Link href={`/projects/${project.slug}`}>
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" /> Back to Project
          </Link>
        </Button>
        <Card className="shadow-lg border rounded-xl overflow-hidden bg-card">
          <CardHeader className="p-6 md:p-8 lg:p-10">
            <CardTitle className="text-3xl md:text-4xl font-bold mb-2 leading-tight text-foreground">
              Privacy Policy
            </CardTitle>
            <p className="text-lg text-muted-foreground">For: {project.title}</p>
          </CardHeader>
          <CardContent className="p-6 md:p-8 lg:p-10 pt-0">
            <article
              className="prose prose-lg dark:prose-invert max-w-none
                         prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-foreground prose-headings:mt-12 prose-headings:mb-4
                         prose-p:leading-relaxed prose-p:text-muted-foreground prose-p:my-6
                         prose-a:text-primary hover:prose-a:text-primary/80 prose-a:font-medium prose-a:no-underline hover:prose-a:underline prose-a:break-words
                         prose-li:my-2 prose-li:marker:text-primary prose-li:text-muted-foreground
                         prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground prose-blockquote:my-8
                         prose-code:bg-muted prose-code:text-foreground prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:font-mono prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
                         prose-pre:bg-muted prose-pre:text-foreground prose-pre:p-4 prose-pre:rounded-md prose-pre:my-8
                         prose-strong:text-foreground
                         prose-ul:list-disc prose-ul:pl-6 prose-ol:list-decimal prose-ol:pl-6
                         prose-img:rounded-lg prose-img:my-8 prose-img:shadow-md
                         prose-hr:my-12 prose-hr:border-border/50"
              dangerouslySetInnerHTML={createMarkup(project.privacyPolicy)}
             />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Generate static paths for privacy pages of projects that have a policy
export async function generateStaticParams() {
    const siteId = process.env.NEXT_PUBLIC_SITE_ID;
    if (!siteId) {
        console.warn("NEXT_PUBLIC_SITE_ID not set during build for project privacy pages. Cannot generate static params.");
        return [];
    }
  try {
    const projects = await getAllProjects();
    const projectsWithPrivacyPolicy = projects.filter(p => p.slug && p.privacyPolicy);
    console.log(`Generating static params for project privacy pages (Site: ${siteId}): ${projectsWithPrivacyPolicy.map(p => p.slug).join(', ')}`);
    return projectsWithPrivacyPolicy.map((project) => ({
      slug: project.slug,
    }));
  } catch (error) {
      console.error(`Error generating static params for project privacy pages (Site: ${siteId}):`, error);
      return [];
  }
}
