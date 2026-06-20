// src/app/admin/projects/[id]/edit/page.tsx
import ProjectForm from '@/components/admin/ProjectForm';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import type { Project } from '@/services/projectService';
import { getProjectById } from '@/services/projectService'; // Service is now site-aware
import { notFound } from 'next/navigation';
import { FolderKanban } from 'lucide-react';
import { Timestamp } from 'firebase/firestore'; // Import Timestamp

interface EditProjectPageProps {
  params: { id: string };
}

// Helper function to convert Timestamp to ISO string safely (can move to utils)
const timestampToISOString = (timestamp: any): string | undefined => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString();
  }
  if (typeof timestamp === 'string') return timestamp;
  return undefined;
};

export default async function AdminEditProjectPage({ params }: EditProjectPageProps) {
  const projectId = params.id;
  const siteId = process.env.NEXT_PUBLIC_SITE_ID || 'unknown-site';

  // Fetch site-specific project data
  const project = await getProjectById(projectId); // Service uses env var for siteId

  if (!project) {
    console.error(`Admin: Project with ID ${projectId} not found for site "${siteId}" for editing.`);
    notFound();
  }

  // Convert Timestamps to ISO strings for serialization
  const serializableProject = {
    ...project,
    createdAt: project.createdAt ? timestampToISOString(project.createdAt) : undefined,
    updatedAt: project.updatedAt ? timestampToISOString(project.updatedAt) : undefined,
    tags: Array.isArray(project.tags) ? project.tags : [], // Ensure tags is always an array
    privacyPolicy: project.privacyPolicy || '', // Ensure privacy policy is a string
  };

  return (
    <div className="container mx-auto max-w-screen-lg px-4 py-12 md:py-16 lg:py-20">
      <Card className="shadow-lg border">
        <CardHeader>
           <div className="flex items-center gap-3 mb-2">
             <FolderKanban className="w-6 h-6 text-primary" />
             <CardTitle className="text-2xl font-bold">Edit Project</CardTitle>
           </div>
          <CardDescription>
            Update details for project "{project.title}" (Site: {siteId}).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Pass the serializable project data */}
          <ProjectForm initialData={serializableProject as Omit<Project, 'createdAt' | 'updatedAt'> & { createdAt?: string, updatedAt?: string }} isEditing={true} />
        </CardContent>
      </Card>
    </div>
  );
}
