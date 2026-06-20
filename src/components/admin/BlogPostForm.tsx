// src/components/admin/BlogPostForm.tsx
'use client';

import type { FC } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import RichTextEditor from './RichTextEditor'; // Import RichTextEditor
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import type { BlogPost } from '@/services/blogService';
import { createBlogPostAction, updateBlogPostAction } from '@/actions/blogActions';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import { useState, useEffect } from 'react';

// Define Zod schema for Blog Post validation (from form)
// imageUrl now expects a string (URL or Base64)
const blogPostFormSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with dashes'),
  summary: z.string().min(1, 'Summary is required').max(200, 'Summary must be 200 characters or less'),
  content: z.string().min(1, 'Content is required'), // Will hold HTML from editor
  imageUrl: z.string().min(1, 'Image URL or upload is required'), // Can be URL or Base64
  dataAiHint: z.string().optional(),
  date: z.string().refine((date) => !isNaN(new Date(date).getTime()), {
    message: 'Invalid date format',
  }),
  // authorId and authorName are added programmatically before calling the action
});

// Infer the type for the form itself
type BlogPostFormData = z.infer<typeof blogPostFormSchema>;

interface BlogPostFormProps {
  initialData: Partial<BlogPost>; // Timestamps are already strings here from the page component
  isEditing: boolean;
}

const BlogPostForm: FC<BlogPostFormProps> = ({ initialData, isEditing }) => {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  // State for image preview (can be URL or Base64 Data URI)
  const [imagePreview, setImagePreview] = useState<string | null>(initialData.imageUrl || null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const form = useForm<BlogPostFormData>({
    resolver: zodResolver(blogPostFormSchema), // Action adds author info
    defaultValues: {
      id: initialData.id || '',
      title: initialData.title || '',
      slug: initialData.slug || '',
      summary: initialData.summary || '',
      content: initialData.content || '',
      imageUrl: initialData.imageUrl || '',
      dataAiHint: initialData.dataAiHint || '',
      // Ensure date is initialized as ISO string
      date: initialData.date ? new Date(initialData.date).toISOString() : new Date().toISOString(),
    },
  });

  // Initialize image preview when initialData changes (e.g., on edit page load)
  useEffect(() => {
      if (initialData.imageUrl) {
          setImagePreview(initialData.imageUrl);
      }
  }, [initialData.imageUrl]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const currentImageUrl = form.getValues('imageUrl'); // Get current value in form state

    if (file) {
      if (!file.type.startsWith('image/')) {
        form.setError('imageUrl', { type: 'manual', message: 'Please select a valid image file.' });
        setImagePreview(currentImageUrl || initialData.imageUrl || null); // Revert to current form state or initial
        form.setValue('imageUrl', currentImageUrl || initialData.imageUrl || '');
        return;
      }
      // ~900KB limit for Base64 in Firestore document
      if (file.size > 900 * 1024) {
        form.setError('imageUrl', { type: 'manual', message: 'Image too large for Base64 storage (max ~900KB recommended).' });
        toast({
          title: "Image Too Large",
          description: "Images over ~900KB might exceed database limits. Consider optimizing or using a URL.",
          variant: "destructive",
          duration: 7000,
        });
         // Reset preview and form value to the state *before* this failed upload attempt
         setImagePreview(currentImageUrl || initialData.imageUrl || null);
         form.setValue('imageUrl', currentImageUrl || initialData.imageUrl || '');
        return;
      }

      form.clearErrors('imageUrl');
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        console.log("BlogPostForm: Image read as Base64, setting preview and form value.");
        setImagePreview(base64String);
        // IMPORTANT: Update the form state with the Base64 string
        form.setValue('imageUrl', base64String, { shouldValidate: true, shouldDirty: true });
      };
      reader.readAsDataURL(file);
    } else {
        // If user cancels file selection, reset to initial value if editing, or clear if adding
        const resetValue = isEditing ? (initialData.imageUrl || '') : '';
        console.log(`BlogPostForm: No file selected, resetting imageUrl to: ${resetValue ? '[initial value]' : '[empty]'}`);
        setImagePreview(resetValue || null);
        form.setValue('imageUrl', resetValue);
    }
  };


  const onSubmit: SubmitHandler<BlogPostFormData> = async (formData) => {
    form.clearErrors();
    const isNewImageUploaded = formData.imageUrl?.startsWith('data:image');
    console.log("Blog Form Data Submitted (Client):", {
        ...formData,
        imageUrl: isNewImageUploaded ? '[Base64 Data]' : formData.imageUrl
    });

    if (!user) {
      toast({
        title: 'Authentication Error',
        description: 'You must be logged in to create or update a post.',
        variant: 'destructive',
      });
      return;
    }

    // Ensure imageUrl has a value (either original URL or new Base64)
     if (!formData.imageUrl) {
       form.setError('imageUrl', { type: 'manual', message: 'Image is required. Please upload or ensure an existing URL is present.' });
       toast({ title: 'Validation Error', description: 'Image is required.', variant: 'destructive' });
       return;
    }

    // Prepare data for the action, adding author info
    const actionDataForCreate: Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt'> = {
      title: formData.title,
      slug: formData.slug,
      summary: formData.summary,
      content: formData.content,
      imageUrl: formData.imageUrl, // Pass Base64 or URL
      dataAiHint: formData.dataAiHint,
      date: formData.date, // Already ISO string
      authorId: user.uid,
      authorName: user.displayName || user.email || 'Anonymous',
    };

     // Only include fields intended for update, omit author info
    const actionDataForUpdate: Partial<Omit<BlogPost, 'id' | 'createdAt' | 'authorId' | 'authorName'>> = {
      title: formData.title,
      slug: formData.slug,
      summary: formData.summary,
      content: formData.content,
      imageUrl: formData.imageUrl, // Pass Base64 or URL
      dataAiHint: formData.dataAiHint,
      date: formData.date, // Already ISO string
    };

    console.log(`Client: Preparing to call ${isEditing ? 'update' : 'create'} blog post action.`);
    console.log("Client: Data being sent:", isEditing
        ? { ...actionDataForUpdate, imageUrl: actionDataForUpdate.imageUrl?.startsWith('data:image') ? '[Base64 Data]' : actionDataForUpdate.imageUrl }
        : { ...actionDataForCreate, imageUrl: actionDataForCreate.imageUrl.startsWith('data:image') ? '[Base64 Data]' : actionDataForCreate.imageUrl }
    );

    try {
      let result;
      if (isEditing && initialData.id) {
        console.log(`Client: Calling updateBlogPostAction for ID ${initialData.id}`);
        result = await updateBlogPostAction(initialData.id, actionDataForUpdate);
      } else {
        console.log("Client: Calling createBlogPostAction");
        result = await createBlogPostAction(actionDataForCreate);
      }

      console.log("Server Action Result:", result);

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message || (isEditing ? 'Blog post updated successfully.' : 'Blog post created successfully.'),
          variant: 'default',
        });
        // Redirect only after successful save
        router.push('/admin/blog');
        router.refresh(); // Revalidate data on the blog list page
      } else {
        let errorMessage = result.message || 'An unknown error occurred.';
        if (result.errorCode === 'validation-error' && result.error) {
          try {
            const errors = JSON.parse(result.error);
            errorMessage = `Validation failed: ${Object.entries(errors).map(([field, msgs]) => `${field}: ${(msgs as string[]).join(', ')}`).join('; ')}`;
          } catch { /* ignore parsing error */ }
        } else if (result.errorCode === 'data-too-large') {
            errorMessage = 'Failed to save post. The data (likely the image) exceeds the database size limit (around 1MB).';
        } else if (result.errorCode === 'permission-denied') {
             errorMessage = 'Permission denied. Ensure you are logged in and Firestore rules allow this operation.';
        } else if (result.errorCode === 'unauthenticated') {
             errorMessage = 'Authentication failed. Please log in again.';
        }
        toast({
          title: `Error ${isEditing ? 'Updating' : 'Creating'} Blog Post`,
          description: errorMessage,
          variant: 'destructive',
          duration: 7000,
        });
        if (result.error && result.errorCode !== 'validation-error') {
            console.error("Server Action Error Detail:", result.error);
        }
         // Keep form state on error
      }
    } catch (error) {
      console.error("Client-side Form submission error:", error);
      toast({
        title: 'Submission Error',
        description: 'Could not submit the form. Please check your connection or server logs.',
        variant: 'destructive',
      });
       // Keep form state on unexpected client-side error
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    form.setValue('title', newTitle);
    if (!isEditing || !form.getValues('slug')) {
      form.setValue('slug', generateSlug(newTitle));
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Blog Post Title" {...field} onChange={handleTitleChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Slug</FormLabel>
              <FormControl>
                <Input placeholder="unique-post-slug" {...field} />
              </FormControl>
              <FormDescription>
                Lowercase alphanumeric characters and dashes only (e.g., "my-first-post"). Auto-generated from title if left empty on creation.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Publication Date</FormLabel>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[240px] pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(new Date(field.value), "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value ? new Date(field.value) : undefined}
                    onSelect={(date) => {
                       field.onChange(date?.toISOString());
                       setCalendarOpen(false); // Close calendar on selection
                    }}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="summary"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Summary (Max 200 chars)</FormLabel>
              <FormControl>
                <Textarea placeholder="A brief summary for card display" {...field} rows={3} maxLength={200} />
              </FormControl>
              <FormDescription>This short summary appears on the blog listing page.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Image Upload Field */}
         <FormField
           control={form.control}
           name="imageUrl" // Bind to imageUrl, which will hold the Base64 string or URL
           render={({ field: { onChange, value, ...restField }}) => ( // Exclude onChange and value from being spread directly to Input
             <FormItem>
               <FormLabel>Thumbnail Image</FormLabel>
               <FormControl>
                 <Input
                   type="file"
                   accept="image/*"
                   onChange={(e) => {
                     handleImageChange(e); // Call the handler to read file and set Base64
                   }}
                   {...restField} // Spread remaining field props (name, onBlur, ref)
                 />
               </FormControl>
               <FormDescription>
                 Upload an image (max ~900KB recommended). This will replace the current image/URL.
               </FormDescription>
               <FormMessage />
                {/* Display the existing/provided URL if no preview (Base64) is set */}
                {!imagePreview?.startsWith('data:image') && value && (
                   <p className="text-sm text-muted-foreground mt-2">Current Image URL: {value}</p>
                )}
             </FormItem>
           )}
         />

        {/* Image Preview */}
         {imagePreview && (
          <div className="mt-4 space-y-2">
            <Label>Image Preview</Label>
            <div className="relative aspect-video w-full max-w-sm overflow-hidden rounded-md border">
              <Image src={imagePreview} alt="Blog post image preview" fill style={{ objectFit: 'contain' }} unoptimized={imagePreview.startsWith('data:image')} />
            </div>
          </div>
        )}


        <FormField
          control={form.control}
          name="dataAiHint"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image AI Hint (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., tech article abstract background" {...field} value={field.value ?? ''}/>
              </FormControl>
              <FormDescription>
                Provide 1-2 keywords for image generation/search if using placeholder images.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Content (Rich Text / Markdown)</FormLabel>
              <FormControl>
                <RichTextEditor
                  value={field.value || ''}
                   // Connect TipTap's update logic directly to the field's onChange
                  onChange={field.onChange}
                  placeholder="Write your blog post content here..."
                />
              </FormControl>
              <FormDescription>
                Use the toolbar for formatting or write Markdown. Content is saved as HTML.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={form.formState.isSubmitting || !user}>
          {form.formState.isSubmitting ? 'Saving...' : (isEditing ? 'Update Post' : 'Create Post')}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} className="ml-4">
          Cancel
        </Button>
      </form>
    </Form>
  );
};

export default BlogPostForm;
