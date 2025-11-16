"use client";

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

const jobRoles = [
  'software engineering',
  'data science',
  'product management',
  'marketing',
  'sales',
  'accounting',
  'human resources',
  'graphic design',
  'content writing',
  'business development',
];

export default function AnimatedSearchSection() {
  const [displayedText, setDisplayedText] = useState('');
  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isScaled, setIsScaled] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const baseText = "Generate me a job description for my company for the role ";
  const currentRole = jobRoles[currentRoleIndex];

  // Intersection Observer to detect when section is visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            // Trigger scale animation first, then typing
            setTimeout(() => {
              setIsScaled(true);
              setIsTyping(true);
            }, 100);
          }
        });
      },
      {
        threshold: 0.2, // Trigger when 20% of the section is visible
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isVisible || !isTyping) return;

    let timeout: NodeJS.Timeout;

    if (isTyping && !isDeleting) {
      // Typing out the text
      if (displayedText.length < baseText.length + currentRole.length) {
        if (displayedText.length < baseText.length) {
          // Still typing base text - faster
          timeout = setTimeout(() => {
            setDisplayedText(baseText.slice(0, displayedText.length + 1));
          }, 20);
        } else {
          // Typing the role - faster
          const roleProgress = displayedText.length - baseText.length;
          timeout = setTimeout(() => {
            setDisplayedText(baseText + currentRole.slice(0, roleProgress + 1));
          }, 35);
        }
      } else {
        // Finished typing, wait then start deleting
        timeout = setTimeout(() => {
          setIsDeleting(true);
        }, 1500);
      }
    } else if (isDeleting) {
      // Deleting the role part - faster
      if (displayedText.length > baseText.length) {
        timeout = setTimeout(() => {
          setDisplayedText(displayedText.slice(0, -1));
        }, 20);
      } else {
        // Finished deleting, move to next role
        setIsDeleting(false);
        setCurrentRoleIndex((prev) => (prev + 1) % jobRoles.length);
      }
    }

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [displayedText, isTyping, isDeleting, currentRoleIndex, currentRole, baseText, isVisible]);

  return (
    <section id="features" ref={sectionRef} className="relative bg-white py-16 md:py-20 lg:py-24 overflow-hidden">
      <div className="container relative z-10 mx-auto px-6 max-w-5xl">
        {/* Top section - Headline and description */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 mb-10">
          {/* Left side - Headline */}
          <div className="flex items-center">
            <h2 className="font-display font-bold text-[#1A1A1A] text-3xl md:text-4xl lg:text-5xl xl:text-6xl leading-[1.1] tracking-[-0.02em]">
              Generate job descriptions in seconds, not hours
            </h2>
          </div>

          {/* Right side - Description */}
          <div className="flex items-center">
            <p className="text-sm md:text-base lg:text-lg text-[#666666] leading-relaxed">
              Connectra's AI-powered job description generator helps companies create compelling, accurate job postings in seconds. Simply describe the role you need, and our AI crafts professional job descriptions tailored to your company culture and requirements.
            </p>
          </div>
        </div>

        {/* Bottom section - Search bar with background pattern */}
        <div className="relative w-full flex justify-center">
          {/* Background pattern card - matching SVG aspect ratio (1326x362) */}
          <div className="relative rounded-xl overflow-hidden w-full max-w-5xl" style={{ aspectRatio: '1326/362', minHeight: '200px' }}>
            <div className="absolute inset-0 z-0">
              <Image
                src="/images/green_stripe.svg"
                alt="Background pattern"
                fill
                className="object-cover"
                style={{ opacity: 0.4 }}
              />
            </div>
            
            {/* Search input overlay - centered */}
            <div className="absolute inset-0 z-10 flex items-center justify-center p-5 md:p-7">
              <div className="w-full max-w-4xl px-4">
                <div 
                  className="flex items-center min-h-[52px] sm:min-h-[60px] px-5 sm:px-6 py-3 sm:py-3.5 bg-white rounded-lg border border-gray-200 shadow-sm transition-transform duration-1000 ease-out"
                  style={{
                    transform: isScaled ? 'scale(1)' : 'scale(0.85)',
                    opacity: isScaled ? 1 : 0.8,
                  }}
                >
                  <div 
                    className="flex-1 overflow-x-auto hide-scrollbar"
                    style={{ 
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none',
                      WebkitOverflowScrolling: 'touch',
                    }}
                  >
                    <span className="text-sm sm:text-base md:text-lg text-gray-700 whitespace-nowrap inline-block">
                      {displayedText}
                      <span className="inline-block w-0.5 h-5 sm:h-6 bg-[#6a994e] ml-1 animate-pulse align-middle" />
                    </span>
                  </div>
                  <button className="ml-1 flex-shrink-0 p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <Image
                      src="/images/talentflow-logo.svg"
                      alt="Connectra logo"
                      width={32}
                      height={32}
                      className="w-8 h-8 animate-spin-slow"
                      priority
                      unoptimized
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

