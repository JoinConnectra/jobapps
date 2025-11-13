"use client";

import { useState } from 'react';
import Image from 'next/image';

type PortalType = 'employer' | 'applicant' | 'university';

const portalConfig = {
  employer: {
    label: 'Employer Dashboard',
    image: '/images/employer-screenshot.png',
    alt: 'Employer dashboard showcase',
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
          {/* Card container */}
          <div className="relative rounded-xl overflow-hidden shadow-lg bg-gray-100">
            {/* Content with 20:80 ratio */}
            <div className="relative flex h-[500px] md:h-[600px]">
              {/* Left side - 20% - Portal selection tabs */}
              <div className="w-[20%] flex flex-col border-r border-gray-200 bg-gray-50">
                {(['employer', 'applicant', 'university'] as PortalType[]).map((portal) => (
                  <button
                    key={portal}
                    onClick={() => setActivePortal(portal)}
                    className={`flex-1 px-4 py-6 text-left transition-all ${
                      activePortal === portal
                        ? 'bg-gray-100 text-gray-900 font-medium border-l-2 border-[#3d6a4a]'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-xs md:text-sm whitespace-nowrap">
                      {portalConfig[portal].label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Right side - 80% - Screenshot display with gradient background */}
              <div className="flex-1 relative">
                {/* Gradient background image - only on right 80% */}
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
      </div>
    </section>
  );
};

export default ApplicantShowcaseSection;

