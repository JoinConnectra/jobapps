import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full border-t border-gray-100 bg-white">
      <div className="mx-auto max-w-7xl px-12 lg:px-16 xl:px-20 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <Link href="/" className="flex items-center">
            <span className="font-display text-2xl font-bold text-gray-900 tracking-tight">
              TalentFlow
            </span>
          </Link>

          <nav className="flex items-center gap-6">
            <Link
              href="/#rapha-features"
              className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
            >
              Features
            </Link>
            <Link
              href="/pricing"
              className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
            >
              Pricing
            </Link>
            <Link
              href="/blog"
              className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
            >
              Blog
            </Link>
            <Link
              href="/contact"
              className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
            >
              Contact
            </Link>
          </nav>

          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} TalentFlow. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

