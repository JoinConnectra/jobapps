"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { GraduationCap, Briefcase, MapPin, DollarSign } from "lucide-react";
import Link from "next/link";

interface Job {
  id: number;
  title: string;
  dept: string | null;
  locationMode: string | null;
  salaryRange: string | null;
  createdAt: string;
}

interface University {
  id: number;
  name: string;
  slug: string;
}

export default function UniversityPortalPage() {
  const params = useParams();
  const [university, setUniversity] = useState<University | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUniversityData();
  }, [params.slug]);

  const fetchUniversityData = async () => {
    try {
      // Fetch university by slug
      const uniResponse = await fetch(
        `/api/organizations?slug=${params.slug}`
      );

      if (uniResponse.ok) {
        const uniData = await uniResponse.json();
        setUniversity(uniData);

        // Fetch jobs for this university
        const jobsResponse = await fetch(
          `/api/jobs?orgId=${uniData.id}&status=published`
        );

        if (jobsResponse.ok) {
          const jobsData = await jobsResponse.json();
          setJobs(jobsData);
        }
      }
    } catch (error) {
      console.error("Failed to fetch university data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F1E8]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!university) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F1E8]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            University Portal Not Found
          </h1>
          <p className="text-muted-foreground">
            This university portal doesn't exist or hasn't been set up yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      {/* Header */}
      <header className="bg-white border-b border-border">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">
                {university.name}
              </h1>
              <p className="text-muted-foreground">Student Career Portal</p>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-accent text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl font-display font-bold mb-4">
              Welcome, {university.name} Students! 🎓
            </h2>
            <p className="text-lg opacity-90">
              Explore exclusive job opportunities from top employers looking to
              hire talented students like you. Apply with voice responses and
              stand out from the crowd.
            </p>
          </div>
        </div>
      </section>

      {/* Jobs Section */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-display font-bold text-foreground mb-6">
            Available Opportunities
          </h2>

          {jobs.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                No job postings available at the moment. Check back soon!
              </p>
            </div>
          ) : (
            <div className="grid gap-6">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all"
                >
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {job.title}
                  </h3>

                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                    {job.dept && (
                      <div className="flex items-center gap-1">
                        <Briefcase className="w-4 h-4" />
                        <span>{job.dept}</span>
                      </div>
                    )}
                    {job.locationMode && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{job.locationMode}</span>
                      </div>
                    )}
                    {job.salaryRange && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        <span>{job.salaryRange}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Posted {new Date(job.createdAt).toLocaleDateString()}
                    </span>
                    <Link
                      href={`/apply/${job.id}`}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all font-medium"
                    >
                      Apply Now
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-border py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            {university.name} Career Services • Powered by Connectra Hiring Platform
          </p>
        </div>
      </footer>
    </div>
  );
}
