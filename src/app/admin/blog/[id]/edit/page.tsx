// src/app/admin/blog/[id]/edit/page.tsx
import BlogPostForm from '@/components/admin/BlogPostForm';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { getBlogPostById } from '@/services/blogService'; // Service is now site-aware
import { notFound } from 'next/navigation';
import { FileText } from 'lucide-react';
import type { BlogPost } from '@/services/blogService';
import { Timestamp } from 'firebase/firestore';

interface EditBlogPostPageProps {
  params: { id: string };
}

// Helper function to convert Timestamp to ISO string safely (can be moved to utils)
const timestampToISOString = (timestamp: any): string | undefined => {
  if (timestamp instanceof Timestamp) {
    try {
        return timestamp.toDate().toISOString();
    } catch (e) {
         console.error("Error converting timestamp to ISO string:", e);
         return undefined;
    }
  }
  // Handle cases where it might already be a string or null/undefined
  if (typeof timestamp === 'string') return timestamp;
  return undefined;
};


export default async function AdminEditBlogPostPage({ params }: EditBlogPostPageProps) {
  const postId = params.id;
  const siteId = process.env.NEXT_PUBLIC_SITE_ID || 'unknown-site';
  // Fetch site-specific post data
  const post = await getBlogPostById(postId);

  if (!post) {
    console.error(`Admin: Blog post with ID ${postId} not found for site "${siteId}" for editing.`);
    notFound(); // Show 404 if post doesn't exist for this site
  }

  // Serialize the post data before passing to the client component
  const serializablePost: Partial<BlogPost> = {
    ...post,
    date: post.date ? timestampToISOString(post.date) || new Date().toISOString() : new Date().toISOString(),
    createdAt: post.createdAt ? timestampToISOString(post.createdAt) : undefined,
    updatedAt: post.updatedAt ? timestampToISOString(post.updatedAt) : undefined,
  };


  return (
    <div className="container mx-auto max-w-screen-lg px-4 py-12 md:py-16 lg:py-20">
      <Card className="shadow-lg border">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-6 h-6 text-primary" />
            <CardTitle className="text-2xl font-bold">Edit Blog Post</CardTitle>
          </div>
          <CardDescription>
            Update details for post "{post.title}" (Site: {siteId}).
          </CardDescription>
        </CardHeader>
        <CardContent>
           {/* Pass the serializable data to the Client Component */}
          <BlogPostForm initialData={serializablePost} isEditing={true} />
        </CardContent>
      </Card>
    </div>
  );
}
