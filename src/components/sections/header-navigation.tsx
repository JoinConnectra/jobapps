"use client";

import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from '@/lib/auth-client';
import { useEffect, useState } from 'react';
import { useDashboardUrl } from '@/hooks/use-dashboard-url';

const HeaderNavigation = () => {
  const { data: session, isPending } = useSession();
  const dashboardUrl = useDashboardUrl();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Preload logo image on mount to eliminate lag
  useEffect(() => {
    const logoImg = new window.Image();
    logoImg.src = '/images/talentflow-logo.svg';
  }, []);

  // Close mobile menu when clicking outside or on a link
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const navLinks = [
    { href: '/#features', label: 'Features' },
    { href: '/blog', label: 'Blog' },
  ];

  const handleLinkClick = () => {
    setIsMobileMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMobileMenuOpen(prev => !prev);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 md:px-12 lg:px-16 xl:px-20">
          {/* Left side: Logo + Features */}
          <div className="flex items-center gap-4 md:gap-6">
            <Link href="/" className="flex items-center gap-2" onClick={handleLinkClick}>
              <Image
                src="/images/talentflow-logo.svg"
                alt="Connectra logo"
                width={36}
                height={36}
                className="flex-shrink-0 brightness-0"
                priority
                unoptimized
              />
              <span className="font-display text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                Connectra
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
            {isPending ? (
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
            ) : !session?.user ? (
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
            ) : (
              <Link
                href={dashboardUrl || "/student"}
                className="inline-flex items-center justify-center rounded bg-[#3d6a4a] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2f5239]"
              >
                Dashboard
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button 
            type="button"
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            onClick={toggleMenu}
            className="md:hidden p-2 text-gray-600 hover:text-gray-900 transition-colors z-[60] relative"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Menu - Rendered outside header for proper z-index */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-[60]"
            onClick={toggleMenu}
            style={{ top: '64px' }}
          />
          
          {/* Mobile Menu Panel */}
          <div 
            className="fixed left-0 right-0 bg-white z-[70] shadow-2xl overflow-y-auto"
            style={{ top: '64px', bottom: '0', maxHeight: 'calc(100vh - 64px)' }}
          >
            <div className="flex flex-col p-6 space-y-4">
              {/* Navigation Links */}
              <nav className="flex flex-col space-y-0">
                {navLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={handleLinkClick}
                    className="text-lg font-medium text-gray-900 py-4 px-4 border-b border-gray-100 hover:bg-gray-50 transition-colors active:bg-gray-100"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>

              {/* Auth Buttons */}
              <div className="flex flex-col space-y-3 pt-6 border-t border-gray-200">
                {isPending ? (
                  <>
                    <Link
                      href="/login"
                      onClick={handleLinkClick}
                      className="w-full rounded bg-[#f5f5f0] px-5 py-3 text-base font-medium text-gray-900 text-center transition-colors hover:bg-[#ebebe5] active:bg-[#e0e0d9]"
                    >
                      Login
                    </Link>
                    <Link
                      href="/register"
                      onClick={handleLinkClick}
                      className="w-full inline-flex items-center justify-center rounded bg-[#3d6a4a] px-5 py-3 text-base font-medium text-white transition-colors hover:bg-[#2f5239] active:bg-[#25432f]"
                    >
                      Get started
                    </Link>
                  </>
                ) : !session?.user ? (
                  <>
                    <Link
                      href="/login"
                      onClick={handleLinkClick}
                      className="w-full rounded bg-[#f5f5f0] px-5 py-3 text-base font-medium text-gray-900 text-center transition-colors hover:bg-[#ebebe5] active:bg-[#e0e0d9]"
                    >
                      Login
                    </Link>
                    <Link
                      href="/register"
                      onClick={handleLinkClick}
                      className="w-full inline-flex items-center justify-center rounded bg-[#3d6a4a] px-5 py-3 text-base font-medium text-white transition-colors hover:bg-[#2f5239] active:bg-[#25432f]"
                    >
                      Get started
                    </Link>
                  </>
                ) : (
                  <Link
                    href={dashboardUrl || "/student"}
                    onClick={handleLinkClick}
                    className="w-full inline-flex items-center justify-center rounded bg-[#3d6a4a] px-5 py-3 text-base font-medium text-white transition-colors hover:bg-[#2f5239] active:bg-[#25432f]"
                  >
                    Dashboard
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HeaderNavigation;