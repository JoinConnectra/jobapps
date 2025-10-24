"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession, authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User,ListChecks ,Clock, Filter, Briefcase, Search, HelpCircle, UserPlus, LogOut, Bell, Trash2, AlertTriangle, Check, ChevronDown, MoreVertical } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import CommandPalette from "@/components/CommandPalette";
import { useCommandPalette } from "@/hooks/use-command-palette";

interface Application {
  id: number;
  applicantEmail: string;
  stage: string;
  source: string | null;
  createdAt: string;
  jobTitle: string;
}

interface Job {
  id: number;
  title: string;
}

export default function JobApplicationsPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, isPending } = useSession();
  const { isOpen: isCommandPaletteOpen, open: openCommandPalette, close: closeCommandPalette } = useCommandPalette();
  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [org, setOrg] = useState<{ id: number; name: string } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    applicationId: number | null;
    applicantEmail: string;
  }>({
    isOpen: false,
    applicationId: null,
    applicantEmail: "",
  });
  const [deleting, setDeleting] = useState(false);
  const [selectedApplications, setSelectedApplications] = useState<number[]>([]);
  const [bulkActionMode, setBulkActionMode] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user && params.id) {
      fetchData();
      fetchOrg();
    }
  }, [session, params.id, filter]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (dropdownOpen && !target.closest('.dropdown-container')) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const fetchOrg = async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      const orgResp = await fetch("/api/organizations?mine=true", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (orgResp.ok) {
        const orgs = await orgResp.json();
        if (Array.isArray(orgs) && orgs.length > 0) {
          setOrg(orgs[0]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch org:", error);
    }
  };

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("bearer_token");

      // Fetch job
      const jobResponse = await fetch(`/api/jobs?id=${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (jobResponse.ok) {
        const jobData = await jobResponse.json();
        setJob(jobData);
      }

      // Fetch applications
      const appsUrl = filter === "all" 
        ? `/api/applications?jobId=${params.id}`
        : `/api/applications?jobId=${params.id}&stage=${filter}`;
        
      const appsResponse = await fetch(appsUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (appsResponse.ok) {
        const appsData = await appsResponse.json();
        setApplications(appsData);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    const { error } = await authClient.signOut();
    if (error?.code) {
      toast.error(error.code);
    } else {
      localStorage.removeItem("bearer_token");
      router.push("/");
    }
  };

  const handleDeleteApplication = async () => {
    if (!deleteDialog.applicationId) return;

    setDeleting(true);
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/applications/${deleteDialog.applicationId}/delete`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success("Application deleted successfully");
        // Remove the application from the local state
        setApplications(prev => 
          prev.filter(app => app.id !== deleteDialog.applicationId)
        );
        // Close the dialog
        setDeleteDialog({
          isOpen: false,
          applicationId: null,
          applicantEmail: "",
        });
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to delete application");
      }
    } catch (error) {
      console.error("Delete application error:", error);
      toast.error("An error occurred while deleting the application");
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteDialog = (applicationId: number, applicantEmail: string) => {
    setDeleteDialog({
      isOpen: true,
      applicationId,
      applicantEmail,
    });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog({
      isOpen: false,
      applicationId: null,
      applicantEmail: "",
    });
  };

  const toggleApplicationSelection = (applicationId: number) => {
    setSelectedApplications(prev => {
      const newSelection = prev.includes(applicationId)
        ? prev.filter(id => id !== applicationId)
        : [...prev, applicationId];
      return newSelection;
    });
  };

  const selectAllApplications = () => {
    const allIds = applications.map(app => app.id);
    setSelectedApplications(allIds);
  };

  const clearSelection = () => {
    setSelectedApplications([]);
  };

  const handleBulkStageUpdate = async (newStage: string) => {
    if (selectedApplications.length === 0) {
      toast.error("No applications selected");
      return;
    }

    setBulkActionLoading(true);
    try {
      const token = localStorage.getItem("bearer_token");
      
      const promises = selectedApplications.map(applicationId => {
        return fetch(`/api/applications/${applicationId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ stage: newStage }),
        });
      });

      const results = await Promise.all(promises);
      const successful = results.filter(response => response.ok).length;
      
      if (successful === selectedApplications.length) {
        toast.success(`Successfully updated ${successful} application${successful > 1 ? 's' : ''} to ${newStage}`);
        // Update local state
        setApplications(prev => 
          prev.map(app => 
            selectedApplications.includes(app.id) 
              ? { ...app, stage: newStage }
              : app
          )
        );
        clearSelection();
        setBulkActionMode(false);
      } else {
        toast.error(`Updated ${successful} of ${selectedApplications.length} applications`);
      }
    } catch (error) {
      console.error("Bulk update error:", error);
      toast.error("Failed to update applications");
    } finally {
      setBulkActionLoading(false);
    }
  };

  if (isPending || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FEFEFA]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session?.user || !job) return null;

  const stages = [
    { value: "all", label: "All", count: applications.length },
    { value: "applied", label: "Applied", count: applications.filter(a => a.stage === "applied").length },
    { value: "reviewing", label: "Reviewing", count: applications.filter(a => a.stage === "reviewing").length },
    { value: "phone_screen", label: "Phone Screen", count: applications.filter(a => a.stage === "phone_screen").length },
    { value: "onsite", label: "Onsite", count: applications.filter(a => a.stage === "onsite").length },
    { value: "offer", label: "Offer", count: applications.filter(a => a.stage === "offer").length },
    { value: "hired", label: "Hired", count: applications.filter(a => a.stage === "hired").length },
    { value: "rejected", label: "Rejected", count: applications.filter(a => a.stage === "rejected").length },
  ];

  return (
    <div className="min-h-screen bg-[#FEFEFA] flex">
      {/* Left Sidebar */}
      <aside className="w-64 bg-[#FEFEFA] border-r border-gray-200 flex flex-col h-screen sticky top-0">
        <div className="p-6">
          <div className="text-xl font-display font-bold text-gray-900 mb-6">{org?.name || "forshadow"}</div>
          
          <Button onClick={() => router.push("/dashboard/jobs?create=1")} className="w-full mb-6 bg-[#F5F1E8] text-gray-900 hover:bg-[#E8E0D5] border-0">
            + Create a Job
          </Button>
          
          <nav className="space-y-1">
            <Button variant="ghost" className="w-full justify-start text-gray-700 hover:bg-[#F5F1E8] hover:text-gray-900" onClick={() => router.push("/dashboard")}>
              <Bell className="w-4 h-4 mr-3" />
              Activities
            </Button>
            <Button variant="ghost" className="w-full justify-start text-gray-700 bg-[#F5F1E8] text-gray-900" onClick={() => router.push("/dashboard/jobs")}>
              <Briefcase className="w-4 h-4 mr-3" />
              Jobs
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:bg-[#F5F1E8] hover:text-gray-900"
              disabled={!org?.id}
              title={!org?.id ? "Select or create an organization first" : "Assessments"}
              onClick={() =>
                org?.id && router.push(`/dashboard/organizations/${org.id}/assessments`)
              }
            >
              <ListChecks className="w-4 h-4 mr-3" />
              Assessments
            </Button>
          </nav>
        </div>
        
        <div className="mt-auto p-6 border-t border-gray-200">
          <div className="space-y-3">
            <Button 
              variant="ghost" 
              className="w-full justify-start text-gray-500 text-sm"
              onClick={openCommandPalette}
            >
              <Search className="w-4 h-4 mr-3" />
              Search
              <span className="ml-auto text-xs">⌘K</span>
            </Button>
            <Button variant="ghost" className="w-full justify-start text-gray-500 text-sm">
              <HelpCircle className="w-4 h-4 mr-3" />
              Help & Support
            </Button>
            <Button variant="ghost" className="w-full justify-start text-gray-500 text-sm">
              <UserPlus className="w-4 h-4 mr-3" />
              Invite people
            </Button>
            <Button variant="ghost" className="w-full justify-start text-gray-500 text-sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-3" />
              Log out
            </Button>
          </div>
          
          <div className="mt-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-white text-sm font-medium">{session.user.name?.charAt(0)}</span>
            </div>
            <div className="text-sm font-medium text-gray-900">{session.user.name}</div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-[#FEFEFA] overflow-y-auto">
        <div className="p-8">
        <div className="max-w-6xl">
          <div className="flex items-center gap-4 mb-8">
            <nav className="flex items-center gap-2 text-sm">
              <Link
                href="/dashboard"
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                Dashboard
              </Link>
              <span className="text-gray-400">&gt;</span>
              <Link
                href="/dashboard/jobs"
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                Jobs
              </Link>
              <span className="text-gray-400">&gt;</span>
              <Link
                href={`/dashboard/jobs/${params.id}`}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                {job.title}
              </Link>
              <span className="text-gray-400">&gt;</span>
              <span className="text-gray-900 font-medium">Applications</span>
            </nav>
          </div>

          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm p-5 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-1">
              {job.title} - Applications
            </h2>
            <p className="text-sm text-gray-500">
              {applications.length} total application{applications.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="bg-white rounded-lg shadow-sm p-5 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-4 h-4 text-gray-500" />
                {stages.map((stage) => (
                  <button
                    key={stage.value}
                    onClick={() => setFilter(stage.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      filter === stage.value
                        ? "bg-[#6a994e] text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {stage.label} ({stage.count})
                  </button>
                ))}
              </div>
              
              {/* Bulk Actions Dropdown */}
              <div className="relative dropdown-container">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Dropdown button clicked, current state:', dropdownOpen);
                    setDropdownOpen(!dropdownOpen);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-all"
                >
                  <MoreVertical className="w-4 h-4" />
                  Actions
                  <ChevronDown className="w-3 h-3" />
                </button>
                
                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 dropdown-container">
                    <div className="p-2">
                      {/* Selection Controls */}
                      <button
                        onClick={() => {
                          console.log('Select Applications clicked, current bulkActionMode:', bulkActionMode);
                          setBulkActionMode(!bulkActionMode);
                          if (!bulkActionMode) {
                            clearSelection();
                          }
                          setDropdownOpen(false);
                          console.log('New bulkActionMode should be:', !bulkActionMode);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        {bulkActionMode ? "Exit Selection" : "Select Applications"}
                      </button>
                      
                      {bulkActionMode && (
                        <>
                          <button
                            onClick={() => {
                              selectAllApplications();
                              setDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            Select All
                          </button>
                          <button
                            onClick={() => {
                              clearSelection();
                              setDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            Clear Selection
                          </button>
                          
                          <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100">
                            {selectedApplications.length} selected
                          </div>
                          
                          <div className="px-3 py-2 text-xs text-gray-500 font-medium">
                            Quick Actions:
                          </div>
                          
                          {stages.slice(1).map((stage) => (
                            <button
                              key={stage.value}
                              onClick={() => {
                                handleBulkStageUpdate(stage.value);
                                setDropdownOpen(false);
                              }}
                              disabled={bulkActionLoading || selectedApplications.length === 0}
                              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Move to {stage.label}
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Applications List */}
          <div className="bg-white rounded-lg shadow-sm">
            {bulkActionMode && (
              <div className="p-4 bg-blue-50 border-b border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium text-blue-900">
                      Selection Mode Active
                    </span>
                    <span className="text-xs text-blue-700">
                      ({selectedApplications.length} selected)
                    </span>
                  </div>
                  <button
                    onClick={() => setBulkActionMode(false)}
                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    Exit Selection
                  </button>
                </div>
              </div>
            )}
            
            {applications.length === 0 ? (
              <div className="text-center py-12">
                <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">
                  No applications found for this filter
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {applications.map((app) => (
                  <div
                    key={app.id}
                    className={`p-5 hover:bg-gray-50 transition-colors ${
                      bulkActionMode && selectedApplications.includes(app.id)
                        ? "bg-blue-50 border-l-4 border-blue-500"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        {bulkActionMode && (
                          <button
                            onClick={() => toggleApplicationSelection(app.id)}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                              selectedApplications.includes(app.id)
                                ? "bg-[#6a994e] border-[#6a994e] text-white"
                                : "border-gray-300 hover:border-gray-400"
                            }`}
                          >
                            {selectedApplications.includes(app.id) && (
                              <Check className="w-3 h-3" />
                            )}
                          </button>
                        )}
                        
                        <Link
                          href={`/dashboard/applications/${app.id}`}
                          className="flex items-center gap-3 flex-1"
                        >
                          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-orange-600" />
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">
                              {app.applicantEmail}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="w-3 h-3 text-gray-500" />
                              <span className="text-xs text-gray-500">
                                Applied {new Date(app.createdAt).toLocaleDateString()}
                              </span>
                              {app.source && (
                                <>
                                  <span className="text-xs text-gray-500">•</span>
                                  <span className="text-xs text-gray-500">
                                    via {app.source}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </Link>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            app.stage === "hired"
                              ? "bg-green-100 text-green-700"
                              : app.stage === "rejected"
                              ? "bg-red-100 text-red-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {app.stage}
                        </span>
                        
                        {!bulkActionMode && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              openDeleteDialog(app.id, app.applicantEmail);
                            }}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete application"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      {deleteDialog.isOpen && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Delete Application
                  </h3>
                  <p className="text-sm text-gray-500">
                    This action cannot be undone
                  </p>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-sm text-gray-700">
                  Are you sure you want to delete the application from{" "}
                  <span className="font-medium text-gray-900">
                    {deleteDialog.applicantEmail}
                  </span>
                  ? This will permanently remove all associated data including:
                </p>
                <ul className="mt-3 text-xs text-gray-600 space-y-1">
                  <li>• Voice answers and recordings</li>
                  <li>• Text answers</li>
                  <li>• Comments and reactions</li>
                  <li>• Application history</li>
                </ul>
              </div>
              
              <div className="flex items-center gap-3">
                <Button
                  onClick={closeDeleteDialog}
                  variant="outline"
                  className="flex-1"
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteApplication}
                  variant="destructive"
                  className="flex-1"
                  disabled={deleting}
                >
                  {deleting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Deleting...
                    </div>
                  ) : (
                    "Delete Application"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={closeCommandPalette}
        orgId={org?.id}
      />
    </div>
  );
}