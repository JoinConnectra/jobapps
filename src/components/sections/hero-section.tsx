import { MoveRight, Play, ThumbsUp, Bookmark } from 'lucide-react';
import React from 'react';

const AudioCard = ({
  question,
  note,
  duration,
  className,
}: {
  question: string;
  note: string;
  duration: string;
  className?: string;
}) => (
  <div
    className={`hidden lg:block absolute z-10 bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.08)] p-4 w-full max-w-[350px] ${className}`}
  >
    <div className="flex items-start gap-2.5">
      <div className="pt-1">
        <Play className="w-5 h-5 text-gray-300 fill-gray-300 flex-shrink-0" />
      </div>
      <div>
        <p className="font-medium text-[15px] text-zinc-800 leading-snug">{question}</p>
        <p className="text-xs text-gray-500 mt-1">{note}</p>
      </div>
    </div>
    <div className="flex items-center justify-end gap-3 mt-2 text-gray-400">
      <span className="text-xs font-mono tracking-tighter">{duration}</span>
      <ThumbsUp className="w-4 h-4" />
      <Bookmark className="w-4 h-4" />
    </div>
  </div>
);

export default function HeroSection() {
  return (
    <section className="relative bg-[#FFF9F1] overflow-hidden pt-32 pb-40 md:pt-40 md:pb-48 lg:pt-48 lg:pb-60">
      <div className="absolute inset-0 z-0">
        <AudioCard
          question="Why do you want to work at Octolane"
          note="I feel free to get a bit selfish here :)"
          duration="00:00 / 00:44"
          className="top-16 left-[-2rem] xl:left-[4rem] -rotate-[8deg]"
        />
        <AudioCard
          question="What is the value of using Typescript vs Javascript?"
          note="Feel free to get technical here"
          duration="00:00 / 2:38"
          className="top-8 right-[-2rem] xl:right-[6rem] rotate-[8deg]"
        />
        <AudioCard
          question="Why are you the right person for the job?"
          note="Feel free to get a bit selfish here :)"
          duration="00:00 / 00:54"
          className="bottom-28 left-[2rem] xl:left-[14rem] -rotate-3"
        />
        <AudioCard
          question="What's the hardest thing you have ever done?"
          note="The founding team will be listening to your answer personally"
          duration="00:00 / 01:12"
          className="hidden xl:block bottom-16 left-1/2 -translate-x-[140%] rotate-3"
        />
        <AudioCard
          question="Walk us through your favorite marketing campaign"
          note="What was so special about it?"
          duration="00:00 / 01:05"
          className="bottom-20 right-[1rem] xl:right-[8rem] -rotate-6"
        />
      </div>

      <div className="container relative z-20 flex flex-col items-center text-center">
        <div className="bg-[#FF6B3D] text-white text-sm font-semibold py-2 px-5 rounded-full mb-6 leading-none">
          Hi we're Rapha
        </div>

        <h1 className="font-display font-bold text-[#1A1A1A] text-[40px] md:text-[56px] lg:text-[72px] leading-[1.1] tracking-[-0.02em]">
          Making hiring more human
        </h1>

        <p className="mt-6 text-lg text-[#666666] max-w-[720px] leading-[1.6]">
          The recruiting platform that captures culture fit and hard skills from
          your applicants through audio responses — never rely on resumes and
          LinkedIns alone
        </p>

        <a
          href="https://app.withrapha.com/"
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-lg bg-[#1A1A1A] px-7 py-3.5 text-base font-semibold text-white transition-colors hover:bg-black/80"
        >
          Try Rapha - it's free
          <MoveRight className="h-5 w-5" />
        </a>
      </div>
    </section>
  );
}