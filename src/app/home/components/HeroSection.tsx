// src/app/home/components/HeroSection.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Linkedin } from 'lucide-react';

interface HeroSectionProps {
  name: string;
  title: string;
  bio: string;
  linkedinUrl: string;
  profileImageUrl: string;
}

export default function HeroSection({ name, title, bio, linkedinUrl, profileImageUrl }: HeroSectionProps) {
  return (
    <section id="about" className="w-full py-20 md:py-28 lg:py-36 bg-gradient-to-br from-background via-indigo-50 dark:via-indigo-950/30 to-background">
      <div className="container mx-auto max-w-screen-xl px-4 md:px-6 grid gap-12 lg:grid-cols-2 lg:gap-20 items-center">
        <div className="space-y-6 lg:space-y-8">
          <h1 className="text-5xl font-bold tracking-tighter sm:text-6xl md:text-7xl lg:text-8xl text-foreground leading-tight">
             {name}
          </h1>
           <p className="text-2xl font-semibold text-primary">{title}</p>
          <p className="text-lg text-muted-foreground md:text-xl lg:text-2xl leading-relaxed max-w-prose">
             {bio}
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
             <Button asChild size="lg" className="shadow-lg hover:shadow-xl transition-shadow duration-300">
               <Link href="#contact">Get in Touch</Link>
             </Button>
             <Button asChild variant="outline" size="lg" className="shadow-lg hover:shadow-xl transition-shadow duration-300 border-2 border-border hover:border-primary">
                <Link href={linkedinUrl} target="_blank" rel="noopener noreferrer">
                   <Linkedin className="mr-2 h-5 w-5" /> LinkedIn Profile
                </Link>
             </Button>
           </div>
        </div>
         <div className="flex justify-center items-center group perspective-1000">
           <Avatar className="w-56 h-56 md:w-72 md:h-72 lg:w-80 lg:h-80 border-4 border-background shadow-2xl transform-style-3d transition-transform duration-500 ease-out group-hover:rotate-y-6 group-hover:scale-105">
             <AvatarImage
                 src={profileImageUrl}
                 alt={name}
                 className="transition-transform duration-500 ease-out group-hover:scale-110"
                 data-ai-hint="professional headshot portrait man indian glasses studio light"
             />
              <AvatarFallback className="text-6xl font-semibold bg-gradient-to-br from-primary/10 to-secondary/10">
                 {name?.split(' ').map(n => n[0]).join('') || 'AK'} {/* Initials Fallback */}
             </AvatarFallback>
           </Avatar>
         </div>
      </div>
    </section>
  );
}
