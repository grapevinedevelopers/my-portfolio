// src/app/home/components/ContactSection.tsx
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Linkedin, Github, Twitter, MapPin } from 'lucide-react';
import Link from 'next/link';

interface ContactSectionProps {
  email: string;
  linkedinUrl: string;
  githubUrl?: string;
  twitterUrl?: string;
  location: string;
}

export default function ContactSection({ email, linkedinUrl, githubUrl, twitterUrl, location }: ContactSectionProps) {
  return (
    <section id="contact" className="w-full py-20 md:py-28 lg:py-32 bg-gradient-to-br from-secondary/20 via-background to-secondary/20 dark:from-secondary/5 dark:via-background dark:to-secondary/5">
      <div className="container mx-auto max-w-screen-xl px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-6 text-center mb-16">
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">Let's Connect</h2>
          <p className="max-w-3xl text-muted-foreground md:text-xl lg:text-2xl leading-relaxed">
            Reach out to discuss collaboration, opportunities, or just to say hello.
          </p>
        </div>
        <div className="max-w-xl mx-auto">
          <Card className="shadow-xl border-2 border-border/80 rounded-xl">
            <CardContent className="p-8 md:p-10 flex flex-col items-center space-y-8">
              <div className="flex items-center space-x-4 text-lg md:text-xl group">
                <Mail className="w-7 h-7 text-primary transition-transform duration-300 group-hover:scale-110" />
                <a href={`mailto:${email}`} className="text-foreground hover:text-primary transition-colors duration-200 font-medium">{email}</a>
              </div>
              <div className="flex items-center space-x-4 text-lg md:text-xl group">
                <Linkedin className="w-7 h-7 text-primary transition-transform duration-300 group-hover:scale-110" />
                <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary transition-colors duration-200 font-medium">LinkedIn Profile</a>
              </div>
              {githubUrl && githubUrl !== '#' && (
                <div className="flex items-center space-x-4 text-lg md:text-xl group">
                  <Github className="w-7 h-7 text-primary transition-transform duration-300 group-hover:scale-110" />
                  <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary transition-colors duration-200 font-medium">GitHub Profile</a>
                </div>
              )}
              {twitterUrl && twitterUrl !== '#' && (
                <div className="flex items-center space-x-4 text-lg md:text-xl group">
                  <Twitter className="w-7 h-7 text-primary transition-transform duration-300 group-hover:scale-110" />
                  <a href={twitterUrl} target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary transition-colors duration-200 font-medium">Twitter / X Profile</a>
                </div>
              )}
              <div className="flex items-center space-x-4 text-lg md:text-xl group">
                <MapPin className="w-7 h-7 text-primary transition-transform duration-300 group-hover:scale-110" />
                <span className="text-foreground font-medium">{location}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
