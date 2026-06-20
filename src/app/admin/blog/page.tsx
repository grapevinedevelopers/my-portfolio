// src/app/admin/blog/page.tsx
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { getAllBlogPosts } from '@/services/blogService'; // Service is now site-aware
import Link from 'next/link';
import { FileText, PlusCircle, Edit } from 'lucide-react';
import DeleteConfirmationDialog from '@/components/admin/DeleteConfirmationDialog';
import { deleteBlogPostAction } from '@/actions/blogActions'; // Action is now site-aware via service

export default async function AdminBlogListPage() {
  // Fetch blog posts for the current site (implicitly determined by env var in service)
  const blogPosts = await getAllBlogPosts();
  const siteId = process.env.NEXT_PUBLIC_SITE_ID || 'default-site';

  return (
    <div className="container mx-auto max-w-screen-lg px-4 py-12 md:py-16 lg:py-20">
      <Card className="shadow-lg border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-6 h-6 text-primary" />
              <CardTitle className="text-2xl font-bold">Manage Blog Posts</CardTitle>
            </div>
            <CardDescription>
              Add, edit, or delete blog posts for site "{siteId}".
            </CardDescription>
          </div>
          <Button asChild size="sm">
            <Link href="/admin/blog/add">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Post
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {blogPosts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No blog posts found for this site. Add your first post!</p>
          ) : (
            <ul className="space-y-4">
              {blogPosts.map((post) => (
                <li
                  key={post.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 mb-4 sm:mb-0">
                    <h3 className="font-semibold text-lg">{post.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Slug: {post.slug} | Published: {post.date ? new Date(post.date).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/blog/${post.id}/edit`}>
                        <Edit className="mr-1 h-4 w-4" /> Edit
                      </Link>
                    </Button>
                    <DeleteConfirmationDialog
                       itemId={post.id}
                       itemName={post.title}
                       deleteAction={deleteBlogPostAction} // Action passes ID to site-aware service
                       itemType="blog post"
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
