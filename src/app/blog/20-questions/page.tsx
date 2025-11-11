import HeaderNavigation from '@/components/sections/header-navigation';
import Footer from '@/components/sections/footer';
import FinalCtaSection from '@/components/sections/final-cta-section';
import Image from 'next/image';
import Link from 'next/link';

export default function BlogPostPage() {
  const questions = [
    "What inspires you, and why?",
    "Do you have any unexpected habits or passions?",
    "Which fiction books are you currently reading?",
    "Which work-related or non-fiction books are you currently reading?",
    "What role do you see yourself in over the next few years?",
    "Tell us a fun fact about yourself?",
    "What has been the biggest challenge in your career so far, and how did you overcome it?",
    "What has been the highlight of your career in the past five years?",
    "What would you bring to our company—culturally, strategically, or personally?",
    "What's the most valuable feedback you've received in your career, and why was it meaningful to you?",
    "When was the last time you took initiative at work when it wasn't expected?",
    "What was the last project you were especially proud of?",
    "How do you stay up to date with trends and developments in our industry?",
    "When would you be available to start?",
    "What makes you a great fit for this role?",
    "If you could work for only one company for the rest of your career, which one would it be—and why?",
    "When was the last time you changed your opinion on something? What was it, and why?",
    "Who in our industry do you look up to? Who inspires you?",
    "Can you name a mistake you made in your career, and how you handled it?",
    "What does your ideal work environment look like?",
  ];

  return (
    <main className="min-h-screen bg-white">
      <HeaderNavigation />
      
      {/* Blog post content */}
      <article className="pt-24 pb-16 md:pt-32 md:pb-20">
        <div className="max-w-3xl mx-auto px-6">
          {/* Header image with gradient */}
          <div className="mb-8 md:mb-12 rounded-lg overflow-hidden">
            <div 
              className="w-full h-[300px] md:h-[400px] relative"
              style={{
                background: 'linear-gradient(to right, #a8d5ba 0%, #2d5f4f 100%)',
              }}
            />
          </div>

          {/* Title */}
          <h1 className="font-display font-normal text-[#1A1A1A] text-3xl md:text-4xl lg:text-5xl leading-tight mb-6 md:mb-8">
            20 Questions to Ask Your Applicants and Candidates
          </h1>

          {/* Intro paragraph */}
          <div className="mb-8 md:mb-12 space-y-4">
            <p className="font-display text-gray-500 text-base md:text-lg leading-relaxed">
              We've all been in a situation involving the cliché "Where do you see yourself in 5 years' time?" And let's face it, we're tired of it.
            </p>
            <p className="font-display text-gray-700 text-base md:text-lg leading-relaxed">
              Here is a list of 20 simple and non-boring questions to get the most out of your application form: Copy them into your Applicant Tracking System, or use them directly from within your TalentFlow Dashboard.
            </p>
          </div>

          {/* Questions list */}
          <div className="mb-12 md:mb-16">
            <ol className="space-y-4 md:space-y-5">
              {questions.map((question, index) => (
                <li key={index} className="flex gap-4">
                  <span className="font-display text-gray-400 text-base md:text-lg font-medium flex-shrink-0">
                    {index + 1}.
                  </span>
                  <span className="font-display text-gray-700 text-base md:text-lg leading-relaxed">
                    {question}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {/* Back to blog link */}
          <div className="pt-8 border-t border-gray-200">
            <Link 
              href="/blog"
              className="font-display text-gray-600 hover:text-gray-900 text-sm md:text-base transition-colors inline-flex items-center gap-2"
            >
              ← Back to Blog
            </Link>
          </div>
        </div>
      </article>

      {/* Final CTA Section - adjusted width for blog post */}
      <div className="py-16 md:py-20 lg:py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto">
            <div 
              className="relative rounded-xl overflow-hidden shadow-lg min-h-[220px] md:min-h-[260px]"
              style={{
                background: 'linear-gradient(135deg, #1a3d2a 0%, #2d5239 50%, #1a3d2a 100%)',
              }}
            >
              {/* Text content - spans across the card */}
              <div className="relative z-10 flex flex-col px-6 md:px-8 lg:px-10 py-6 md:py-8 lg:py-10 max-w-2xl">
                <h2 className="text-[#7fb069] font-display font-medium text-base md:text-lg lg:text-xl mb-2 md:mb-3 leading-tight">
                  Ready to transform your hiring?
                </h2>
                <p className="text-white text-xs md:text-sm leading-relaxed mb-4 md:mb-5">
                  Schedule a call with our team to learn how TalentFlow can transform
                  <br />
                  and simplify your hiring process.
                </p>
                <Link
                  href="/contact"
                  className="inline-block bg-white text-gray-800 font-medium text-xs md:text-sm px-4 py-1.5 md:px-5 md:py-2 rounded transition-colors hover:bg-gray-50 w-fit"
                >
                  Talk to Founders
                </Link>
              </div>

              {/* Screenshot - positioned in bottom right corner */}
              <div className="absolute bottom-0 right-0 w-[50%] md:w-[45%] lg:w-[40%] h-[60%] md:h-[70%] overflow-hidden">
                <Image
                  src="/images/employer-screenshot.png"
                  alt="TalentFlow dashboard showcase"
                  fill
                  className="object-cover"
                  style={{
                    objectPosition: 'left top',
                    transform: 'scale(1.6)',
                    transformOrigin: 'left top',
                  }}
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}

