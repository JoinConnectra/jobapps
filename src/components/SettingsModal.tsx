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

  // University access state
  const [universities, setUniversities] = useState<University[]>([]);
  const [universityAuthorizations, setUniversityAuthorizations] = useState<UniversityAuthorization[]>([]);
  const [selectedUniversities, setSelectedUniversities] = useState<number[]>([]);
  const [isLoadingUniversities, setIsLoadingUniversities] = useState(false);
  const [universitySearchQuery, setUniversitySearchQuery] = useState("");
  const [showUniversityDropdown, setShowUniversityDropdown] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<UniversityAuthorization[]>([]);

  useEffect(() => {
    if (organization) {
      setCompanyName(organization.name);
      setCompanyLink(organization.link || "");
      setBenefits(organization.benefits || "");
      setAboutCompany(organization.about_company || "");
    }
  }, [organization]);

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
              <div className="space-y-4">
                {/* Company Name and Link */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="text-base font-semibold text-[#1A1A1A]">{companyName}</h4>
                      <p className="text-sm text-[#6B7280]">{companyLink || "No website link"}</p>
                    </div>
                    <Button
                      onClick={() => setIsEditing(!isEditing)}
                      className="bg-[#1a1a1a] text-white hover:bg-[#3D3D3D] text-sm px-3 py-1"
                    >
                      {isEditing ? <Save className="w-3 h-3 mr-1" /> : <Edit className="w-3 h-3 mr-1" />}
                      {isEditing ? "Save" : "Edit"}
                    </Button>
                  </div>
                </div>

                {/* Benefits Section */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-[#1A1A1A]">Benefits</h4>
                  <p className="text-xs text-[#6B7280]">This will be part of your job descriptions by default</p>
                  {isEditing ? (
                    <Textarea
                      value={benefits}
                      onChange={(e) => setBenefits(e.target.value)}
                      placeholder="Enter company benefits..."
                      className="min-h-[80px] text-sm border-[#d4d4d8] focus:border-[#6a994e]"
                    />
                  ) : (
                    <div className="p-3 bg-[#f7f7f7] rounded border border-[#d4d4d8] min-h-[80px] text-sm text-[#6B7280]">
                      {benefits || "No benefits added yet"}
                    </div>
                  )}
                </div>

                {/* About Company Section */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-[#1A1A1A]">About company</h4>
                  <p className="text-xs text-[#6B7280]">This will be part of your job descriptions by default</p>
                  {isEditing ? (
                    <Textarea
                      value={aboutCompany}
                      onChange={(e) => setAboutCompany(e.target.value)}
                      placeholder="Enter company description..."
                      className="min-h-[80px] text-sm border-[#d4d4d8] focus:border-[#6a994e]"
                    />
                  ) : (
                    <div className="p-3 bg-[#f7f7f7] rounded border border-[#d4d4d8] min-h-[80px] text-sm text-[#6B7280]">
                      {aboutCompany || "No company description added yet"}
                    </div>
                  )}
                </div>


                {isEditing && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={handleSaveCompany}
                      disabled={loading}
                      className="bg-[#6a994e] hover:bg-[#5a8a3e] text-sm px-3 py-1"
                    >
                      {loading ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                      className="text-sm px-3 py-1 border-[#d4d4d8] text-[#404040] hover:bg-[#f0f0f0]"
                    >
                      Cancel
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
