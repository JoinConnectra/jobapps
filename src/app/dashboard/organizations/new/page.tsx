"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Building2, GraduationCap, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewOrganizationPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    type: "company" as "company" | "university",
    plan: "free",
    seatLimit: 5,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Organization created successfully!");
        router.push(`/dashboard/organizations/${data.id}`);
      } else {
        toast.error(data.error || "Failed to create organization");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
    }));
  };

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      <nav className="bg-white border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <Link
            href="/dashboard/organizations"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Organizations
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">
              Create New Organization
            </h1>
            <p className="text-muted-foreground mb-8">
              Set up your company or university profile to start hiring
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="name">Organization Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g., Acme Corporation"
                  required
                />
              </div>

              <div>
                <Label htmlFor="slug">Slug (URL)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    yourapp.com/
                  </span>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({ ...formData, slug: e.target.value })
                    }
                    placeholder="acme-corp"
                    required
                  />
                </div>
              </div>

              <div>
                <Label>Organization Type</Label>
                <RadioGroup
                  value={formData.type}
                  onValueChange={(value: "company" | "university") =>
                    setFormData({ ...formData, type: value })
                  }
                  className="grid grid-cols-2 gap-4 mt-2"
                >
                  <label
                    htmlFor="company"
                    className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.type === "company"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <RadioGroupItem value="company" id="company" />
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-primary" />
                      <span className="font-medium">Company</span>
                    </div>
                  </label>

                  <label
                    htmlFor="university"
                    className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.type === "university"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <RadioGroupItem value="university" id="university" />
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-primary" />
                      <span className="font-medium">University</span>
                    </div>
                  </label>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="seatLimit">Seat Limit</Label>
                <Input
                  id="seatLimit"
                  type="number"
                  min="1"
                  value={formData.seatLimit}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      seatLimit: parseInt(e.target.value),
                    })
                  }
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum number of team members
                </p>
              </div>

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
                  {loading ? "Creating..." : "Create Organization"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
