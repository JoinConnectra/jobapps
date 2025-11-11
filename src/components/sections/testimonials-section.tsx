import React from 'react';
import Image from 'next/image';

interface Testimonial {
  name: string;
  title: string;
  quote: string;
  imgSrc: string;
}

const testimonialsData: Testimonial[] = [
  {
    name: "Tejas Ravishankar",
    title: "CEO at Dimension.dev",
    quote: "We don't do initial phone screens anymore which has unlocked a ton of time for our engineering team. We also find it refreshing to listen to applicants instead of reading resumes all day!",
    imgSrc: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/a8a1e1ed-e161-41df-b141-ad3ac910310b-withrapha-com/assets/icons/uvXF6PdQifwD8Rdkjm13mIMbq4-7.jpeg",
  },
  {
    name: "John Li",
    title: "Co-founder & CEO at Vimcal",
    quote: "What I love about using TalentFlow, is that I feel like I know the applicant already before we jump on a call. We literally are able to consolidate steps and jump straight into.",
    imgSrc: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/a8a1e1ed-e161-41df-b141-ad3ac910310b-withrapha-com/assets/icons/DwNeJtsZOLLPektKpU4HMXqueg-8.jpeg",
  },
  {
    name: "One Chowdhury",
    title: "Co-founder & CEO at Octolane",
    quote: "Thanks to TalentFlow for making hiring feel less like a chore and more like a matchmaking! We were able to quickly identify who knows their stuff technically and matched our culture in the first 30 seconds!",
    imgSrc: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/a8a1e1ed-e161-41df-b141-ad3ac910310b-withrapha-com/assets/icons/ibuzm113T5f7h76WnbcYdBKJTk-9.jpeg",
  },
  {
    name: "Viktor Kessler",
    title: "CEO at Notch",
    quote: "Adding TalentFlow was a no-brainer. We decreased the amount of spam, increased the quality in our talent pool, and was able to hire our next team-member in record time.",
    imgSrc: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/a8a1e1ed-e161-41df-b141-ad3ac910310b-withrapha-com/assets/icons/S2a4J2MW9cfxDbmmJYcy0BRAdE-10.jpeg",
  },
];

const TestimonialCard: React.FC<Testimonial> = ({ name, title, quote, imgSrc }) => {
  return (
    <div className="bg-white rounded-2xl p-8 shadow-[0_4px_12px_rgba(0,0,0,0.08)] flex flex-col">
      <div className="flex items-center gap-4 mb-6">
        <Image
          src={imgSrc}
          alt={`Avatar of ${name}`}
          width={64}
          height={64}
          className="rounded-full object-cover w-16 h-16"
        />
        <div>
          <p className="font-semibold text-lg text-foreground">{name}</p>
          <p className="text-[0.9375rem] text-[#666666]">{title}</p>
        </div>
      </div>
      <p className="text-[1.0625rem] leading-[1.7] text-[#333333]">
        {quote}
      </p>
    </div>
  );
};

const TestimonialsSection = () => {
  return (
    <section className="bg-white py-24">
      <div className="max-w-[1200px] mx-auto px-6">
        <h2 className="font-display text-5xl text-center text-[#1A1A1A] mb-16">
          What companies think
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {testimonialsData.map((testimonial) => (
            <TestimonialCard key={testimonial.name} {...testimonial} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;