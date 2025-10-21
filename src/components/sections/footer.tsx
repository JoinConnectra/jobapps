import { Linkedin, Twitter, Mail } from 'lucide-react';
import Link from 'next/link';

const Footer = () => {
  return (
    <footer className="w-full bg-[#FFF9F1]">
      <div className="mx-auto max-w-[1200px] px-16 py-12">
        <div>
          <Link href="/" className="inline-flex items-center gap-x-3">
            {/* As per instruction "red circular icon (48px)", using secondary theme color for the red/coral circle. */}
            <div className="h-12 w-12 rounded-full bg-secondary" />
            <span className="font-display text-[2rem] font-bold leading-none text-foreground">
              Rapha
            </span>
          </Link>

          <p className="mt-2 text-base text-[#666666]">
            Let's capture origin stories together
          </p>

          <div className="mt-6 flex items-center gap-4">
            <a
              href="#"
              aria-label="LinkedIn"
              className="text-[#333333] transition-colors hover:text-black"
            >
              <Linkedin size={24} />
            </a>
            <a
              href="#"
              aria-label="Twitter"
              className="text-[#333333] transition-colors hover:text-black"
            >
              <Twitter size={24} />
            </a>
            <a
              href="#"
              aria-label="Email"
              className="text-[#333333] transition-colors hover:text-black"
            >
              <Mail size={24} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;