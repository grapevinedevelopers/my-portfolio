// src/app/page.tsx

// Import services (these are now site-aware based on environment variable)
import { getPersonalDetails } from '@/services/personalDetailsService';
import { getLatestBlogPosts } from '@/services/blogService';
import { getFeaturedProjects } from '@/services/projectService';

// Import Section Components
import HeroSection from './home/components/HeroSection';
import BlogSection from './home/components/BlogSection';
import ProjectSection from './home/components/ProjectSection';
import ResumeSection from './home/components/ResumeSection';
import ContactSection from './home/components/ContactSection';

export default async function Home() {
  // Fetch data in parallel - Services implicitly use NEXT_PUBLIC_SITE_ID
  const [personalDetails, blogPosts, projects] = await Promise.all([
    getPersonalDetails(),
    getLatestBlogPosts(3),
    getFeaturedProjects(3),
  ]);

  // Handle case where personal details might be null (service provides defaults)
  if (!personalDetails) {
    console.error("Failed to load personal details for the current site.");
    // Render a fallback or error state if necessary
    return <div>Error loading page data. Please check configuration.</div>;
  }

  // Destructure with defaults from fetched details or the default function's return
  const {
    name,
    title,
    location,
    bio,
    email,
    linkedinUrl,
    profileImageUrl,
    githubUrl,
    twitterUrl,
    resumeUrl,
    experience,
    education,
  } = personalDetails; // Defaults are handled within getPersonalDetails now


  return (
    <div className="flex flex-col min-h-dvh">
      <main className="flex-1">
        {/* Hero Section */}
        <HeroSection
          name={name}
          title={title}
          bio={bio}
          linkedinUrl={linkedinUrl}
          profileImageUrl={profileImageUrl} // Use the potentially site-specific image
        />

        {/* Blog Section */}
        <BlogSection blogPosts={blogPosts} />

        {/* Projects Section */}
        <ProjectSection projects={projects} />

        {/* Resume Section */}
        <ResumeSection
            experience={experience}
            education={education}
            resumeUrl={resumeUrl} // Use potentially site-specific resume URL
         />

        {/* Contact Section */}
        <ContactSection
            email={email}
            linkedinUrl={linkedinUrl}
            githubUrl={githubUrl}
            twitterUrl={twitterUrl}
            location={location}
         />
      </main>
    </div>
  );
}
