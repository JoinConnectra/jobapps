import Image from 'next/image';
import Link from 'next/link';

const FinalCtaSection = () => {
  return (
    <section className="relative py-16 md:py-20 lg:py-24 bg-white">
      <div className="container mx-auto px-6">
        <div className="max-w-5xl mx-auto">
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
                Schedule a call with our team to learn how Connectra can transform
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
                src="/images/activities-section.png"
                alt="Connectra dashboard showcase"
                fill
                className="object-cover "
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
    </section>
  );
};

export default FinalCtaSection;