// src/app/admin/projects/page.tsx
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { getAllProjects } from '@/services/projectService'; // Service is now site-aware
import Link from 'next/link';
import { FolderKanban, PlusCircle, Edit } from 'lucide-react';
import DeleteConfirmationDialog from '@/components/admin/DeleteConfirmationDialog';
import { deleteProjectAction } from '@/actions/projectActions'; // Action is now site-aware via service

export default async function AdminProjectListPage() {
  // Fetch projects for the current site (implicitly determined by env var in service)
  const projects = await getAllProjects();
  const siteId = process.env.NEXT_PUBLIC_SITE_ID || 'default-site';

  return (
    <div className="container mx-auto max-w-screen-lg px-4 py-12 md:py-16 lg:py-20">
      <Card className="shadow-lg border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="space-y-1.5">
             <div className="flex items-center gap-3 mb-2">
               <FolderKanban className="w-6 h-6 text-primary" />
               <CardTitle className="text-2xl font-bold">Manage Projects</CardTitle>
             </div>
            <CardDescription>
              Add, edit, or delete projects for site "{siteId}". Adjust 'order' to reorder.
            </CardDescription>
          </div>
          <Button asChild size="sm">
            <Link href="/admin/projects/add">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Project
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No projects found for this site. Add your first project!</p>
          ) : (
            <ul className="space-y-4">
              {projects.map((project) => (
                <li
                  key={project.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 mb-4 sm:mb-0">
                    <h3 className="font-semibold text-lg">{project.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Slug: {project.slug} | Order: {project.order ?? 'N/A'} | Tags: {(project.tags || []).join(', ') || 'None'}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/projects/${project.id}/edit`}>
                        <Edit className="mr-1 h-4 w-4" /> Edit
                      </Link>
                    </Button>
                    <DeleteConfirmationDialog
                      itemId={project.id}
                      itemName={project.title}
                      deleteAction={deleteProjectAction} // Action passes ID to site-aware service
                      itemType="project"
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
