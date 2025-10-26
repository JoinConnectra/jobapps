/**
 * Utility function to determine the correct dashboard URL based on user's account type
 */
export async function getDashboardUrl(): Promise<string> {
  try {
    // First, try to get user's account type directly
    const userResponse = await fetch("/api/users/me", {
      credentials: "include",
    });
    
    if (userResponse.ok) {
      const user = await userResponse.json();
      console.log("User account type:", user.accountType);
      
      // Route based on user's account type
      if (user.accountType === 'university') {
        console.log("Redirecting university user to university dashboard");
        return "/university/dashboard";
      } else if (user.accountType === 'applicant') {
        console.log("Redirecting student/applicant to student dashboard");
        return "/student";
      } else if (user.accountType === 'employer') {
        console.log("Redirecting employer to employer dashboard");
        return "/dashboard";
      }
    }

    // Fallback: Check organizations if user account type is not available
    const token = localStorage.getItem("bearer_token");
    if (token) {
      const response = await fetch("/api/organizations?mine=true", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const orgs = await response.json();
        
        if (Array.isArray(orgs)) {
          // Check for university organization first
          const universityOrg = orgs.find((o: any) => o.type === 'university');
          if (universityOrg) {
            console.log("Found university organization:", universityOrg.name);
            return "/university/dashboard";
          }

          // Check for employer organization (company type)
          const employerOrg = orgs.find((o: any) => o.type === 'company' || o.type === 'employer');
          if (employerOrg) {
            console.log("Found employer organization:", employerOrg.name);
            return "/dashboard";
          }
        }
      }
    }

    // Default fallback - if we can't determine the type, default to student dashboard
    // This is safer as it prevents unauthorized access to employer dashboard
    console.log("No specific account type found, defaulting to student dashboard for security");
    return "/student";
  } catch (error) {
    console.error("Error determining dashboard URL:", error);
    return "/student"; // Secure fallback - default to student dashboard
  }
}
