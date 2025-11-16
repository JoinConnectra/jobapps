"use client";

import { useState } from 'react';
import Image from 'next/image';

type PortalType = 'employer' | 'applicant' | 'university';

const portalConfig = {
  employer: {
    label: 'Employer Portal',
    image: '/images/employer-screenshot.png',
    alt: 'Employer portal showcase',
  },
  applicant: {
    label: 'Applicant Portal',
    image: '/images/applicant-screenshot.png',
    alt: 'Applicant portal showcase',
  },
  university: {
    label: 'University Portal',
    image: '/images/university-screenshot.png',
    alt: 'University portal showcase',
  },
};

const ApplicantShowcaseSection = () => {
  const [activePortal, setActivePortal] = useState<PortalType>('employer');
  const currentConfig = portalConfig[activePortal];

  return (
    <section className="relative w-full bg-white py-16 md:py-20 lg:py-24">
      <div className="container mx-auto px-6">
        <div className="max-w-5xl mx-auto">
          {/* Portal selection buttons - outside the card */}
          <div className="flex items-center justify-center gap-3 mb-6">
            {(['employer', 'applicant', 'university'] as PortalType[]).map((portal) => (
              <button
                key={portal}
                onClick={() => setActivePortal(portal)}
                className={`rounded bg-[#3d6a4a] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2f5239] ${
                  activePortal === portal ? 'ring-2 ring-[#3d6a4a] ring-offset-2' : ''
                }`}
              >
                {portalConfig[portal].label}
              </button>
            ))}
          </div>

          {/* Card container - full width screenshot */}
          <div className="relative rounded-xl overflow-hidden shadow-lg bg-gray-100">
            {/* Full width screenshot display with gradient background */}
            <div className="relative h-[500px] md:h-[600px]">
              {/* Gradient background image */}
              <div className="absolute inset-0 w-full h-full">
                <Image
                  key={`gradient-${activePortal}`}
                  src={
                    activePortal === 'applicant' 
                      ? '/images/green-red-gradient.png' 
                      : activePortal === 'university'
                      ? '/images/yellow-red-gradient.png'
                      : '/images/purple-red-gradient.png'
                  }
                  alt="Background gradient"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
              
              {/* Screenshot overlay */}
              <div className="relative z-10 flex items-center justify-center h-full p-8 md:p-12 lg:p-16">
                <div className="w-full max-w-[85%]">
                  <Image
                    key={activePortal}
                    src={currentConfig.image}
                    alt={currentConfig.alt}
                    width={1000}
                    height={667}
                    className="w-full h-auto rounded-lg shadow-xl"
                    priority={activePortal === 'employer' || activePortal === 'applicant'}
                    unoptimized
                    onError={(e) => {
                      // Fallback to employer screenshot if image doesn't exist
                      if (activePortal !== 'employer') {
                        const target = e.target as HTMLImageElement;
                        target.src = '/images/employer-screenshot.png';
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ApplicantShowcaseSection;

