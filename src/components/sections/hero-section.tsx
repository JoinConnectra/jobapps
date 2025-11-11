import Link from 'next/link';
import React from 'react';

export default function HeroSection() {
  return (
    <section className="relative bg-white overflow-hidden pt-32 pb-16 md:pt-40 md:pb-20 lg:pt-48 lg:pb-24">
      <div className="container relative z-20 flex flex-col items-center text-center px-6 max-w-4xl mx-auto">
        <h1 className="font-display font-semibold text-[#1A1A1A] text-4xl md:text-5xl lg:text-6xl leading-[1.15] tracking-tight mb-6">
          Helping growing teams
          <br />
          to hire smarter.
        </h1>

        <p className="text-base md:text-lg text-gray-500 max-w-2xl leading-relaxed mb-6 md:mb-8">
          Create job postings quickly, review
          <br />
          candidates efficiently, and speed up your
          <br />
          hiring pipeline with TalentFlow.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded bg-[#3d6a4a] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2f5239]"
          >
            Get started
          </Link>
          
          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded bg-[#f5f5f0] px-5 py-2.5 text-sm font-medium text-gray-900 transition-colors hover:bg-[#ebebe5]"
          >
            Talk to Founders
          </Link>
        </div>
      </div>
    </section>
  );
}