// src/app/home/components/ResumeSection.tsx
import { Button } from '@/components/ui/button';
import { Briefcase, GraduationCap, Download } from 'lucide-react';
import Link from 'next/link';
import type { Experience, Education } from '@/services/personalDetailsService'; // Assuming types are exported

interface ResumeSectionProps {
  experience: Experience[];
  education: Education[];
  resumeUrl?: string;
}

export default function ResumeSection({ experience, education, resumeUrl }: ResumeSectionProps) {
  return (
    <section id="resume" className="w-full py-20 md:py-28 lg:py-32 bg-background">
      <div className="container mx-auto max-w-screen-xl px-4 md:px-6 text-center">
        <h2 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl mb-6">My Background</h2>
        <p className="max-w-3xl mx-auto text-muted-foreground md:text-xl lg:text-2xl leading-relaxed mb-12">
          An overview of my professional path and education. For a detailed look, connect on LinkedIn or download my resume.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mt-20 max-w-5xl mx-auto text-left">
            {/* Experience Section */}
            <div className="space-y-8">
              <h3 className="text-3xl font-semibold mb-8 flex items-center gap-3 border-b-2 border-primary pb-3"><Briefcase className="w-7 h-7 text-primary"/> Experience</h3>
               {experience.length > 0 ? (
                <ul className="space-y-6 text-lg list-none text-muted-foreground">
                   {experience.map((exp, index) => (
                     <li key={exp.id || `exp-${index}`} className="pl-4 border-l-4 border-primary/50">
                       <span className="font-semibold text-foreground block text-xl">{exp.title}</span>
                       <span className="text-primary">{exp.company}</span>
                       {exp.period && <span className="text-sm"> | {exp.period}</span>}
                       <p className="text-base mt-1">{exp.description}</p>
                     </li>
                   ))}
                </ul>
              ) : (
                 <p className="text-muted-foreground italic">Experience details not available.</p>
              )}
            </div>

             {/* Education Section */}
             <div className="space-y-8">
              <h3 className="text-3xl font-semibold mb-8 flex items-center gap-3 border-b-2 border-primary pb-3"><GraduationCap className="w-7 h-7 text-primary"/> Education</h3>
              {education.length > 0 ? (
                <ul className="space-y-6 text-lg list-none text-muted-foreground">
                   {education.map((edu, index) => (
                     <li key={edu.id || `edu-${index}`} className="pl-4 border-l-4 border-primary/50">
                       <span className="font-semibold text-foreground block text-xl">{edu.institution}</span>
                       <p className="text-base mt-1">{edu.degree}, {edu.field}</p>
                     </li>
                   ))}
                </ul>
               ) : (
                 <p className="text-muted-foreground italic">Education details not available.</p>
               )}
            </div>
         </div>

         {/* Download Resume Button */}
         {resumeUrl && resumeUrl !== '#' && resumeUrl.trim() !== '' && (
            <Button size="lg" asChild className="shadow-lg hover:shadow-xl transition-shadow duration-300 mt-16">
                 <Link href={resumeUrl} download={resumeUrl.startsWith('data:') ? "AnkurKhera_Resume.pdf" : undefined} target="_blank" rel="noopener noreferrer">
                    <Download className="mr-2 h-5 w-5" /> Download Resume
                 </Link>
            </Button>
        )}

      </div>
    </section>
  );
}
