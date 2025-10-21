import Image from 'next/image';

const FinalCtaSection = () => {
  return (
    <section
      className="relative overflow-hidden bg-[#3A3A3A] rounded-t-[32px] lg:rounded-t-[40px]"
      style={{
        backgroundImage: 'url("https://framerusercontent.com/images/8GeUfpLeO3lE37vRKXJe7rmuHcY.svg")',
      }}
    >
      <div className="absolute inset-0 z-0 pointer-events-none hidden md:block">
        <Image
          src="https://framerusercontent.com/images/5SGrcz3VfKYAaeGosBGakXNOQRg.png?scale-down-to=1024"
          alt="Decorative audio question card floating"
          width={532}
          height={132}
          className="absolute top-[-50px] left-[-60px] w-auto h-[132px] transform -rotate-8"
        />
        <Image
          src="https://framerusercontent.com/images/tFbev406F6DwSs6fXEjhJ60PTqU.png?scale-down-to=1024"
          alt="Decorative audio question card floating on the right"
          width={532}
          height={132}
          className="absolute -top-px right-[-230px] w-auto h-[130px] transform rotate-8"
        />
      </div>

      <div className="relative z-10 container mx-auto flex flex-col items-center text-center py-20 md:py-32 px-6">
        <h1 className="font-display font-bold text-white text-[2.5rem] leading-[1.1] md:text-[3.5rem]">
          Ready to save 50 hrs per week?
        </h1>
        <p className="mt-6 mb-10 text-white/90 text-lg md:text-xl max-w-[600px]">
          Connect with our team and learn how Rapha can help your team grow
          faster and better.
        </p>
        <a
          href="https://app.withrapha.com/"
          className="inline-block bg-[#FF6B3D] text-white font-semibold text-[1.125rem] px-8 py-4 rounded-lg transition-transform duration-200 hover:scale-105"
        >
          Get started for free
        </a>
      </div>
    </section>
  );
};

export default FinalCtaSection;