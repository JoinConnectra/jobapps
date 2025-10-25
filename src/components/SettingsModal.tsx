"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
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

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization: Organization | null;
}

export default function SettingsModal({ isOpen, onClose, organization }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"company" | "members">("company");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [autoJoinEnabled, setAutoJoinEnabled] = useState(false);
  const [inviteLink, setInviteLink] = useState("");

  // Company form state
  const [companyName, setCompanyName] = useState("");
  const [companyLink, setCompanyLink] = useState("");
  const [benefits, setBenefits] = useState("");
  const [aboutCompany, setAboutCompany] = useState("");

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
      fetchInviteLink();
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

  const fetchInviteLink = async () => {
    if (!organization) return;
    
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/organizations/${organization.id}/invite-link`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setInviteLink(data.inviteLink);
      }
    } catch (error) {
      console.error("Failed to fetch invite link:", error);
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
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success("Invite link copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy invite link");
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
          </nav>
          
          <div className="p-3 border-t border-[#d4d4d8]">
            <button className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-red-600 hover:bg-red-50 transition-colors">
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
                    className="bg-[#1a1a1a] text-white hover:bg-[#3D3D3D] text-sm px-3 py-1"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy invite link
                  </Button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
