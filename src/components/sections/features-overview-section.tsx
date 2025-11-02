import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Mic, Lightbulb, Pause, ThumbsUp, Copy, Sparkles, User, RefreshCw } from "lucide-react";
import Image from 'next/image';

const FeaturesOverviewSection = () => {
  return (
    <section id="rapha-features" className="bg-[#FEFEFA] pt-24 sm:pt-32 pb-8 lg:pb-12">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="flex justify-center">
             <div className="relative rounded-full px-4 py-1 text-sm leading-6 text-primary ring-1 ring-primary/20 hover:ring-primary/30">
              You'll never recruit alone
            </div>
          </div>
          <h2 className="mt-6 font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-text-primary">
            What's under the hood
          </h2>
        </div>

        <div className="mt-16 sm:mt-20 lg:mt-24">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-12 items-start max-w-6xl mx-auto">
            {/* Card 1: Let your applicants sell themselves */}
            <div className="flex flex-col">
              <div className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
                <div className="text-xs mb-3">
                  <p className="text-xs text-gray-500 mb-0.5">Question 1 of 3</p>
                  <p className="text-sm font-semibold text-gray-800">What's your origin story?</p>
                  <p className="text-xs text-gray-600 mt-0.5">We are excited to learn more about you!</p>
                </div>

                <div className="relative mt-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
                        <Mic className="h-4 w-4 text-purple-600" />
                      </div>
                      <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 transform whitespace-nowrap z-10">
                        <Badge variant="default" className="bg-[#7C3AED] text-white text-[10px] px-1.5 py-0.5">Applicant</Badge>
                      </div>
                    </div>
                    <div className="flex w-full items-center gap-2">
                      <span className="text-[10px] font-mono text-gray-500">00:00</span>
                      <div className="relative h-0.5 flex-grow rounded-full bg-gray-200">
                        <div className="absolute left-0 top-0 -mt-0.5 h-2 w-2 rounded-full border border-gray-600 bg-white"></div>
                      </div>
                      <span className="text-[10px] font-mono text-gray-500">2:00</span>
                    </div>
                    <RefreshCw className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  </div>
                </div>

                <div className="mt-10 flex items-start gap-2 rounded-md bg-yellow-50 p-2">
                  <Lightbulb className="h-3.5 w-3.5 flex-shrink-0 text-yellow-500 mt-0.5" />
                  <p className="text-[11px] text-yellow-800 leading-relaxed">
                    Be yourself, find a quiet spot, and most importantly...tell them why they should hire you!
                  </p>
                </div>
              </div>
              <div className="mt-5">
                <h3 className="text-lg font-semibold text-[#6a994e] leading-tight">
                  Let your applicants sell themselves
                </h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                  Applicants are now able to finally sell themselves and answer any of your behavioral, technical, sales, design, product related questions async
                </p>
              </div>
            </div>

            {/* Card 2: Redefine or skip the first call */}
            <div className="flex flex-col">
              <div className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <button className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 flex-shrink-0">
                      <Pause className="h-3.5 w-3.5 text-gray-600" />
                    </button>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">What's your origin story?</p>
                      <p className="text-[10px] font-mono text-gray-500">00:30 / 1:10</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <ThumbsUp className="h-3.5 w-3.5 cursor-pointer hover:text-gray-600" />
                    <Copy className="h-3.5 w-3.5 cursor-pointer hover:text-gray-600" />
                  </div>
                </div>
                
                <div className="space-y-2 border-t border-gray-200 pt-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 rounded-full bg-gray-100 p-0.5 text-gray-500 flex-shrink-0" />
                    <Badge className="border-green-200 bg-green-50 text-green-700 text-[10px] px-1.5 py-0.5">Recruiter</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 rounded-full bg-gray-100 p-0.5 text-gray-500 flex-shrink-0" />
                    <Badge className="border-green-200 bg-green-50 text-green-700 text-[10px] px-1.5 py-0.5">Co-Founder & CTO</Badge>
                  </div>
                </div>

                <div className="mt-3 flex items-start gap-2 rounded-md bg-violet-50 p-2">
                  <Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-violet-500 mt-0.5" />
                  <p className="text-[11px] text-violet-900/80 leading-relaxed">
                    <span className="font-semibold text-violet-900">Summary:</span> Overall Arsene has built products for 5+ yrs in big name companies and startups. He's excited most about taking more ownership in his future roles. Primarily works on the frontend but is excited to jump into the backend if need be. Mentoring junior engineers became something he takes pride in.
                  </p>
                </div>
              </div>
              <div className="mt-5">
                <h3 className="text-lg font-semibold text-[#6a994e] leading-tight">
                  Redefine or skip the first call
                </h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                  Build consensus with your hiring team around the applicant's narrative to redefine what the first call means or skip the first call completely
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesOverviewSection;