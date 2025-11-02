"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import {
  X,
  Building,
  Users,
  LogOut,
  Search,
  Copy,
  Trash2,
  Edit,
  Save,
  GraduationCap,
  Plus,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";

interface Organization {
  id: number;
  name: string;
  slug: string;
  type: string;
  plan: string;
  seatLimit: number;
  link?: string;
  benefits?: string;
  about_company?: string;
  logoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface Member {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  role: string;
  status: string;
  createdAt: string;
}

interface PendingInvite {
  id: string;
  email: string | null;
  role: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

interface University {
  id: number;
  name: string;
  approved: boolean;
}

interface UniversityAuthorization {
  id: number;
  universityOrgId: number;
  companyOrgId: number;
  status: 'pending' | 'approved' | 'rejected';
  universityName: string;
  createdAt: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization: Organization | null;
}

export default function SettingsModal({ isOpen, onClose, organization }: SettingsModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"company" | "members" | "universities">("company");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [autoJoinEnabled, setAutoJoinEnabled] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [isLoadingInvites, setIsLoadingInvites] = useState(false);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);

  // Company form state
  const [companyName, setCompanyName] = useState("");
  const [companyLink, setCompanyLink] = useState("");
  const [benefits, setBenefits] = useState("");
  const [aboutCompany, setAboutCompany] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // University access state
  const [universities, setUniversities] = useState<University[]>([]);
  const [universityAuthorizations, setUniversityAuthorizations] = useState<UniversityAuthorization[]>([]);
  const [selectedUniversities, setSelectedUniversities] = useState<number[]>([]);
  const [isLoadingUniversities, setIsLoadingUniversities] = useState(false);
  const [universitySearchQuery, setUniversitySearchQuery] = useState("");
  const [showUniversityDropdown, setShowUniversityDropdown] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<UniversityAuthorization[]>([]);

  const refreshOrganizationData = async () => {
    if (!organization) return;
    
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/organizations?mine=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const orgs = await response.json();
        const updatedOrg = orgs.find((o: any) => o.id === organization.id);
        if (updatedOrg) {
          setLogoUrl(updatedOrg.logoUrl || null);
          // Update local state to match database
          setCompanyName(updatedOrg.name || organization.name);
          setCompanyLink(updatedOrg.link || organization.link || "");
          setBenefits(updatedOrg.benefits || organization.benefits || "");
          setAboutCompany(updatedOrg.aboutCompany || organization.about_company || "");
        }
      }
    } catch (error) {
      console.error("Failed to refresh organization data:", error);
    }
  };

  useEffect(() => {
    if (organization) {
      setCompanyName(organization.name);
      setCompanyLink(organization.link || "");
      setBenefits(organization.benefits || "");
      setAboutCompany(organization.about_company || "");
      setLogoUrl(organization.logoUrl || null);
      setLogoPreview(null); // Clear any preview when organization changes
    }
  }, [organization]);

  // Fetch fresh organization data when modal opens
  useEffect(() => {
    if (isOpen && organization?.id) {
      refreshOrganizationData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, organization?.id]);

  useEffect(() => {
    if (isOpen && organization) {
      fetchMembers();
      fetchPendingInvites();
      fetchUniversities();
      fetchUniversityAuthorizations();
    }
  }, [isOpen, organization]);

  const fetchMembers = async () => {
    if (!organization) return;
    
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/organizations/${organization.id}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setMembers(data);
      }
    } catch (error) {
      console.error("Failed to fetch members:", error);
    }
  };

  const fetchPendingInvites = async () => {
    if (!organization) return;

    setIsLoadingInvites(true);
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/invite/list?orgId=${organization.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setPendingInvites(data);
      }
    } catch (error) {
      console.error("Failed to fetch pending invites:", error);
    } finally {
      setIsLoadingInvites(false);
    }
  };

  const fetchUniversities = async () => {
    if (!organization) return;
    
    setIsLoadingUniversities(true);
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/employer/universities?orgId=${organization.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setUniversities(data);
      }
    } catch (error) {
      console.error("Failed to fetch universities:", error);
    } finally {
      setIsLoadingUniversities(false);
    }
  };

  const fetchUniversityAuthorizations = async () => {
    if (!organization) return;
    
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/employer/universities?orgId=${organization.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        // Filter to show only universities with approved status
        const approvedAuthorizations = data
          .filter((uni: University) => uni.approved)
          .map((uni: University) => ({
            id: uni.id,
            universityOrgId: uni.id,
            companyOrgId: organization.id,
            status: 'approved' as const,
            universityName: uni.name,
            createdAt: new Date().toISOString(),
          }));
        setUniversityAuthorizations(approvedAuthorizations);

        // Fetch pending requests from the university_authorizations table
        const pendingResponse = await fetch(`/api/university/requests?companyOrgId=${organization.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (pendingResponse.ok) {
          const pendingData = await pendingResponse.json();
          setPendingRequests(pendingData.filter((req: any) => req.status === 'pending'));
        }
      }
    } catch (error) {
      console.error("Failed to fetch university authorizations:", error);
    }
  };

  const handleRequestUniversityAccess = async (universityId: number) => {
    if (!organization) return;
    
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/employer/universities/${universityId}/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          companyOrgId: organization.id,
        }),
      });

      if (response.ok) {
        toast.success("Access request sent successfully");
        fetchUniversityAuthorizations();
        setUniversitySearchQuery("");
        setShowUniversityDropdown(false);
      } else {
        toast.error("Failed to send access request");
      }
    } catch (error) {
      console.error("Failed to request university access:", error);
      toast.error("An error occurred while sending the request");
    }
  };

  const handleUniversitySelect = (university: University) => {
    handleRequestUniversityAccess(university.id);
  };

  const filteredUniversities = universities.filter(uni => 
    !uni.approved && 
    uni.name.toLowerCase().includes(universitySearchQuery.toLowerCase())
  );

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!organization || !event.target.files || !event.target.files[0]) return;

    const file = event.target.files[0];
    
    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a valid image file (JPEG, PNG, GIF, or WebP)");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    // Show immediate preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    setUploadingLogo(true);
    try {
      const token = localStorage.getItem("bearer_token");
      const formData = new FormData();
      formData.append("logo", file);

      const response = await fetch(`/api/organizations/${organization.id}/logo`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(error.error || "Failed to upload logo");
      }

      const data = await response.json();
      setLogoUrl(data.logoUrl);
      setLogoPreview(null); // Clear preview, use the actual URL from server
      toast.success("Logo uploaded successfully");
      
      // Update organization prop
      if (organization) {
        organization.logoUrl = data.logoUrl;
      }

      // Refresh organization data to ensure persistence
      await refreshOrganizationData();
    } catch (error) {
      console.error("Logo upload error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload logo");
      // On error, clear preview
      setLogoPreview(null);
    } finally {
      setUploadingLogo(false);
      // Reset input
      event.target.value = "";
    }
  };

  const handleSaveCompany = async () => {
    if (!organization) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/organizations/${organization.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: companyName,
          link: companyLink,
          benefits,
          about_company: aboutCompany,
        }),
      });

      if (response.ok) {
        toast.success("Company information updated successfully");
        setIsEditing(false);
      } else {
        toast.error("Failed to update company information");
      }
    } catch (error) {
      toast.error("An error occurred while updating company information");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyInviteLink = async () => {
    if (!organization) return;

    setIsGeneratingInvite(true);
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/invite/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orgId: organization.id }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to create invite:", errorText);
        toast.error("Failed to generate invite link");
        return;
      }

      const data = await response.json();
      setInviteLink(data.inviteLink);
      await fetchPendingInvites();
      await navigator.clipboard.writeText(data.inviteLink);
      toast.success("Invite link copied to clipboard");
    } catch (error) {
      console.error("Error generating invite link:", error);
      toast.error("Failed to generate invite link");
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  const handleBlockMember = async (memberId: number) => {
    if (!organization) return;
    
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/organizations/${organization.id}/members/${memberId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "blocked" }),
      });

      if (response.ok) {
        toast.success("Member blocked successfully");
        fetchMembers();
      } else {
        toast.error("Failed to block member");
      }
    } catch (error) {
      toast.error("An error occurred while blocking member");
    }
  };

  const filteredMembers = members.filter(member =>
    member.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLogout = async () => {
    try {
      const { error } = await authClient.signOut();
      if (error?.code) {
        toast.error(error.code);
      } else {
        localStorage.removeItem("bearer_token");
        toast.success("Logged out successfully");
        onClose(); // Close the modal
        router.push("/"); // Redirect to home page
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("An error occurred during logout");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-[#FEFEFA] rounded-lg shadow-xl w-[80vw] h-[80vh] max-w-4xl flex">
        {/* Left Sidebar */}
        <div className="w-64 bg-[#f7f7f7] border-r border-[#d4d4d8] flex flex-col">
          <div className="p-4 border-b border-[#d4d4d8]">
            <h2 className="text-lg font-semibold text-[#3D3D3D]">Settings</h2>
          </div>
          
          <nav className="flex-1 p-3 space-y-1">
            <button
              onClick={() => setActiveTab("company")}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
                activeTab === "company" 
                  ? "bg-[#f0f0f0] text-[#1a1a1a] border-l-2 border-[#6a994e]" 
                  : "text-[#404040] hover:bg-[#f0f0f0]"
              }`}
            >
              <Building className="w-4 h-4" />
              Company
            </button>
            
            <button
              onClick={() => setActiveTab("members")}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
                activeTab === "members" 
                  ? "bg-[#f0f0f0] text-[#1a1a1a] border-l-2 border-[#6a994e]" 
                  : "text-[#404040] hover:bg-[#f0f0f0]"
              }`}
            >
              <Users className="w-4 h-4" />
              Members
            </button>
            
            <button
              onClick={() => setActiveTab("universities")}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
                activeTab === "universities" 
                  ? "bg-[#f0f0f0] text-[#1a1a1a] border-l-2 border-[#6a994e]" 
                  : "text-[#404040] hover:bg-[#f0f0f0]"
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              Universities
            </button>
          </nav>
          
          <div className="p-3 border-t border-[#d4d4d8]">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Log out
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[#d4d4d8]">
            <h3 className="text-lg font-semibold text-[#1A1A1A]">
              {activeTab === "company" && "Company"}
              {activeTab === "members" && `Members (${members.length})`}
              {activeTab === "universities" && "Educational Institution Access"}
            </h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-[#f0f0f0] rounded transition-colors"
            >
              <X className="w-4 h-4 text-[#404040]" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === "company" && (
              <div className="space-y-0">
                {/* Company Name and Link Section */}
                <div className="pb-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-1">
                        <h4 className="text-sm font-medium text-gray-900 mb-1">Company Name</h4>
                        {isEditing ? (
                          <Input
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            className="mt-2 border-gray-300 focus:border-gray-400 focus:ring-gray-400 text-sm"
                            placeholder="Enter company name"
                          />
                        ) : (
                          <p className="text-base font-medium text-gray-900 mt-1">{companyName}</p>
                        )}
                      </div>
                      <div className="mt-3">
                        <h4 className="text-sm font-medium text-gray-900 mb-1">Website</h4>
                        {isEditing ? (
                          <Input
                            value={companyLink}
                            onChange={(e) => setCompanyLink(e.target.value)}
                            className="mt-2 border-gray-300 focus:border-gray-400 focus:ring-gray-400 text-sm"
                            placeholder="https://example.com"
                          />
                        ) : (
                          <p className="text-sm text-gray-500 mt-1">{companyLink || "No website link"}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(!isEditing)}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 text-sm px-3 py-2 h-9 ml-4"
                    >
                      {isEditing ? (
                        <>
                          <X className="w-3 h-3 mr-1.5" />
                          Cancel
                        </>
                      ) : (
                        <>
                          <Edit className="w-3 h-3 mr-1.5" />
                          Edit
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Company Logo Section */}
                <div className="border-t border-gray-100 pt-6">
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-1">Company Logo</h4>
                      <p className="text-xs text-gray-500">Your logo appears on job listings and in your dashboard</p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {/* Logo Preview Area */}
                      <div className="relative group flex-shrink-0">
                        {logoPreview || logoUrl ? (
                          <div className="relative">
                            <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 bg-white shadow-sm">
                              <img
                                src={logoPreview || logoUrl || ""}
                                alt={`${companyName} logo`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                            {logoUrl && !logoPreview && (
                              <button
                                onClick={async () => {
                                  setLogoUrl(null);
                                  toast.info("Logo removal coming soon");
                                }}
                                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100 shadow-sm"
                                title="Remove logo"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center">
                            <Building className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Upload Controls */}
                      <div className="flex-1 min-w-0">
                        <input
                          id="logo-upload"
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                          onChange={handleLogoUpload}
                          disabled={uploadingLogo}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          disabled={uploadingLogo}
                          onClick={() => {
                            const input = document.getElementById("logo-upload") as HTMLInputElement;
                            input?.click();
                          }}
                          className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 text-sm px-3 py-1.5 h-8 mb-1"
                        >
                          {uploadingLogo ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-1.5" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              {logoUrl ? "Change logo" : "Upload logo"}
                            </>
                          )}
                        </Button>
                        <p className="text-xs text-gray-400">Max 5MB • JPEG, PNG, GIF, WebP</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* About Company Section */}
                <div className="border-t border-gray-100 pt-6">
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-1">About company</h4>
                      <p className="text-xs text-gray-500">This will be part of your job descriptions by default</p>
                    </div>
                    {isEditing ? (
                      <Textarea
                        value={aboutCompany}
                        onChange={(e) => setAboutCompany(e.target.value)}
                        placeholder="Enter company description..."
                        className="min-h-[100px] text-sm border-gray-300 focus:border-gray-400 focus:ring-gray-400 resize-none"
                      />
                    ) : (
                      <div className="min-h-[100px] p-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-600">
                        {aboutCompany || <span className="text-gray-400">No company description added yet</span>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Benefits Section */}
                <div className="border-t border-gray-100 pt-6">
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-1">Benefits</h4>
                      <p className="text-xs text-gray-500">This will be part of your job descriptions by default</p>
                    </div>
                    {isEditing ? (
                      <Textarea
                        value={benefits}
                        onChange={(e) => setBenefits(e.target.value)}
                        placeholder="Enter company benefits..."
                        className="min-h-[100px] text-sm border-gray-300 focus:border-gray-400 focus:ring-gray-400 resize-none"
                      />
                    ) : (
                      <div className="min-h-[100px] p-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-600">
                        {benefits || <span className="text-gray-400">No benefits added yet</span>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Save Button */}
                {isEditing && (
                  <div className="border-t border-gray-100 pt-6 flex items-center justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 text-sm px-4 py-2 h-9"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveCompany}
                      disabled={loading}
                      className="bg-gray-900 text-white hover:bg-gray-800 text-sm px-4 py-2 h-9"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Saving...
                        </>
                      ) : (
                        "Save changes"
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {activeTab === "members" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-semibold text-[#1A1A1A]">Members ({members.length})</h4>
                    <p className="text-xs text-[#6B7280]">Manage and invite your team members (internal/external)</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3 h-3 absolute left-2 top-1/2 transform -translate-y-1/2 text-[#6B7280]" />
                      <Input
                        placeholder="Search by role or name"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-7 w-48 text-sm border-[#d4d4d8] focus:border-[#6a994e]"
                      />
                    </div>
                  </div>
                </div>

                {/* Members Table */}
                <div className="border border-[#d4d4d8] rounded overflow-hidden">
                  <div className="bg-[#f7f7f7] px-3 py-2 border-b border-[#d4d4d8]">
                    <div className="grid grid-cols-12 gap-4">
                      <div className="col-span-8">
                        <span className="text-xs font-medium text-[#6B7280] uppercase">MEMBERS</span>
                      </div>
                      <div className="col-span-4">
                        <span className="text-xs font-medium text-[#6B7280] uppercase">ROLE</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="divide-y divide-[#d4d4d8]">
                    {filteredMembers.map((member) => (
                      <div key={member.id} className="px-3 py-3">
                        <div className="grid grid-cols-12 gap-4 items-center">
                          <div className="col-span-8">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-[#6a994e] rounded-full flex items-center justify-center">
                                <span className="text-white text-xs font-medium">
                                  {member.userName.charAt(0)}
                                </span>
                              </div>
                              <div>
                                <div className="flex items-center gap-1">
                                  <span className="text-sm font-medium text-[#1A1A1A]">{member.userName}</span>
                                  {member.status === "active" && (
                                    <span className="px-1 py-0.5 text-xs bg-[#f0f0f0] text-[#6B7280] rounded">
                                      {member.role === "owner" ? "owner" : "active"}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-[#6B7280]">{member.userEmail}</p>
                              </div>
                            </div>
                          </div>
                          <div className="col-span-4">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-[#1A1A1A]">{member.role}</span>
                              {member.role !== "owner" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleBlockMember(member.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs px-2 py-1"
                                >
                                  <Trash2 className="w-3 h-3 mr-1" />
                                  Block
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Auto Join Section */}
                {(isLoadingInvites || pendingInvites.length > 0) && (
                  <div className="border border-[#d4d4d8] rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-sm font-semibold text-[#1A1A1A]">Pending invites</h5>
                      <span className="text-xs text-[#6B7280]">
                        {isLoadingInvites ? "Loading..." : `${pendingInvites.length} active`}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {isLoadingInvites ? (
                        <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                          <div className="w-4 h-4 border-2 border-[#6a994e] border-t-transparent rounded-full animate-spin" />
                          Loading invites...
                        </div>
                      ) : pendingInvites.length === 0 ? (
                        <p className="text-sm text-[#6B7280]">All invites have been accepted.</p>
                      ) : (
                        pendingInvites.map((invite) => {
                          const expiresOn = new Date(invite.expiresAt);
                          return (
                            <div
                              key={invite.id}
                              className="flex items-center justify-between rounded-md border border-[#e5e7eb] bg-white px-3 py-2"
                            >
                              <div>
                                <p className="text-sm font-medium text-[#1A1A1A]">
                                  {invite.email || "Invite link"}
                                </p>
                                <p className="text-xs text-[#6B7280]">
                                  Expires {expiresOn.toLocaleDateString()} at {expiresOn.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </p>
                              </div>
                              <span className="text-xs uppercase tracking-wide text-[#6B7280]">
                                {invite.role}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                <div className="bg-[#f7f7f7] rounded border border-[#d4d4d8] p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-sm font-medium text-[#1A1A1A]">Team member can automatically join</h5>
                      <p className="text-xs text-[#6B7280]">
                        Members with a "@bu.edu" email can join without an invite
                      </p>
                    </div>
                    <Switch
                      checked={autoJoinEnabled}
                      onCheckedChange={setAutoJoinEnabled}
                    />
                  </div>
                </div>

                {/* Copy Invite Link */}
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <Button
                      onClick={handleCopyInviteLink}
                      disabled={isGeneratingInvite}
                      className="bg-[#1a1a1a] text-white hover:bg-[#3D3D3D] text-sm px-3 py-1 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {!isGeneratingInvite && <Copy className="w-3 h-3 mr-1" />}
                      {isGeneratingInvite ? "Generating..." : "Generate invite link"}
                    </Button>
                  </div>

                  {/* Generated Invite Link Display */}
                  {inviteLink && (
                    <div className="bg-[#f7f7f7] rounded border border-[#d4d4d8] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[#6B7280] mb-1">Generated invite link:</p>
                          <p className="text-sm text-[#1A1A1A] font-mono break-all">{inviteLink}</p>
                        </div>
                        <Button
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(inviteLink);
                              toast.success("Link copied to clipboard");
                            } catch (error) {
                              console.error("Failed to copy link:", error);
                              toast.error("Failed to copy link");
                            }
                          }}
                          size="sm"
                          className="bg-[#6a994e] hover:bg-[#5a8a3e] text-white text-xs px-3 py-1 flex-shrink-0"
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copy
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "universities" && (
              <div className="space-y-4">
                {/* How it works Section */}
                <div className="bg-gradient-to-r from-[#f7f7f7] to-[#f0f0f0] border border-[#d4d4d8] rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-[#6a994e]/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <GraduationCap className="w-4 h-4 text-[#6a994e]" />
                    </div>
                    <div>
                      <h6 className="font-semibold text-[#1A1A1A] mb-1">How it works</h6>
                      <p className="text-sm text-[#6B7280] leading-relaxed">
                        Request access to university networks to post targeted jobs. Once approved, 
                        your job postings will be visible to students and alumni from those institutions, 
                        helping you reach the right talent pool.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-700">{universities.filter(uni => uni.approved).length}</p>
                        <p className="text-xs text-green-600 font-medium">Approved</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <GraduationCap className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-700">{filteredUniversities.length}</p>
                        <p className="text-xs text-blue-600 font-medium">Available</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Approved Universities Section */}
                {universityAuthorizations.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <h5 className="text-lg font-semibold text-[#1A1A1A]">Approved Access</h5>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                    
                    <div className="space-y-3">
                      {universityAuthorizations.map((auth) => (
                        <div key={auth.id} className="group bg-white border border-green-200 rounded-xl p-4 hover:shadow-md transition-all duration-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <GraduationCap className="w-5 h-5 text-green-600" />
                              </div>
                              <div>
                                <h6 className="font-semibold text-[#1A1A1A]">{auth.universityName}</h6>
                                <p className="text-xs text-[#6B7280]">Active partnership</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                Approved
                              </span>
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}


                {/* Request Access Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="text-lg font-semibold text-[#1A1A1A]">Request Access</h5>
                    <div className="text-sm text-[#6B7280]">
                      {filteredUniversities.length} available
                    </div>
                  </div>
                  
                  {isLoadingUniversities ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-[#6a994e] border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm text-[#6B7280]">Loading universities...</span>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Search Input */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
                        <Input
                          type="text"
                          placeholder="Search universities..."
                          value={universitySearchQuery}
                          onChange={(e) => {
                            setUniversitySearchQuery(e.target.value);
                            setShowUniversityDropdown(true);
                          }}
                          onFocus={() => setShowUniversityDropdown(true)}
                          className="pl-10 pr-4 py-3 border-[#d4d4d8] focus:border-[#6a994e] rounded-lg"
                        />
                      </div>

                      {/* Dropdown */}
                      {showUniversityDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#d4d4d8] rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                          {filteredUniversities.length > 0 ? (
                            filteredUniversities.map((university) => (
                              <div
                                key={university.id}
                                onClick={() => handleUniversitySelect(university)}
                                className="flex items-center justify-between p-3 hover:bg-[#f7f7f7] cursor-pointer transition-colors border-b border-[#f0f0f0] last:border-b-0"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-[#f7f7f7] rounded-lg flex items-center justify-center">
                                    <GraduationCap className="w-4 h-4 text-[#6B7280]" />
                                  </div>
                                  <div>
                                    <h6 className="font-medium text-[#1A1A1A]">{university.name}</h6>
                                    <p className="text-xs text-[#6B7280]">Ready to connect</p>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  className="bg-[#6a994e] hover:bg-[#5a8a3e] text-white px-3 py-1 text-xs"
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Request
                                </Button>
                              </div>
                            ))
                          ) : (
                            <div className="p-4 text-center text-sm text-[#6B7280]">
                              {universitySearchQuery ? 'No universities found matching your search' : 'No universities available'}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Click outside to close dropdown */}
                      {showUniversityDropdown && (
                        <div
                          className="fixed inset-0 z-0"
                          onClick={() => setShowUniversityDropdown(false)}
                        />
                      )}
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
