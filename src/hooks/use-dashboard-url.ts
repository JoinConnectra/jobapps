"use client";

import { useState, useEffect } from 'react';
import { useSession } from '@/lib/auth-client';

/**
 * Hook to get the correct dashboard URL based on user's account type
 * Returns the dashboard URL or null if not logged in
 */
export function useDashboardUrl(): string | null {
  const { data: session, isPending } = useSession();
  const [dashboardUrl, setDashboardUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isPending || !session?.user?.email) {
      setDashboardUrl(null);
      return;
    }

    // Fetch user's account type
    const fetchAccountType = async () => {
      try {
        const res = await fetch("/api/users/me", {
          credentials: "include",
        });
        
        if (res.ok) {
          const user = await res.json();
          
          // Route based on user's account type
          if (user.accountType === 'university') {
            setDashboardUrl("/university/dashboard");
          } else if (user.accountType === 'applicant') {
            setDashboardUrl("/student");
          } else if (user.accountType === 'employer') {
            setDashboardUrl("/dashboard");
          } else {
            // Fallback: default to student dashboard for security
            setDashboardUrl("/student");
          }
        } else {
          // If API fails, try fallback method
          const token = localStorage.getItem("bearer_token");
          if (token) {
            const orgRes = await fetch("/api/organizations?mine=true", {
              headers: { Authorization: `Bearer ${token}` },
            });
            
            if (orgRes.ok) {
              const orgs = await orgRes.json();
              
              if (Array.isArray(orgs)) {
                // Check for university organization first
                const universityOrg = orgs.find((o: any) => o.type === 'university');
                if (universityOrg) {
                  setDashboardUrl("/university/dashboard");
                  return;
                }

                // Check for employer organization (company type)
                const employerOrg = orgs.find((o: any) => o.type === 'company' || o.type === 'employer');
                if (employerOrg) {
                  setDashboardUrl("/dashboard");
                  return;
                }
              }
            }
          }
          
          // Default fallback
          setDashboardUrl("/student");
        }
      } catch (error) {
        console.error("Error determining dashboard URL:", error);
        // Secure fallback - default to student dashboard
        setDashboardUrl("/student");
      }
    };

    fetchAccountType();
  }, [session?.user?.email, isPending]);

  return dashboardUrl;
}

