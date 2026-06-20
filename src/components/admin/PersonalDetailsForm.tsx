// src/components/admin/PersonalDetailsForm.tsx
'use client';

import type { FC } from 'react';
import { useForm, useFieldArray, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Trash2, PlusCircle, Upload, FileText, CheckCircle } from 'lucide-react'; // Added FileText, CheckCircle
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
import type { PersonalDetails } from '@/services/personalDetailsService';
import { updatePersonalDetailsAction } from '@/actions/updatePersonalDetailsAction';
import Image from 'next/image';
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { cn } from '@/lib/utils'; // Import cn

// Define Zod schema for validation - ensure it matches PersonalDetails interface
const experienceSchema = z.object({
  id: z.string().optional(), // Allow optional ID for existing entries
  title: z.string().min(1, 'Title is required'),
  company: z.string().min(1, 'Company is required'),
  period: z.string().min(1, 'Period is required'),
  description: z.string().min(1, 'Description is required'),
});

const educationSchema = z.object({
  id: z.string().optional(),
  institution: z.string().min(1, 'Institution is required'),
  degree: z.string().min(1, 'Degree is required'),
  field: z.string().min(1, 'Field of study is required'),
});

// Updated schema to handle profileImageUrl (can be URL or Base64 Data URI)
// Update resumeUrl to accept string (URL or Base64)
const personalDetailsSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  title: z.string().min(1, 'Title is required'),
  location: z.string().min(1, 'Location is required'),
  bio: z.string().min(1, 'Bio is required'),
  email: z.string().email('Invalid email address'),
  linkedinUrl: z.string().url('Invalid LinkedIn URL').min(1),
  githubUrl: z.string().url('Invalid GitHub URL').optional().or(z.literal('')), // Allow empty or valid URL
  twitterUrl: z.string().url('Invalid Twitter URL').optional().or(z.literal('')),
  profileImageUrl: z.string().min(1, 'Profile Image URL or upload is required'), // Can be URL or Base64 Data URI
  resumeUrl: z.string().optional().or(z.literal('')), // Can be URL or Base64 string or empty
  experience: z.array(experienceSchema),
  education: z.array(educationSchema),
});

interface PersonalDetailsFormProps {
  initialData: PersonalDetails;
}

const PersonalDetailsForm: FC<PersonalDetailsFormProps> = ({ initialData }) => {
  const { toast } = useToast();
  const [imagePreview, setImagePreview] = useState<string | null>(initialData.profileImageUrl || null);
  // Add state for resume file name or Base64 indicator
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);

  const form = useForm<PersonalDetails>({
    resolver: zodResolver(personalDetailsSchema),
    defaultValues: {
        ...initialData,
        profileImageUrl: initialData.profileImageUrl || '',
        resumeUrl: initialData.resumeUrl || '', // Initialize resumeUrl
        experience: initialData.experience.map((exp, i) => ({ ...exp, id: exp.id || `exp-${i}-${Date.now()}` })),
        education: initialData.education.map((edu, i) => ({ ...edu, id: edu.id || `edu-${i}-${Date.now()}` })),
    },
  });

   // Check if initial resumeUrl is a Base64 string on mount
   useState(() => {
    if (initialData.resumeUrl?.startsWith('data:application/pdf;base64,')) {
      setResumeFileName('Uploaded PDF');
    }
  });

  const { fields: experienceFields, append: appendExperience, remove: removeExperience } = useFieldArray({
    control: form.control,
    name: 'experience',
    keyName: 'fieldId',
  });

  const { fields: educationFields, append: appendEducation, remove: removeEducation } = useFieldArray({
    control: form.control,
    name: 'education',
    keyName: 'fieldId',
  });

  // --- Image Handling ---
   const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
     const file = event.target.files?.[0];
     if (file) {
       if (!file.type.startsWith('image/')) {
         form.setError('profileImageUrl', { type: 'manual', message: 'Please select a valid image file.' });
         setImagePreview(initialData.profileImageUrl || null);
         form.setValue('profileImageUrl', initialData.profileImageUrl || '');
         return;
       }
       if (file.size > 1 * 1024 * 1024 * 0.9) { // ~900KB
         form.setError('profileImageUrl', { type: 'manual', message: 'Image too large for Base64 storage (max ~900KB recommended).' });
         toast({
           title: "Image Too Large",
           description: "Images over ~900KB might exceed database limits. Consider optimizing.",
           variant: "destructive",
           duration: 7000,
         });
         setImagePreview(initialData.profileImageUrl || null);
         form.setValue('profileImageUrl', initialData.profileImageUrl || '');
         return;
       }

       form.clearErrors('profileImageUrl');
       const reader = new FileReader();
       reader.onloadend = () => {
         const base64String = reader.result as string;
         setImagePreview(base64String);
         form.setValue('profileImageUrl', base64String);
       };
       reader.readAsDataURL(file);
     } else {
       setImagePreview(initialData.profileImageUrl || null);
       form.setValue('profileImageUrl', initialData.profileImageUrl || '');
     }
   };

   // --- Resume Handling ---
   const handleResumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
     const file = event.target.files?.[0];
     if (file) {
       // Validate file type (only PDF)
       if (file.type !== 'application/pdf') {
         form.setError('resumeUrl', { type: 'manual', message: 'Please select a PDF file.' });
         setResumeFileName(null); // Reset file name
         form.setValue('resumeUrl', initialData.resumeUrl || ''); // Reset value to initial
         toast({ title: 'Invalid File Type', description: 'Only PDF files are allowed for the resume.', variant: 'destructive' });
         return;
       }
       // Validate file size (e.g., < 1MB for Firestore)
       if (file.size > 1 * 1024 * 1024 * 0.9) { // ~900KB
         form.setError('resumeUrl', { type: 'manual', message: 'PDF too large for Base64 storage (max ~900KB recommended).' });
         setResumeFileName(null);
         form.setValue('resumeUrl', initialData.resumeUrl || '');
         toast({
           title: "PDF Too Large",
           description: "PDFs over ~900KB might exceed database limits. Please optimize or use a URL.",
           variant: "destructive",
           duration: 7000,
         });
         return;
       }

       form.clearErrors('resumeUrl');
       const reader = new FileReader();
       reader.onloadend = () => {
         const base64String = reader.result as string;
         setResumeFileName(file.name); // Show file name as preview
         form.setValue('resumeUrl', base64String); // Store Base64 Data URI in the resumeUrl field
       };
       reader.readAsDataURL(file);
     } else {
       // If no file is selected (user cancels), reset to initial URL/state
       const initialIsBase64 = initialData.resumeUrl?.startsWith('data:application/pdf');
       setResumeFileName(initialIsBase64 ? 'Uploaded PDF' : null);
       form.setValue('resumeUrl', initialData.resumeUrl || '');
     }
   };

  const onSubmit: SubmitHandler<PersonalDetails> = async (data) => {
    form.clearErrors();
    // Ensure profileImageUrl has a value
    if (!data.profileImageUrl) {
       form.setError('profileImageUrl', { type: 'manual', message: 'Image is required.' });
       toast({ title: 'Validation Error', description: 'Profile image is required.', variant: 'destructive' });
       return;
    }
    // Resume is optional, no specific check needed unless form validation requires it

    console.log("Form Data Submitted:", {
        ...data,
        profileImageUrl: data.profileImageUrl?.startsWith('data:image') ? '[Base64 Image Data]' : data.profileImageUrl,
        resumeUrl: data.resumeUrl?.startsWith('data:application/pdf') ? '[Base64 PDF Data]' : data.resumeUrl
    });

    try {
      // resumeUrl now contains either a URL or a Base64 Data URI
      const result = await updatePersonalDetailsAction(data);
      console.log("Server Action Result:", result);

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message || 'Personal details updated successfully.',
          variant: 'default',
        });
        // Reset form with submitted data
        form.reset(data);
        // Update previews based on saved data
        setImagePreview(data.profileImageUrl || null);
        setResumeFileName(data.resumeUrl?.startsWith('data:application/pdf') ? 'Uploaded PDF' : null);

      } else {
         toast({
           title: 'Error Updating Details',
           description: result.message || 'An unknown error occurred.',
           variant: 'destructive',
         });
         if (result.error) {
             console.error("Server Action Error Detail:", result.error);
         }
         // Optional: revert previews if save fails?
         // setImagePreview(initialData.profileImageUrl || null);
         // setResumeFileName(initialData.resumeUrl?.startsWith('data:application/pdf') ? 'Uploaded PDF' : null);
      }
    } catch (error) {
      console.error("Client-side Form submission error:", error);
      toast({
        title: 'Submission Error',
        description: 'Could not submit the form. Please check your connection.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Your Professional Title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="City, Country" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea placeholder="A short bio about yourself" {...field} rows={4} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Profile Image Upload */}
            <FormField
               control={form.control}
               name="profileImageUrl"
               render={({ field }) => (
                 <FormItem>
                   <FormLabel>Profile Image</FormLabel>
                   <div className="flex items-center gap-4">
                     <Avatar className="w-20 h-20 border">
                       <AvatarImage src={imagePreview || field.value || '/ankur-khera-profile.jpg'} alt={form.getValues('name') || 'User'} />
                       <AvatarFallback>
                          {form.getValues('name')?.split(' ').map(n => n[0]).join('') || 'AK'}
                       </AvatarFallback>
                     </Avatar>
                      <FormControl>
                        <Input
                           type="file"
                           accept="image/*"
                           onChange={(e) => {
                              handleImageChange(e);
                           }}
                           className="flex-1"
                        />
                      </FormControl>
                   </div>
                    <FormDescription>
                     Upload a new profile image (max ~900KB recommended).
                   </FormDescription>
                   <FormMessage />
                 </FormItem>
               )}
            />

            {/* Resume Upload/URL Field */}
            <FormField
              control={form.control}
              name="resumeUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resume (PDF or URL)</FormLabel>
                   <div className="flex items-center gap-4">
                        {/* Show file icon if a file is uploaded or if resumeUrl is a Base64 PDF */}
                        {(resumeFileName || field.value?.startsWith('data:application/pdf')) && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 border rounded-md bg-muted/50 min-w-[120px] justify-center">
                             <FileText className="w-4 h-4 text-green-600" />
                             <span>{resumeFileName || 'Uploaded PDF'}</span>
                           </div>
                        )}
                         {/* Show Input for URL if not a file upload */}
                        {(!resumeFileName && !field.value?.startsWith('data:application/pdf')) && (
                            <Input
                              placeholder="https://example.com/resume.pdf"
                              value={field.value || ''}
                              onChange={(e) => {
                                // If user types a URL, clear the file name state
                                setResumeFileName(null);
                                field.onChange(e.target.value);
                              }}
                              className={cn("flex-1", (resumeFileName || field.value?.startsWith('data:application/pdf')) && "hidden")} // Hide URL input if file uploaded
                            />
                        )}
                         {/* File Upload Input */}
                        <FormControl>
                           <Input
                             type="file"
                             accept="application/pdf"
                             onChange={(e) => {
                                 handleResumeChange(e);
                                 // field.onChange is handled by form.setValue in handler
                             }}
                             className="flex-1" // Takes remaining space
                             aria-label="Upload Resume PDF"
                           />
                         </FormControl>
                    </div>
                    <FormDescription>
                       Enter a URL to your resume PDF or upload a PDF file (max ~900KB recommended for upload).
                    </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

          </CardContent>
        </Card>

         {/* Contact & Socials */}
         <Card>
           <CardHeader>
             <CardTitle>Contact & Social Links</CardTitle>
           </CardHeader>
           <CardContent className="space-y-4">
             <FormField
               control={form.control}
               name="email"
               render={({ field }) => (
                 <FormItem>
                   <FormLabel>Email</FormLabel>
                   <FormControl>
                     <Input type="email" placeholder="your.email@example.com" {...field} />
                   </FormControl>
                   <FormMessage />
                 </FormItem>
               )}
             />
             <FormField
               control={form.control}
               name="linkedinUrl"
               render={({ field }) => (
                 <FormItem>
                   <FormLabel>LinkedIn URL</FormLabel>
                   <FormControl>
                     <Input placeholder="https://linkedin.com/in/yourprofile" {...field} />
                   </FormControl>
                   <FormMessage />
                 </FormItem>
               )}
             />
             <FormField
               control={form.control}
               name="githubUrl"
               render={({ field }) => (
                 <FormItem>
                   <FormLabel>GitHub URL (Optional)</FormLabel>
                   <FormControl>
                     <Input placeholder="https://github.com/yourusername" {...field} />
                   </FormControl>
                   <FormMessage />
                 </FormItem>
               )}
             />
             <FormField
               control={form.control}
               name="twitterUrl"
               render={({ field }) => (
                 <FormItem>
                   <FormLabel>Twitter URL (Optional)</FormLabel>
                   <FormControl>
                     <Input placeholder="https://twitter.com/yourhandle" {...field} />
                   </FormControl>
                   <FormMessage />
                 </FormItem>
               )}
             />
           </CardContent>
         </Card>

        {/* Experience Section */}
        <Card>
          <CardHeader>
            <CardTitle>Work Experience</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {experienceFields.map((field, index) => (
              <Card key={field.fieldId} className="p-4 border bg-muted/30">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name={`experience.${index}.title`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Title</FormLabel>
                        <FormControl><Input {...field} placeholder="e.g., Software Engineer" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`experience.${index}.company`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company</FormLabel>
                        <FormControl><Input {...field} placeholder="e.g., Google" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name={`experience.${index}.period`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Period</FormLabel>
                        <FormControl><Input {...field} placeholder="e.g., 2020 - Present or Jan 2019 - Dec 2020" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`experience.${index}.description`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl><Textarea {...field} placeholder="Describe your role and responsibilities" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="button" variant="destructive" size="sm" onClick={() => removeExperience(index)}>
                    <Trash2 className="h-4 w-4 mr-1" /> Remove Experience
                  </Button>
                </div>
              </Card>
            ))}
             <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendExperience({ id: `new-exp-${Date.now()}`, title: '', company: '', period: '', description: '' })}
              >
                <PlusCircle className="h-4 w-4 mr-1" /> Add Experience
            </Button>
          </CardContent>
        </Card>

        {/* Education Section */}
        <Card>
           <CardHeader>
            <CardTitle>Education</CardTitle>
          </CardHeader>
           <CardContent className="space-y-6">
            {educationFields.map((field, index) => (
               <Card key={field.fieldId} className="p-4 border bg-muted/30">
                 <div className="space-y-4">
                   <FormField
                    control={form.control}
                    name={`education.${index}.institution`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Institution</FormLabel>
                         <FormControl><Input {...field} placeholder="e.g., Stanford University" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`education.${index}.degree`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Degree</FormLabel>
                         <FormControl><Input {...field} placeholder="e.g., B.S. or M.Tech" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`education.${index}.field`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Field of Study</FormLabel>
                         <FormControl><Input {...field} placeholder="e.g., Computer Science" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <Button type="button" variant="destructive" size="sm" onClick={() => removeEducation(index)}>
                     <Trash2 className="h-4 w-4 mr-1" /> Remove Education
                   </Button>
                 </div>
               </Card>
            ))}
             <Button
                type="button"
                variant="outline"
                size="sm"
                 onClick={() => appendEducation({ id: `new-edu-${Date.now()}`, institution: '', degree: '', field: '' })}
              >
                 <PlusCircle className="h-4 w-4 mr-1" /> Add Education
            </Button>
          </CardContent>
        </Card>

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>
    </Form>
  );
};

export default PersonalDetailsForm;
