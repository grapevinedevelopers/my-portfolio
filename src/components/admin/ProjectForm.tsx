// src/components/admin/ProjectForm.tsx
'use client';

import type { FC } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea'; // Keep for description
import { Label } from '@/components/ui/label';
import RichTextEditor from './RichTextEditor'; // Import the new editor
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
import type { Project } from '@/services/projectService';
import { createProjectAction, updateProjectAction } from '@/actions/projectActions';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useState } from 'react';

// Define Zod schema for Project validation (matching the server action expected input)
// imageUrl will now hold a Base64 string or an existing URL.
// details field validation remains optional string (editor handles content)
// createdAt/updatedAt are not directly editable in the form, so they aren't included here.
const projectFormSchema = z.object({
  id: z.string().optional(), // Optional for new projects
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with dashes'),
  description: z.string().min(1, 'Short description is required').max(150, 'Short description must be 150 characters or less'),
  details: z.string().optional(), // Optional details field (rich text/markdown HTML)
  privacyPolicy: z.string().optional(), // Optional privacy policy field
  imageUrl: z.string().min(1, 'Image URL or upload is required'), // Will store Base64 Data URI or existing URL
  link: z.string().min(1, 'Project link is required (use # if none)'),
  tags: z.array(z.string()).min(1, 'At least one tag is required'),
  dataAiHint: z.string().optional(),
  order: z.number().int().min(0, 'Order must be a non-negative integer').default(999),
});

// Helper type for the form state (tags as comma-separated string)
type ProjectFormData = Omit<z.infer<typeof projectFormSchema>, 'tags'> & {
    tags: string; // Tags are handled as a comma-separated string in the form input
};

// Type for initialData coming from the server (dates are strings)
type InitialProjectData = Partial<Omit<Project, 'tags' | 'createdAt' | 'updatedAt'> & {
    tags: string[]; // Expect tags as array from server
    createdAt?: string; // Expect ISO string
    updatedAt?: string; // Expect ISO string
}>;

interface ProjectFormProps {
  initialData: InitialProjectData; // Use the adjusted type
  isEditing: boolean;
}

const ProjectForm: FC<ProjectFormProps> = ({ initialData, isEditing }) => {
  const { toast } = useToast();
  const router = useRouter();
  // Store the preview URL (can be Base64 or existing URL)
  const [imagePreview, setImagePreview] = useState<string | null>(initialData.imageUrl || null);

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema.extend({
        // Still validate the string input for tags
        tags: z.string().min(1, 'At least one tag is required (comma-separated)'),
    })),
    defaultValues: {
      id: initialData.id || '',
      title: initialData.title || '',
      slug: initialData.slug || '',
      description: initialData.description || '',
      details: initialData.details || '', // Initialize with existing HTML details or empty
      privacyPolicy: initialData.privacyPolicy || '', // Initialize privacy policy
      imageUrl: initialData.imageUrl || '', // Initialize with existing URL or empty
      link: initialData.link || '',
      tags: initialData.tags?.join(', ') || '', // Convert array back to string for form
      dataAiHint: initialData.dataAiHint || '',
      order: initialData.order ?? 999,
      // Do not include createdAt/updatedAt in form default values as they aren't form fields
    },
  });

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        form.setError('imageUrl', { type: 'manual', message: 'Please select a valid image file (PNG, JPG, GIF, etc.).' });
        setImagePreview(initialData.imageUrl || null); // Reset preview
        form.setValue('imageUrl', initialData.imageUrl || ''); // Reset value
        return;
      }
      // Simple size validation (e.g., < 1MB as Firestore limit is strict)
      // Warn user about large images
      if (file.size > 1 * 1024 * 1024 * 0.9) { // ~900KB to leave room for other fields
         form.setError('imageUrl', { type: 'manual', message: 'Image too large for Base64 storage (max ~900KB recommended).' });
         toast({
            title: "Image Too Large",
            description: "Images over ~900KB might exceed database limits when stored as Base64. Consider optimizing the image.",
            variant: "destructive",
            duration: 7000,
         })
         setImagePreview(initialData.imageUrl || null); // Reset preview
         form.setValue('imageUrl', initialData.imageUrl || ''); // Reset value
        return;
      }


      form.clearErrors('imageUrl'); // Clear previous errors
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String); // Show preview
        form.setValue('imageUrl', base64String); // Store Base64 Data URI in the imageUrl field
      };
      reader.readAsDataURL(file);
    } else {
      // If no file is selected (e.g., user cancels), reset to initial image URL
      setImagePreview(initialData.imageUrl || null);
      form.setValue('imageUrl', initialData.imageUrl || '');
    }
  };


  const onSubmit: SubmitHandler<ProjectFormData> = async (formData) => {
    form.clearErrors();
    console.log("Project Form Data Submitted (Client):", { ...formData, imageUrl: formData.imageUrl.startsWith('data:image') ? '[Base64 Data]' : formData.imageUrl });

    const tagsArray = formData.tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag !== '');

     // Ensure imageUrl has a value (either original URL or new Base64)
     if (!formData.imageUrl) {
         form.setError('imageUrl', { type: 'manual', message: 'Image is required. Please upload or ensure an existing URL is present.' });
         toast({ title: 'Validation Error', description: 'Image is required.', variant: 'destructive' });
         return;
     }

    // Prepare data for the action. imageUrl directly contains the Base64 string or existing URL.
    // Exclude id, createdAt, updatedAt from the payload sent to the action (action handles these)
    const projectDataForAction: Omit<Project, 'id' | 'createdAt' | 'updatedAt'> = {
      title: formData.title,
      slug: formData.slug,
      description: formData.description,
      details: formData.details,
      privacyPolicy: formData.privacyPolicy,
      imageUrl: formData.imageUrl, // Pass the Base64 string or URL directly
      link: formData.link,
      tags: tagsArray,
      dataAiHint: formData.dataAiHint,
      order: typeof formData.order === 'number' ? formData.order : parseInt(String(formData.order), 10) || 999,
    };

    console.log("Data being sent to action:", { ...projectDataForAction, imageUrl: projectDataForAction.imageUrl.startsWith('data:image') ? '[Base64 Data]' : projectDataForAction.imageUrl });


    try {
      let result;
      if (isEditing && initialData.id) {
        // Pass the ID and the prepared data (without timestamps/id)
        result = await updateProjectAction(initialData.id, projectDataForAction);
      } else {
        // For creation, send the prepared data
        result = await createProjectAction(projectDataForAction);
      }

      console.log("Server Action Result:", result);

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message || (isEditing ? 'Project updated successfully.' : 'Project created successfully.'),
          variant: 'default',
        });
        router.push('/admin/projects');
        router.refresh();
      } else {
         let errorMessage = result.message || 'An unknown error occurred.';
         if (result.errorCode === 'validation-error' && result.error) {
            try {
               const errors = JSON.parse(result.error);
               errorMessage = `Validation failed: ${Object.entries(errors).map(([field, msgs]) => `${field}: ${(msgs as string[]).join(', ')}`).join('; ')}`;
            } catch { /* ignore parsing error */ }
         } else if (result.errorCode === 'data-too-large'){
             errorMessage = 'Failed to save project. The data (likely the image) exceeds the database size limit (around 1MB).'
         }
        toast({
          title: `Error ${isEditing ? 'Updating' : 'Creating'} Project`,
          description: errorMessage,
          variant: 'destructive',
        });
         if (result.error && result.errorCode !== 'validation-error') {
             console.error("Server Action Error Detail:", result.error);
         }
      }
    } catch (error) {
      console.error("Client-side Form submission error:", error);
      toast({
        title: 'Submission Error',
        description: 'Could not submit the form. Please check your connection or server logs.',
        variant: 'destructive',
      });
    }
  };

   // Helper function to generate slug from title
   const generateSlug = (title: string) => {
     return title
       .toLowerCase()
       .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and dashes
       .trim()
       .replace(/\s+/g, '-') // Replace spaces with dashes
       .replace(/-+/g, '-'); // Replace multiple dashes with single dash
   };

   const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value;
      form.setValue('title', newTitle); // Update title field
      if (!isEditing || !form.getValues('slug')) { // Only auto-generate slug if not editing or slug is empty
         form.setValue('slug', generateSlug(newTitle)); // Auto-generate slug
      }
   };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Existing Fields: Title, Order, Description */}
         <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Project Title" {...field} onChange={handleTitleChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

         {/* Slug Field */}
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Slug</FormLabel>
              <FormControl>
                <Input placeholder="unique-project-slug" {...field} />
              </FormControl>
              <FormDescription>
                Lowercase alphanumeric characters and dashes only (e.g., "my-cool-project"). Auto-generated from title if left empty on creation.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

         <FormField
          control={form.control}
          name="order"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Order</FormLabel>
              <FormControl>
                <Input
                   type="number"
                   placeholder="Enter display order (e.g., 1, 2, 3)"
                   {...field}
                    // Ensure value passed to form state is a number or string that can be parsed
                   onChange={(e) => field.onChange(parseInt(e.target.value, 10))} // Store as number
                   value={field.value ?? ''} // Handle potential undefined/null for controlled input
                 />
              </FormControl>
               <FormDescription>
                 Lower numbers appear first. Use this to order projects on the main page. Defaults to 999 if empty.
               </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

         <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Short Description (Max 150 chars)</FormLabel>
              <FormControl>
                <Textarea placeholder="Brief project summary for card display" {...field} rows={3} maxLength={150} />
              </FormControl>
              <FormDescription>This short description appears on the project card listings.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

         {/* Details Field - Replace Textarea with RichTextEditor */}
         <FormField
          control={form.control}
          name="details"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Details (Rich Text / Markdown)</FormLabel>
              <FormControl>
                 {/* Use the RichTextEditor component */}
                <RichTextEditor
                   value={field.value || ''} // Pass HTML string
                   onChange={field.onChange} // Receive HTML string back
                   placeholder="Provide detailed information about the project here..."
                 />
              </FormControl>
              <FormDescription>
                Use the toolbar for formatting or write Markdown. Content is saved as HTML.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Privacy Policy Field */}
        <FormField
          control={form.control}
          name="privacyPolicy"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Privacy Policy (Optional)</FormLabel>
              <FormControl>
                <RichTextEditor
                  value={field.value || ''}
                  onChange={field.onChange}
                  placeholder="Write the project-specific privacy policy here..."
                />
              </FormControl>
              <FormDescription>
                If provided, a link to this privacy policy will be displayed on the project's detail page.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

         {/* Image Upload Field - Binds directly to imageUrl for Base64 */}
         <FormField
           control={form.control}
           name="imageUrl" // Bind to imageUrl, which will hold the Base64 string or URL
           render={({ field: { onChange, value, ...restField }}) => ( // Exclude onChange and value from being spread directly to Input
             <FormItem>
               <FormLabel>Project Image</FormLabel>
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
                 Upload an image (max ~900KB recommended for Base64). This will replace the current image/URL.
               </FormDescription>
                {/* Display any specific error related to image handling/validation */}
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
                <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-md border">
                <Image src={imagePreview} alt="Project image preview" fill style={{ objectFit: 'contain' }} unoptimized={imagePreview.startsWith('data:image')} />
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
                <Input placeholder="e.g., web application dashboard screenshot" {...field} value={field.value ?? ''}/>
              </FormControl>
              <FormDescription>
                Provide 1-2 keywords for image generation/search if using placeholder images.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Existing Fields: Link, Tags */}
        <FormField
          control={form.control}
          name="link"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project Link</FormLabel>
              <FormControl>
                <Input placeholder="https://github.com/user/repo or https://project-demo.com or #" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormDescription>
                URL to the project demo, repository, or case study (use '#' if no link).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tags</FormLabel>
              <FormControl>
                <Input placeholder="e.g., React, Next.js, Tailwind CSS" {...field} />
              </FormControl>
              <FormDescription>
                Enter tags separated by commas.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />


        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Saving...' : (isEditing ? 'Update Project' : 'Create Project')}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} className="ml-4">
           Cancel
        </Button>
      </form>
    </Form>
  );
};

export default ProjectForm;
