import React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

interface Logo {
  src: string;
  alt: string;
  width: number;
  height: number;
}

const logos: Logo[] = [
  {
    src: 'https://framerusercontent.com/images/pfcBo07HcADiGCdSNlJLPTY2mw.png?scale-down-to=512',
    alt: 'Vimcal logo',
    width: 1000,
    height: 410,
  },
  {
    src: 'https://framerusercontent.com/images/pBBvF5jO0BQvkYH5N8tb0u6cn18.png?scale-down-to=512',
    alt: 'GitHub logo',
    width: 3547,
    height: 414,
  },
  {
    src: 'https://framerusercontent.com/images/w0n6Ogwa8hIvsKAEtgOus2IW1QM.svg',
    alt: 'Dimension logo',
    width: 101,
    height: 22,
  },
  {
    src: 'https://framerusercontent.com/images/0DTQcuJFPsJvr48Idc6MbLgrA.svg', 
    alt: 'Octolane AI logo',
    width: 319,
    height: 76,
  },
  {
    src: 'https://framerusercontent.com/images/s0mKEGnebUVOB9OmF4WxA6ZaU.svg?scale-down-to=512',
    alt: 'Watson logo',
    width: 2889,
    height: 523,
  },
];

const CompanyLogosSection = () => {
  return (
    <section className="bg-background py-16">
      <div className="container mx-auto flex max-w-[1200px] flex-col items-center">
        <p className="mb-12 text-center text-2xl font-normal text-[#333333]">
          Supporting founders, recruiters, agencies and hiring managers
        </p>

        <div className="mb-12 w-full overflow-x-auto">
          <div className="flex min-w-max items-center justify-center gap-12 py-4 sm:gap-16">
            {logos.map((logo, index) => (
              <Image
                key={index}
                src={logo.src}
                alt={logo.alt}
                width={logo.width}
                height={logo.height}
                className="max-h-8 w-auto object-contain opacity-60 transition-opacity duration-300 hover:opacity-100"
              />
            ))}
          </div>
        </div>

        <Button
          className="h-auto rounded-lg bg-[#4169E1] px-6 py-3 text-base font-medium text-white hover:bg-[#4169E1]/90"
        >
          You&apos;ll never recruit alone
        </Button>
      </div>
    </section>
  );
};

export default CompanyLogosSection;