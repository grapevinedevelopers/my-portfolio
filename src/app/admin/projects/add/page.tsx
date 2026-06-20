// src/app/admin/projects/add/page.tsx
import ProjectForm from '@/components/admin/ProjectForm';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FolderKanban } from 'lucide-react';

export default function AdminAddProjectPage() {
  // Initial empty data for a new project
  const initialData = {
    id: '', // No ID for a new project
    title: '',
    slug: '', // Add slug field
    description: '',
    details: '', // Add details field
    privacyPolicy: '', // Add privacy policy field
    imageUrl: '',
    link: '',
    tags: [],
    dataAiHint: '',
    order: 999, // Default order (end of list)
  };

  const siteId = process.env.NEXT_PUBLIC_SITE_ID || 'default-site';


  return (
    <div className="container mx-auto max-w-screen-lg px-4 py-12 md:py-16 lg:py-20">
      <Card className="shadow-lg border">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <FolderKanban className="w-6 h-6 text-primary" />
            <CardTitle className="text-2xl font-bold">Add New Project</CardTitle>
          </div>
          <CardDescription>
            Create a new project entry for site "{siteId}". Fill in the details below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Form action will handle the site context implicitly */}
          <ProjectForm initialData={initialData} isEditing={false} />
        </CardContent>
      </Card>
    </div>
  );
}
