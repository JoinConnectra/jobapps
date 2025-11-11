import HeaderNavigation from '@/components/sections/header-navigation';
import Footer from '@/components/sections/footer';
import Link from 'next/link';

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-white">
      <HeaderNavigation />
      
      {/* Blog content */}
      <div className="pt-32 pb-16 md:pt-40 md:pb-20 lg:pt-48 lg:pb-24">
        <div className="container mx-auto px-6 max-w-5xl flex flex-col items-center">
          {/* Header section */}
          <div className="mb-12 md:mb-16 text-center">
            <h1 className="font-display font-normal text-[#1A1A1A] text-4xl md:text-5xl lg:text-6xl leading-tight mb-4">
              Blog & Hiring Guides.
            </h1>
            <p className="font-display text-base md:text-lg text-gray-500 leading-relaxed">
              Articles on hiring, attracting better candidates and our product.
            </p>
          </div>

          {/* Blog post card */}
          <Link href="/blog/20-questions" className="block w-full max-w-2xl">
            <div className="bg-[#F5F5F0] rounded-md overflow-hidden hover:bg-[#EBEBE5] transition-colors cursor-pointer">
              <div className="flex flex-col md:flex-row h-[180px] md:h-[200px]">
                {/* Left side - Thumbnail (40%) */}
                <div className="md:w-[40%] w-full h-full relative flex-shrink-0">
                  <div 
                    className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(to right, #a8d5ba 0%, #2d5f4f 100%)',
                    }}
                  />
                </div>

                {/* Right side - Content (60%) */}
                <div className="flex-1 p-4 md:p-5 flex flex-col justify-center">
                  <h2 className="font-display font-normal text-[#1A1A1A] text-base md:text-lg leading-tight mb-2">
                    20 questions to ask your applicants and candidates
                  </h2>
                  <p className="font-display text-xs md:text-sm text-gray-500 leading-relaxed">
                    Discover the most effective questions to evaluate candidates during interviews and make better hiring decisions for your team.
                  </p>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>

      <Footer />
    </main>
  );
}

