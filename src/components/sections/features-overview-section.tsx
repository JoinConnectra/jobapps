import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Mic, Lightbulb, Pause, ThumbsUp, Copy, Sparkles, User, RefreshCw } from "lucide-react";
import Image from 'next/image';

const FeaturesOverviewSection = () => {
  return (
    <section id="rapha-features" className="bg-background py-24 sm:py-32">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="flex justify-center">
             <div className="relative rounded-full px-4 py-1 text-sm leading-6 text-primary ring-1 ring-primary/20 hover:ring-primary/30">
              You'll never recruit alone
            </div>
          </div>
          <h2 className="mt-4 font-display text-[40px] font-bold tracking-tight text-text-primary sm:text-[56px]">
            What's under the hood
          </h2>
        </div>

        <div className="mt-16 sm:mt-20 lg:mt-24">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Card 1: Let your applicants sell themselves */}
            <div className="flex flex-col rounded-2xl bg-[#FAF6F1] p-8 shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
              <div className="relative flex-grow rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="text-sm">
                  <p className="font-medium text-gray-500">Question 1 of 3</p>
                  <p className="mt-1 text-base font-semibold text-gray-800">What's your origin story?</p>
                  <p className="text-gray-600">We are excited to learn more about you!</p>
                </div>

                <div className="relative mt-8 mb-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                        <Mic className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="absolute -bottom-[4.5rem] left-1/2 -translate-x-1/2 transform whitespace-nowrap">
                        <Badge variant="default" className="bg-[#7C3AED] text-white hover:bg-[#7C3AED]/90">Applicant</Badge>
                      </div>
                    </div>
                    <div className="flex w-full items-center gap-3">
                      <span className="text-xs font-mono text-gray-500">00:00</span>
                      <div className="relative h-1 flex-grow rounded-full bg-gray-200">
                        <div className="absolute left-0 top-0 -mt-1 h-3 w-3 rounded-full border-2 border-gray-600 bg-white"></div>
                      </div>
                      <span className="text-xs font-mono text-gray-500">2:00</span>
                    </div>
                     <RefreshCw className="h-5 w-5 text-gray-400" />
                  </div>
                </div>

                <div className="mt-12 flex items-start gap-3 rounded-lg bg-yellow-50 p-3">
                  <Lightbulb className="h-4 w-4 flex-shrink-0 text-yellow-500 mt-0.5" />
                  <p className="text-xs text-yellow-800">
                    Be yourself, find a quiet spot, and most importantly...tell them why they should hire you!
                  </p>
                </div>
              </div>
              <h3 className="mt-8 text-[28px] font-semibold text-[#4169E1]">
                Let your applicants sell themselves
              </h3>
              <p className="mt-4 text-lg text-text-secondary">
                Applicants are now able to finally sell themselves and answer any of your behavioral, technical, sales, design, product related questions async
              </p>
            </div>

            {/* Card 2: Redefine or skip the first call */}
            <div className="flex flex-col rounded-2xl bg-card p-8 shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
              <div className="flex-grow rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                      <Pause className="h-4 w-4 text-gray-600" />
                    </button>
                    <div>
                      <p className="text-sm font-semibold">What's your origin story?</p>
                      <p className="text-xs font-mono text-muted-foreground">00:30 / 1:10</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <ThumbsUp className="h-4 w-4 cursor-pointer hover:text-primary" />
                    <Copy className="h-4 w-4 cursor-pointer hover:text-primary" />
                  </div>
                </div>
                
                <div className="mt-3 space-y-2 border-t border-gray-200 pt-3">
                    <div className="flex items-center gap-x-2">
                        <User className="h-6 w-6 rounded-full bg-gray-100 p-1 text-gray-500" />
                        <Badge className="border-orange-200 bg-orange-50 text-orange-700">Recruiter</Badge>
                    </div>
                    <div className="flex items-center gap-x-2">
                        <User className="h-6 w-6 rounded-full bg-gray-100 p-1 text-gray-500" />
                        <Badge className="border-green-200 bg-green-50 text-green-700">Co-Founder & CTO</Badge>
                    </div>
                </div>

                <div className="mt-3 flex items-start gap-2 rounded-lg bg-violet-50 p-3">
                  <Sparkles className="h-4 w-4 flex-shrink-0 text-violet-500 mt-0.5" />
                  <p className="text-sm text-violet-900/80">
                    <span className="font-semibold text-violet-900">Summary:</span> Overall Arsene has built products for 5+ yrs in big name companies and startups. He’s excited most about taking more ownership in his future roles. Primarily works on the frontend but is excited to jump into the backend if need be. Mentoring junior engineers became something he takes pride in.
                  </p>
                </div>
              </div>
              <h3 className="mt-8 text-[28px] font-semibold text-[#4169E1]">
                Redefine or skip the first call
              </h3>
              <p className="mt-4 text-lg text-text-secondary">
                Build consensus with your hiring team around the applicant's narrative to redefine what the first call means or skip the first call completely
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesOverviewSection;