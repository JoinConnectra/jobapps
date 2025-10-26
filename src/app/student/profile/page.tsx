"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  Loader2,
  Edit3,
  Plus,
  Trash2,
  Save,
  Briefcase,
  GraduationCap,
  Link as LinkIcon,
  FileText,
  Phone,
  ClipboardCheck,
} from "lucide-react";

/* ----------------------------- util helpers ----------------------------- */
function cls(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

// ADDED: safely coerce values for <input type="date">
function toDateInputValue(v: any): string {
  if (!v) return "";
  // v may already be 'YYYY-MM-DD' or an ISO string
  const s = String(v);
  if (s.length >= 10) return s.slice(0, 10);
  return "";
}

/* ----------------------------- main page ----------------------------- */
export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/student/profile", { cache: "no-store" });
        const data = await res.json();

        // ADDED: normalize earliestStart to date input format
        if (data && data.earliestStart) {
          data.earliestStart = toDateInputValue(data.earliestStart);
        }

        setMe(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading)
    return (
      <div className="flex justify-center items-center h-[80vh] text-gray-500">
        <Loader2 className="animate-spin w-6 h-6 mr-2" />
        Loading your profile...
      </div>
    );

  if (!me)
    return (
      <div className="p-8 text-center text-red-600">
        Could not load your profile. Please refresh.
      </div>
    );

  const completion =
    ([
      me.name,
      me.headline,
      me.about,
      me.skills?.length ? "1" : "",
      (me.experiences?.length || 0) > 0 ? "1" : "",
      (me.educations?.length || 0) > 0 ? "1" : "",
      me.resumeUrl,
    ].filter(Boolean).length /
      7) *
    100;

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        {/* Breadcrumb + Header */}
        <div>
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/student" className="hover:text-gray-700">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">Profile</span>
          </nav>
          <h1 className="text-3xl font-bold text-gray-900">Your Profile</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your student profile to help employers find you.
          </p>
        </div>

        {/* Header card */}
        <section className="rounded-2xl bg-white border shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-2xl font-semibold">
              {(me.name || "U").slice(0, 1).toUpperCase()}
            </div>

            <div className="flex-1 space-y-1">
              <h2 className="text-2xl font-semibold text-gray-900">
                {me.name || "Your Name"}
              </h2>
              <p className="text-gray-600">
                {me.headline || "Add a catchy headline to stand out"}
              </p>
              <p className="text-xs text-gray-500">
                {[me.program, me.gradYear && `Class of ${me.gradYear}`]
                  .filter(Boolean)
                  .join(" • ")}
              </p>
            </div>

            <VisibilityToggle isPublic={!!me.isPublic} />
          </div>

          {/* Progress */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Profile completeness</span>
              <span>{Math.round(completion)}%</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-2 bg-emerald-500 transition-all duration-500"
                style={{ width: `${completion}%` }}
              />
            </div>
          </div>
        </section>

        {/* Main grid */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <AboutCard initial={me} />
            <ExperienceCard initial={me.experiences ?? []} />
            <EducationCard initial={me.educations ?? []} />
            <ProjectsCard initial={me.links ?? []} />
          </div>

          <div className="space-y-6">
            <SkillsCard initial={me.skills ?? []} />
            <ResumeCard resumeUrl={me.resumeUrl} />
            <ContactCard phone={me.phone} />
            <ApplicationDefaultsCard initial={me} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------- small interactive pieces ------------------------- */
function VisibilityToggle({ isPublic }: { isPublic: boolean }) {
  const [on, setOn] = useState(isPublic);
  const [pending, start] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() =>
        start(async () => {
          setOn((v) => !v);
          await fetch("/api/student/profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isPublic: !on }),
          });
        })
      }
      className={cls(
        "text-xs px-3 py-1 rounded-full border transition-all",
        on
          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
          : "bg-gray-50 border-gray-200 text-gray-700",
        pending && "opacity-60"
      )}
    >
      {on ? "Public" : "Private"}
    </button>
  );
}

/* ----------------------------- About ----------------------------- */
function AboutCard({ initial }: { initial: any }) {
  const [form, setForm] = useState({
    name: initial.name ?? "",
    headline: initial.headline ?? "",
    about: initial.about ?? "",
    program: initial.program ?? "",
    gradYear: initial.gradYear ?? "",
    locationCity: initial.locationCity ?? "",
    locationCountry: initial.locationCountry ?? "",
    websiteUrl: initial.websiteUrl ?? "",
    phone: initial.phone ?? "",
  });
  const [pending, start] = useTransition();

  return (
    <Card title="About" icon={<Edit3 size={16} />}>
      <div className="grid gap-3">
        <Input label="Full Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Input label="Headline" value={form.headline} onChange={(v) => setForm({ ...form, headline: v })} placeholder="Aspiring Product Manager" />
        <Textarea label="About" value={form.about} onChange={(v) => setForm({ ...form, about: v })} rows={5} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Program" value={form.program} onChange={(v) => setForm({ ...form, program: v })} />
          <Input label="Graduation Year" value={form.gradYear} onChange={(v) => setForm({ ...form, gradYear: v })} type="number" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="City" value={form.locationCity} onChange={(v) => setForm({ ...form, locationCity: v })} />
          <Input label="Country" value={form.locationCountry} onChange={(v) => setForm({ ...form, locationCountry: v })} />
        </div>
        <Input label="Portfolio / Website" value={form.websiteUrl} onChange={(v) => setForm({ ...form, websiteUrl: v })} placeholder="https://" />
        <Input label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="+92 3xx xxxxxxx" />
      </div>
      <SaveButton pending={pending} onClick={() => start(async () => {
        await fetch("/api/student/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        location.reload();
      })} />
    </Card>
  );
}

/* ----------------------------- Experience ----------------------------- */
function ExperienceCard({ initial }: { initial: any[] }) {
  const [items, setItems] = useState(initial);
  const [draft, setDraft] = useState<any>({
    title: "",
    company: "",
    location: "",
    startDate: "",
    endDate: "",
    description: "",
  });

  async function add() {
    const res = await fetch("/api/student/profile/experiences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    if (res.ok) {
      const row = await res.json();
      setItems([...items, row]);
      setDraft({
        title: "",
        company: "",
        location: "",
        startDate: "",
        endDate: "",
        description: "",
      });
    }
  }

  async function remove(id: number) {
    await fetch("/api/student/profile/experiences", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setItems(items.filter((x) => x.id !== id));
  }

  return (
    <Card title="Experience" icon={<Briefcase size={16} />}>
      <div className="space-y-3">
        {items.map((x) => (
          <div
            key={x.id}
            className="border rounded-lg p-3 flex justify-between items-start"
          >
            <div>
              <p className="font-medium text-gray-900">{x.title}</p>
              <p className="text-xs text-gray-500">
                {[x.company, x.location].filter(Boolean).join(" • ")}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {[x.startDate, x.endDate].filter(Boolean).join(" → ")}
              </p>
              {x.description && (
                <p className="text-xs text-gray-600 mt-1">{x.description}</p>
              )}
            </div>
            <button
              onClick={() => remove(x.id)}
              className="text-xs text-red-600 hover:underline flex items-center gap-1"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        ))}
      </div>

      {/* Add new */}
      <div className="border-t pt-3 mt-3 grid gap-2">
        <Input
          label="Title"
          value={draft.title}
          onChange={(v) => setDraft({ ...draft, title: v })}
          placeholder="Software Engineer Intern"
        />
        <Input
          label="Company"
          value={draft.company}
          onChange={(v) => setDraft({ ...draft, company: v })}
          placeholder="Google"
        />
        <Input
          label="Location"
          value={draft.location}
          onChange={(v) => setDraft({ ...draft, location: v })}
          placeholder="Boston, MA"
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            label="Start Date"
            value={draft.startDate}
            onChange={(v) => setDraft({ ...draft, startDate: v })}
            placeholder="2024-01-01"
          />
          <Input
            label="End Date"
            value={draft.endDate}
            onChange={(v) => setDraft({ ...draft, endDate: v })}
            placeholder="2024-05-31"
          />
        </div>
        <Textarea
          label="Description"
          value={draft.description}
          onChange={(v) => setDraft({ ...draft, description: v })}
          rows={3}
        />
        <button
          onClick={add}
          className="flex items-center gap-1 text-sm rounded-md border px-3 py-1 hover:bg-gray-50"
        >
          <Plus size={14} /> Add Experience
        </button>
      </div>
    </Card>
  );
}

/* ----------------------------- Education ----------------------------- */
function EducationCard({ initial }: { initial: any[] }) {
  const [items, setItems] = useState(initial);
  const [draft, setDraft] = useState<any>({ school: "", degree: "", field: "" });

  async function add() {
    const res = await fetch("/api/student/profile/educations", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    if (res.ok) {
      const row = await res.json();
      setItems([...items, row]);
      setDraft({ school: "", degree: "", field: "" });
    }
  }

  async function remove(id: number) {
    await fetch("/api/student/profile/educations", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setItems(items.filter((x) => x.id !== id));
  }

  return (
    <Card title="Education" icon={<GraduationCap size={16} />}>
      <div className="space-y-3">
        {items.map((x) => (
          <div key={x.id} className="border rounded-lg p-3 flex justify-between items-start">
            <div>
              <p className="font-medium text-gray-900">{x.school}</p>
              <p className="text-xs text-gray-500">{[x.degree, x.field].filter(Boolean).join(" • ")}</p>
            </div>
            <button onClick={() => remove(x.id)} className="text-xs text-red-600 hover:underline flex items-center gap-1">
              <Trash2 size={14} /> Delete
            </button>
          </div>
        ))}
      </div>

      {/* Add new */}
      <div className="border-t pt-3 mt-3 grid gap-2">
        <Input label="School" value={draft.school} onChange={(v) => setDraft({ ...draft, school: v })} />
        <div className="grid grid-cols-2 gap-2">
          <Input label="Degree" value={draft.degree} onChange={(v) => setDraft({ ...draft, degree: v })} />
          <Input label="Field" value={draft.field} onChange={(v) => setDraft({ ...draft, field: v })} />
        </div>
        <button onClick={add} className="flex items-center gap-1 text-sm rounded-md border px-3 py-1 hover:bg-gray-50">
          <Plus size={14} /> Add Education
        </button>
      </div>
    </Card>
  );
}

/* ----------------------------- Projects ----------------------------- */
function ProjectsCard({ initial }: { initial: any[] }) {
  const [links, setLinks] = useState(initial);
  const [draft, setDraft] = useState<any>({ label: "", url: "" });

  async function add() {
    const res = await fetch("/api/student/profile/links", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    if (res.ok) {
      const row = await res.json();
      setLinks([...links, row]);
      setDraft({ label: "", url: "" });
    }
  }

  async function remove(id: number) {
    await fetch("/api/student/profile/links", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setLinks(links.filter((x) => x.id !== id));
  }

  return (
    <Card title="Projects & Links" icon={<LinkIcon size={16} />}>
      <div className="space-y-2">
        {links.map((x) => (
          <div key={x.id} className="flex justify-between items-center border rounded-lg px-3 py-2">
            <a href={x.url} target="_blank" className="text-sm text-blue-700 underline">{x.label}</a>
            <button onClick={() => remove(x.id)} className="text-xs text-red-600 hover:underline flex items-center gap-1">
              <Trash2 size={14} /> Delete
            </button>
          </div>
        ))}
      </div>
      <div className="border-t pt-3 mt-3 grid gap-2">
        <Input label="Label" value={draft.label} onChange={(v) => setDraft({ ...draft, label: v })} />
        <Input label="URL" value={draft.url} onChange={(v) => setDraft({ ...draft, url: v })} placeholder="https://" />
        <button onClick={add} className="flex items-center gap-1 text-sm rounded-md border px-3 py-1 hover:bg-gray-50">
          <Plus size={14} /> Add Link
        </button>
      </div>
    </Card>
  );
}

/* ----------------------------- Skills ----------------------------- */
function SkillsCard({ initial }: { initial: string[] }) {
  const [text, setText] = useState(initial?.join(", ") ?? "");
  async function save() {
    await fetch("/api/student/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skills: text }),
    });
    location.reload();
  }
  return (
    <Card title="Skills" icon={<Briefcase size={16} />}>
      <p className="text-xs text-gray-500 mb-2">Comma-separated (e.g., React, SQL, Figma)</p>
      <input
        className="w-full border rounded px-3 py-2 text-sm mb-2"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        onClick={save}
        className="w-full bg-emerald-600 text-white rounded-md text-sm py-2 hover:bg-emerald-700"
      >
        Save
      </button>
    </Card>
  );
}

/* ----------------------------- Resume ----------------------------- */
function ResumeCard({ resumeUrl }: { resumeUrl?: string }) {
  const [url, setUrl] = useState(resumeUrl ?? "");
  async function save() {
    await fetch("/api/student/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumeUrl: url }),
    });
    location.reload();
  }
  return (
    <Card title="Resume" icon={<FileText size={16} />}>
      <input
        className="w-full border rounded px-3 py-2 text-sm mb-2"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Paste resume URL"
      />
      <button
        onClick={save}
        className="w-full bg-emerald-600 text-white rounded-md text-sm py-2 hover:bg-emerald-700"
      >
        Save
      </button>
      {url && (
        <a
          href={url}
          target="_blank"
          className="text-sm text-blue-700 underline mt-2 inline-block"
        >
          Preview Resume
        </a>
      )}
    </Card>
  );
}

/* ----------------------------- Contact ----------------------------- */
function ContactCard({ phone }: { phone?: string }) {
  const [val, setVal] = useState(phone ?? "");
  async function save() {
    await fetch("/api/student/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: val }),
    });
    location.reload();
  }
  return (
    <Card title="Contact" icon={<Phone size={16} />}>
      <Input
        label="Phone"
        value={val}
        onChange={setVal}
        placeholder="+92 3xx xxxxxxx"
      />
      <button
        onClick={save}
        className="mt-3 w-full bg-emerald-600 text-white rounded-md text-sm py-2 hover:bg-emerald-700"
      >
        Save
      </button>
    </Card>
  );
}

/* ------------------------ Application Defaults ------------------------ */
function ApplicationDefaultsCard({ initial }: { initial: any }) {
  const [form, setForm] = useState({
    whatsapp: initial.whatsapp ?? "",
    province: initial.province ?? "",
    cnic: initial.cnic ?? "",
    linkedinUrl: initial.linkedinUrl ?? "",
    portfolioUrl: initial.portfolioUrl ?? initial.websiteUrl ?? "",
    githubUrl: initial.githubUrl ?? "",
    workAuth: initial.workAuth ?? "",
    needSponsorship:
      initial.needSponsorship === null || initial.needSponsorship === undefined
        ? ""
        : initial.needSponsorship
        ? "yes"
        : "no",
    willingRelocate:
      initial.willingRelocate === null || initial.willingRelocate === undefined
        ? ""
        : initial.willingRelocate
        ? "yes"
        : "no",
    remotePref: initial.remotePref ?? "",
    earliestStart: toDateInputValue(initial.earliestStart), // ADDED: normalized for date input
    salaryExpectation: initial.salaryExpectation ?? "",
    expectedSalaryPkr: initial.expectedSalaryPkr ?? "",
    noticePeriodDays: initial.noticePeriodDays ?? "",
    experienceYears: initial.experienceYears ?? "",
  });
  const [pending, start] = useTransition();

  function toPayload() {
    return {
      whatsapp: form.whatsapp,
      province: form.province,
      cnic: form.cnic,
      linkedinUrl: form.linkedinUrl,
      portfolioUrl: form.portfolioUrl,
      githubUrl: form.githubUrl,
      workAuth: form.workAuth,
      needSponsorship:
        form.needSponsorship === "" ? null : form.needSponsorship === "yes",
      willingRelocate:
        form.willingRelocate === "" ? null : form.willingRelocate === "yes",
      remotePref: form.remotePref,
      earliestStart: form.earliestStart,
      salaryExpectation: form.salaryExpectation,
      expectedSalaryPkr: form.expectedSalaryPkr,
      noticePeriodDays: form.noticePeriodDays,
      experienceYears: form.experienceYears,
    };
  }

  return (
    <Card title="Application Defaults" icon={<ClipboardCheck size={16} />}>
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Input label="WhatsApp" value={form.whatsapp} onChange={(v) => setForm({ ...form, whatsapp: v })} />
          <Input label="Province" value={form.province} onChange={(v) => setForm({ ...form, province: v })} />
        </div>
        <Input label="CNIC" value={form.cnic} onChange={(v) => setForm({ ...form, cnic: v })} placeholder="35101XXXXXXXXX" />
        <div className="grid grid-cols-1 gap-3">
          <Input label="LinkedIn" value={form.linkedinUrl} onChange={(v) => setForm({ ...form, linkedinUrl: v })} placeholder="https://www.linkedin.com/in/username" />
          <Input label="Portfolio / Website" value={form.portfolioUrl} onChange={(v) => setForm({ ...form, portfolioUrl: v })} placeholder="https://your.site" />
          <Input label="GitHub" value={form.githubUrl} onChange={(v) => setForm({ ...form, githubUrl: v })} placeholder="https://github.com/username" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Work Authorization" value={form.workAuth} onChange={(v) => setForm({ ...form, workAuth: v })}>
            <option value="">Select…</option>
            <option value="Citizen/PR">Citizen / Permanent Resident</option>
            <option value="Authorized (no sponsorship)">Authorized (no sponsorship)</option>
            <option value="Needs sponsorship">Needs sponsorship</option>
            <option value="Other / Not specified">Other / Not specified</option>
          </Select>
          <Select label="Require Sponsorship?" value={form.needSponsorship} onChange={(v) => setForm({ ...form, needSponsorship: v })}>
            <option value="">Select…</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Willing to Relocate?" value={form.willingRelocate} onChange={(v) => setForm({ ...form, willingRelocate: v })}>
            <option value="">Select…</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </Select>
          <Select label="Work Preference" value={form.remotePref} onChange={(v) => setForm({ ...form, remotePref: v })}>
            <option value="">Select…</option>
            <option value="Onsite">Onsite</option>
            <option value="Hybrid">Hybrid</option>
            <option value="Remote">Remote</option>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Earliest Start" type="date" value={form.earliestStart} onChange={(v) => setForm({ ...form, earliestStart: v })} />
          <Input label="Salary Expectation (text)" value={form.salaryExpectation} onChange={(v) => setForm({ ...form, salaryExpectation: v })} placeholder="PKR range or text" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Input label="Experience (years)" value={form.experienceYears} onChange={(v) => setForm({ ...form, experienceYears: v })} placeholder="e.g., 2.5" />
          <Input label="Expected Salary (PKR)" type="number" value={form.expectedSalaryPkr} onChange={(v) => setForm({ ...form, expectedSalaryPkr: v })} />
          <Input label="Notice Period (days)" type="number" value={form.noticePeriodDays} onChange={(v) => setForm({ ...form, noticePeriodDays: v })} />
        </div>
      </div>
      <SaveButton
        pending={pending}
        onClick={() =>
          start(async () => {
            await fetch("/api/student/profile", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(toPayload()),
            });
            location.reload();
          })
        }
      />
    </Card>
  );
}

/* ----------------------------- Reusable Components ----------------------------- */
function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode; }) {
  return (
    <section className="rounded-2xl border bg-white shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          {icon}
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function SaveButton({ pending, onClick }: { pending: boolean; onClick: () => void; }) {
  return (
    <div className="flex justify-end mt-4">
      <button
        disabled={pending}
        onClick={onClick}
        className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-md text-sm hover:bg-emerald-700 disabled:opacity-60"
      >
        <Save size={14} />
        Save
      </button>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", placeholder }: { label?: string; value: any; onChange: (v: string) => void; type?: string; placeholder?: string; }) {
  return (
    <div className="grid gap-1">
      {label && <label className="text-sm text-gray-700">{label}</label>}
      <input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        placeholder={placeholder}
        className="border border-gray-300 bg-white rounded-md px-3 py-2 text-sm text-gray-900 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
      />
    </div>
  );
}

function Select({ label, value, onChange, children }: { label?: string; value: any; onChange: (v: string) => void; children: React.ReactNode; }) {
  return (
    <div className="grid gap-1">
      {label && <label className="text-sm text-gray-700">{label}</label>}
      <select
        className="border border-gray-300 bg-white rounded-md px-3 py-2 text-sm text-gray-900 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
    </div>
  );
}

function Textarea({ label, value, onChange, rows = 4 }: { label?: string; value: any; onChange: (v: string) => void; rows?: number; }) {
  return (
    <div className="grid gap-1">
      {label && <label className="text-sm text-gray-700">{label}</label>}
      <textarea
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="border border-gray-300 bg-white rounded-md px-3 py-2 text-sm text-gray-900 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
      />
    </div>
  );
}
