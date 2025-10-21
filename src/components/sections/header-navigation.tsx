import { ArrowRight, Menu } from 'lucide-react';

const HeaderNavigation = () => {
  const navLinks = [
    { href: 'https://app.withrapha.com/jobs', label: "Who's hiring" },
    { href: '/#rapha-features', label: 'Features' },
    { href: 'https://app.withrapha.com/', label: 'Login' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-[1000] w-full border-b border-black/5 bg-[rgba(255,250,245,0.95)] backdrop-blur-sm">
      <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-8">
        <a href="/#hero" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eb442c]">
            {/* Placeholder for the abstract white logo mark, as no asset was provided and custom SVG is disallowed. */}
          </div>
          <span className="font-display text-2xl font-semibold text-black">
            Rapha
          </span>
        </a>
        
        <nav className="hidden items-center gap-x-10 md:flex">
          <div className="flex items-center gap-x-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="font-body text-[15px] font-medium text-[#333333] transition-colors hover:text-black"
                target={link.href.startsWith('http') ? '_blank' : undefined}
                rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              >
                {link.label}
              </a>
            ))}
          </div>
          
          <a
            href="https://app.withrapha.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 rounded-[8px] bg-black py-2.5 px-5 font-medium text-white transition-transform duration-200 ease-in-out hover:scale-[1.02]"
          >
            <span className="font-body text-[15px]">Try Rapha - it's free</span>
            <ArrowRight className="h-4 w-4 shrink-0 transition-transform duration-200 ease-in-out group-hover:translate-x-1" />
          </a>
        </nav>

        <div className="md:hidden">
          <button aria-label="Open menu" className="p-2">
            <Menu className="h-6 w-6 text-black" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default HeaderNavigation;