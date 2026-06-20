// src/app/admin/blog/add/page.tsx
import BlogPostForm from '@/components/admin/BlogPostForm';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FileText } from 'lucide-react';

export default function AdminAddBlogPostPage() {
  // Initial empty data for a new post, including image fields
  const initialData = {
    id: '', // No ID for a new post
    title: '',
    slug: '',
    summary: '',
    content: '',
    imageUrl: '', // Initialize image URL
    dataAiHint: '', // Initialize AI hint
    date: new Date().toISOString(), // Default to current date
    // Author info will be added by the action based on logged-in user
  };

  const siteId = process.env.NEXT_PUBLIC_SITE_ID || 'default-site';

  return (
    <div className="container mx-auto max-w-screen-lg px-4 py-12 md:py-16 lg:py-20">
      <Card className="shadow-lg border">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-6 h-6 text-primary" />
            <CardTitle className="text-2xl font-bold">Add New Blog Post</CardTitle>
          </div>
          <CardDescription>
            Create a new blog post for site "{siteId}". Fill in the details below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* The form itself doesn't need the siteId directly, the action handles it */}
          <BlogPostForm initialData={initialData} isEditing={false} />
        </CardContent>
      </Card>
    </div>
  );
}
