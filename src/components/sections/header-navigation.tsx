"use client";

import { ArrowRight, Menu } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from '@/lib/auth-client';
import { useEffect } from 'react';

const HeaderNavigation = () => {
  const { data: session, isPending } = useSession();

  // Preload logo image on mount to eliminate lag
  useEffect(() => {
    const logoImg = new window.Image();
    logoImg.src = '/images/talentflow-logo.svg';
  }, []);

  const navLinks = [
    { href: '/#features', label: 'Features' },
    { href: '/blog', label: 'Blog' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-[1000] w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-12 lg:px-16 xl:px-20">
        {/* Left side: Logo + Features */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/talentflow-logo.svg"
              alt="TalentFlow logo"
              width={36}
              height={36}
              className="flex-shrink-0"
              priority
              unoptimized
            />
            <span className="font-display text-2xl font-bold text-gray-900 tracking-tight">
              TalentFlow
            </span>
          </Link>
          
          {/* Navigation links next to logo */}
          <nav className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        {/* Right side: Login/CTA Button */}
        <div className="hidden items-center gap-3 md:flex">
          {!isPending && !session?.user && (
            <>
              <Link
                href="/login"
                className="rounded bg-[#f5f5f0] px-5 py-2.5 text-sm font-medium text-gray-900 transition-colors hover:bg-[#ebebe5]"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded bg-[#3d6a4a] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2f5239]"
              >
                Get started
              </Link>
            </>
          )}
          {!isPending && session?.user && (
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded bg-[#3d6a4a] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2f5239]"
            >
              Dashboard
            </Link>
          )}
        </div>

        {/* Mobile Menu */}
        <div className="md:hidden">
          <button 
            aria-label="Open menu" 
            className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default HeaderNavigation;