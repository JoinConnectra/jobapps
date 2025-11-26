import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="w-full border-t border-gray-100 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-12 lg:px-16 xl:px-20 py-8 md:py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/talentflow-logo.svg"
              alt="Connectra logo"
              width={36}
              height={36}
              className="flex-shrink-0 brightness-0"
              priority
              unoptimized
            />
            <span className="font-display text-2xl font-bold text-gray-900 tracking-tight">
              Connectra
            </span>
          </Link>


          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} Connectra. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

