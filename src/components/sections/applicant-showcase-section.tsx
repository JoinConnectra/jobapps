import Image from 'next/image';

const ApplicantShowcaseSection = () => {
  return (
    <section className="relative w-full bg-white py-16 md:py-20 lg:py-24">
      <div className="container mx-auto px-6">
        <div className="max-w-5xl mx-auto">
          {/* Card container with gradient background */}
          <div className="relative rounded-xl overflow-hidden shadow-lg">
            {/* Gradient background image */}
            <div className="absolute inset-0 w-full h-full">
              <Image
                src="/images/purple-red-gradient.png"
                alt="Background gradient"
                fill
                className="object-cover"
                priority
              />
            </div>
            
            {/* Centered applicant screenshot */}
            <div className="relative z-10 flex items-center justify-center p-8 md:p-12 lg:p-16">
              <div className="w-full max-w-[85%]">
                <Image
                  src="/images/applicant-screenshot.png"
                  alt="Applicant dashboard showcase"
                  width={1000}
                  height={667}
                  className="w-full h-auto rounded-lg shadow-xl"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ApplicantShowcaseSection;

