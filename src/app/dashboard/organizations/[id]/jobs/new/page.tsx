"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, Loader2, GraduationCap } from "lucide-react";
import Link from "next/link";

export default function NewJobPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [generatingJD, setGeneratingJD] = useState(false);
  const [universities, setUniversities] = useState<{id: number; name: string; approved: boolean}[]>([]);
  const [loadingUniversities, setLoadingUniversities] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    dept: "",
    locationMode: "remote",
    salaryRange: "",
    descriptionMd: "",
    status: "draft",
    visibility: 'public' as 'public' | 'institutions' | 'both',
    universityIds: [] as number[],
  });

  // Fetch approved universities for this organization
  useEffect(() => {
    const fetchUniversities = async () => {
      if (!params.id) return;
      
      setLoadingUniversities(true);
      try {
        const token = localStorage.getItem("bearer_token");
        const response = await fetch(`/api/employer/universities?orgId=${params.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (response.ok) {
          const data = await response.json();
          // Only show approved universities
          const approvedUniversities = data.filter((uni: any) => uni.approved);
          setUniversities(approvedUniversities);
        }
      } catch (error) {
        console.error("Failed to fetch universities:", error);
      } finally {
        setLoadingUniversities(false);
      }
    };

    fetchUniversities();
  }, [params.id]);

  const handleGenerateJD = async () => {
    if (!formData.title) {
      toast.error("Please enter a job title first");
      return;
    }

    setGeneratingJD(true);
    try {
      const token = localStorage.getItem("bearer_token");
      
      // First create the job
      const createResponse = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orgId: params.id,
          title: formData.title,
          dept: formData.dept,
          locationMode: formData.locationMode,
          salaryRange: formData.salaryRange,
          status: "draft",
        }),
      });

      if (!createResponse.ok) {
        throw new Error("Failed to create job");
      }

      const job = await createResponse.json();

      // Generate JD with AI
      const prompt = `Create a comprehensive job description for a ${formData.title} position${
        formData.dept ? ` in the ${formData.dept} department` : ""
      }. Location: ${formData.locationMode}${
        formData.salaryRange ? `. Salary: ${formData.salaryRange}` : ""
      }. Make it suitable for the Pakistan job market with both English and Urdu context.`;

      const jdResponse = await fetch("/api/ai/generate-jd", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          jobId: job.id,
          prompt,
        }),
      });

      if (jdResponse.ok) {
        const jdData = await jdResponse.json();
        setFormData((prev) => ({ ...prev, descriptionMd: jdData.contentMd }));
        toast.success("Job description generated!");
      }
    } catch (error) {
      toast.error("Failed to generate job description");
    } finally {
      setGeneratingJD(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          // Redirect new job creation to main dashboard flow; use first org and push to /dashboard/jobs
          orgId: params.id,
          ...formData,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Job created successfully!");
        router.push(`/dashboard/jobs/${data.id}`);
      } else {
        toast.error(data.error || "Failed to create job");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      <nav className="bg-white border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <Link
            href={`/dashboard/organizations/${params.id}`}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Organization
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">
              Create New Job
            </h1>
            <p className="text-muted-foreground mb-8">
              Post a new position and start receiving applications
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="title">Job Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="e.g., Senior Software Engineer"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dept">Department</Label>
                  <Input
                    id="dept"
                    value={formData.dept}
                    onChange={(e) =>
                      setFormData({ ...formData, dept: e.target.value })
                    }
                    placeholder="e.g., Engineering"
                  />
                </div>

                <div>
                  <Label htmlFor="locationMode">Location Mode</Label>
                  <Select
                    value={formData.locationMode}
                    onValueChange={(value) =>
                      setFormData({ ...formData, locationMode: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="remote">Remote</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                      <SelectItem value="onsite">On-site</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="salaryRange">Salary Range</Label>
                <Input
                  id="salaryRange"
                  value={formData.salaryRange}
                  onChange={(e) =>
                    setFormData({ ...formData, salaryRange: e.target.value })
                  }
                  placeholder="e.g., PKR 150,000 - 250,000/month"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="descriptionMd">Job Description</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateJD}
                    disabled={generatingJD || !formData.title}
                    className="gap-2"
                  >
                    {generatingJD ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generate with AI
                      </>
                    )}
                  </Button>
                </div>
                <Textarea
                  id="descriptionMd"
                  value={formData.descriptionMd}
                  onChange={(e) =>
                    setFormData({ ...formData, descriptionMd: e.target.value })
                  }
                  placeholder="Enter job description in Markdown format..."
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

            <div>
              <Label>Visibility</Label>
              <Select
                value={formData.visibility}
                onValueChange={(value) => setFormData({ ...formData, visibility: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="institutions">Selected Institutions Only</SelectItem>
                  <SelectItem value="both">Institutions + Public</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Choose who can view/apply to this job.
              </p>
            </div>

            {/* University Selection - Only show when institutions or both is selected */}
            {(formData.visibility === 'institutions' || formData.visibility === 'both') && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <GraduationCap className="w-4 h-4 text-[#6a994e]" />
                  <Label>Select Universities</Label>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Choose which universities can see this job posting.
                </p>
                
                {loadingUniversities ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Loading universities...
                  </div>
                ) : universities.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-[#d4d4d8] rounded-md p-3">
                    {universities.map((university) => (
                      <div key={university.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`university-${university.id}`}
                          checked={formData.universityIds.includes(university.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({
                                ...formData,
                                universityIds: [...formData.universityIds, university.id]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                universityIds: formData.universityIds.filter(id => id !== university.id)
                              });
                            }
                          }}
                        />
                        <Label
                          htmlFor={`university-${university.id}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {university.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground border border-[#d4d4d8] rounded-md">
                    No approved universities available. Please request access to universities in your organization settings first.
                  </div>
                )}
              </div>
            )}

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={loading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Creating..." : "Create Job"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
