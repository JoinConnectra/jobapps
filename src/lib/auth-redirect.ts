/**
 * Utility function to determine the correct dashboard URL based on user's account type
 */
export async function getDashboardUrl(): Promise<string> {
  try {
    const token = localStorage.getItem("bearer_token");
    if (!token) {
      return "/dashboard"; // Fallback
    }

    const response = await fetch("/api/organizations?mine=true", {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (!response.ok) {
      console.error("Failed to fetch organizations:", response.status);
      return "/dashboard"; // Fallback
    }

    const orgs = await response.json();
    
    if (!Array.isArray(orgs)) {
      console.error("Invalid organizations response:", orgs);
      return "/dashboard"; // Fallback
    }

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

    // If no specific org type found, check user's account type
    const userResponse = await fetch("/api/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (userResponse.ok) {
      const user = await userResponse.json();
      if (user.accountType === 'university') {
        return "/university/dashboard";
      }
    }

    // Default fallback - if we can't determine the type, default to employer dashboard
    console.log("No specific organization type found, defaulting to employer dashboard");
    return "/dashboard";
  } catch (error) {
    console.error("Error determining dashboard URL:", error);
    return "/dashboard"; // Fallback to employer dashboard
  }
}
