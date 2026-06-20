import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Database, User, FileText, FolderKanban } from 'lucide-react';

export default function AdminPage() {
  return (
    <div className="container mx-auto max-w-screen-xl px-4 py-12 md:py-16 lg:py-20">
       <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">Admin Dashboard</h1>
          <p className="max-w-[700px] text-muted-foreground md:text-xl/relaxed">
            Manage your portfolio content stored in Firestore. (Requires Authentication &amp; Write Permissions)
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="shadow-lg border">
                <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <User className="w-6 h-6 text-primary" />
                        <CardTitle>Manage Personal Details</CardTitle>
                    </div>
                    <CardDescription>Edit info in the 'personalDetails' collection (typically a single document, e.g., 'main').</CardDescription>
                </CardHeader>
                <CardContent>
                     <Button variant="outline" className="mt-4 w-full" asChild>
                       <Link href="/admin/details">Edit Details</Link>
                     </Button>
                </CardContent>
            </Card>
             <Card className="shadow-lg border">
                <CardHeader>
                     <div className="flex items-center gap-3 mb-2">
                        <FileText className="w-6 h-6 text-primary" />
                        <CardTitle>Manage Blog Posts</CardTitle>
                    </div>
                    <CardDescription>Add, edit, or delete posts in the 'blogPosts' collection.</CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Link to blog management page */}
                    <Button variant="outline" className="mt-4 w-full" asChild>
                      <Link href="/admin/blog">Manage Posts</Link>
                    </Button>
                </CardContent>
            </Card>
             <Card className="shadow-lg border">
                <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                         <FolderKanban className="w-6 h-6 text-primary" />
                        <CardTitle>Manage Projects</CardTitle>
                    </div>
                    <CardDescription>Add, edit, or delete entries in the 'projects' collection.</CardDescription>
                </CardHeader>
                <CardContent>
                     {/* Link to projects management page */}
                    <Button variant="outline" className="mt-4 w-full" asChild>
                      <Link href="/admin/projects">Manage Projects</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>

         <div className="mt-16 p-6 border border-blue-500/50 bg-blue-500/10 rounded-lg text-blue-700 dark:text-blue-300 text-center max-w-4xl mx-auto">
             <h3 className="font-semibold mb-2 flex items-center justify-center gap-2"><Database className="w-5 h-5" /> Firestore Integration Note:</h3>
             <p className="text-sm">This admin dashboard interacts with Firestore collections: <code className="font-mono bg-blue-200 dark:bg-blue-900 px-1.5 py-0.5 rounded text-blue-800 dark:text-blue-200 text-xs mx-1">personalDetails</code>, <code className="font-mono bg-blue-200 dark:bg-blue-900 px-1.5 py-0.5 rounded text-blue-800 dark:text-blue-200 text-xs mx-1">blogPosts</code>, and <code className="font-mono bg-blue-200 dark:bg-blue-900 px-1.5 py-0.5 rounded text-blue-800 dark:text-blue-200 text-xs mx-1">projects</code>. Public read access is configured via <code className="font-mono bg-blue-200 dark:bg-blue-900 px-1.5 py-0.5 rounded text-blue-800 dark:text-blue-200 text-xs mx-1">firestore.rules</code>. Ensure write rules are set for authenticated users (e.g., <code className="font-mono bg-blue-200 dark:bg-blue-900 px-1.5 py-0.5 rounded text-blue-800 dark:text-blue-200 text-xs mx-1">allow write: if request.auth != null;</code>).</p>
        </div>
    </div>
  );
}
