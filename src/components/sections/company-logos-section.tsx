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
    <section className="bg-white py-20">
      <div className="container mx-auto flex max-w-6xl flex-col items-center px-6">
        <p className="mb-16 text-center text-xl md:text-2xl font-normal text-[#333333] max-w-4xl">
          Supporting founders, recruiters, agencies and hiring managers
        </p>

        <div className="mb-16 w-full overflow-x-auto">
          <div className="flex min-w-max items-center justify-center gap-8 md:gap-12 lg:gap-16 py-4">
            {logos.map((logo, index) => (
              <div key={index} className="flex items-center justify-center h-12">
                <Image
                  src={logo.src}
                  alt={logo.alt}
                  width={logo.width}
                  height={logo.height}
                  className="max-h-8 w-auto object-contain opacity-60 transition-opacity duration-300 hover:opacity-100"
                />
              </div>
            ))}
          </div>
        </div>

        <Button
          className="h-auto rounded-lg bg-[#6a994e] px-8 py-4 text-base font-medium text-white hover:bg-[#5a8a3e] transition-colors"
        >
          You&apos;ll never recruit alone
        </Button>
      </div>
    </section>
  );
};

export default CompanyLogosSection;