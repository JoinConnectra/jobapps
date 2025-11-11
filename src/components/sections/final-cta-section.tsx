import Image from 'next/image';

const FinalCtaSection = () => {
  return (
    <section className="relative py-16 md:py-20 lg:py-24">
      <div className="container mx-auto px-6">
        <div className="max-w-5xl mx-auto">
          <div
            className="relative overflow-hidden bg-[#3A3A3A] rounded-2xl"
            style={{
              backgroundImage: 'url("https://framerusercontent.com/images/8GeUfpLeO3lE37vRKXJe7rmuHcY.svg")',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          >
            <div className="absolute inset-0 z-0 pointer-events-none hidden lg:block overflow-hidden">
              <Image
                src="https://framerusercontent.com/images/5SGrcz3VfKYAaeGosBGakXNOQRg.png?scale-down-to=1024"
                alt="Decorative audio question card floating"
                width={532}
                height={132}
                className="absolute top-[-30px] left-[-30px] w-auto h-[100px] transform -rotate-6 opacity-30"
              />
              <Image
                src="https://framerusercontent.com/images/tFbev406F6DwSs6fXEjhJ60PTqU.png?scale-down-to=1024"
                alt="Decorative audio question card floating on the right"
                width={532}
                height={132}
                className="absolute top-[-20px] right-[-80px] w-auto h-[100px] transform rotate-6 opacity-30"
              />
            </div>

            <div className="relative z-10 flex flex-col items-center text-center py-16 md:py-20 lg:py-24 px-6 md:px-8">
              <h2 className="font-display font-bold text-white text-3xl md:text-4xl lg:text-5xl leading-tight max-w-3xl">
                Ready to save 50 hrs per week?
              </h2>
              <p className="mt-5 mb-8 text-white/80 text-base md:text-lg max-w-2xl leading-relaxed">
                Connect with our team and learn how TalentFlow can help your team grow
                faster and better.
              </p>
              <a
                href="https://app.withrapha.com/"
                className="inline-block bg-[#6a994e] text-white font-semibold text-base md:text-lg px-8 py-4 rounded-lg transition-colors hover:bg-[#5a8a3e]"
              >
                Get started for free
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCtaSection;