import { useEffect } from 'react';
import { useSession } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { getDashboardUrl } from '@/lib/auth-redirect';

/**
 * Hook to protect employer dashboard pages from university users
 * Automatically redirects university users to /university/dashboard
 */
export function useEmployerAuth() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session?.user) {
      checkUserTypeAndRedirect();
    }
  }, [session]);

  const checkUserTypeAndRedirect = async () => {
    try {
      const dashboardUrl = await getDashboardUrl();
      if (dashboardUrl === "/university/dashboard") {
        console.log("University user detected, redirecting to university dashboard");
        router.push("/university/dashboard");
      }
    } catch (error) {
      console.error("Error checking user type:", error);
    }
  };

  return { session, isPending };
}
