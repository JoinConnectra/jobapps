// src/app/dashboard/organizations/[id]/assessments/[aid]/edit/page.tsx
"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSession, authClient } from "@/lib/auth-client";
import CommandPalette from "@/components/CommandPalette";
import CompanySidebar from "@/components/company/CompanySidebar";
import { useCommandPalette } from "@/hooks/use-command-palette";
import { toast } from "sonner";

type Assessment = {
  id: number;
  orgId: number;
  jobId: number | null;
  title: string;
  type: string;
  duration: string;
  status: string;
  descriptionMd: string | null;
  isPublished: boolean;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
};

type Question = {
  id: number;
  prompt: string;
  kind: "mcq" | "short" | "coding" | "case";
  optionsJson: any | null;
  correctAnswer: string | null;
  orderIndex: number | null;
  createdAt: string;
};

type McqOption = { id: string; value: string };
type CodingTest = { input: string; output: string };

function AssessmentEditPageInner() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const params = useParams<{ id: string; aid: string }>();
  const search = useSearchParams();

  const orgIdFromRoute = useMemo(() => {
    const raw = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [params]);

  const assessmentId = useMemo(() => {
    const raw = Array.isArray(params?.aid) ? params.aid[0] : params?.aid;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [params]);

  const [activeTab, setActiveTab] = useState<"details" | "questions">(
    (search?.get("tab") as any) === "questions" ? "questions" : "details"
  );

  const {
    isOpen: isCommandPaletteOpen,
    open: openCommandPalette,
    close: closeCommandPalette,
  } = useCommandPalette();

  const [org, setOrg] = useState<{
    id: number;
    name: string;
    logoUrl?: string | null;
  } | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(true);

  const [form, setForm] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Questions state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQs, setLoadingQs] = useState(true);

  // Builder modal-like state (inline on this page)
  const [creating, setCreating] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [kind, setKind] = useState<"mcq" | "short" | "coding" | "case">(
    "mcq"
  );
  const [points, setPoints] = useState<number>(1);

  const [mcqOptions, setMcqOptions] = useState<McqOption[]>([
    { id: crypto.randomUUID(), value: "" },
    { id: crypto.randomUUID(), value: "" },
  ]);
  const [mcqCorrect, setMcqCorrect] = useState<string>("");

  const [lang, setLang] = useState<"python" | "javascript" | "cpp">(
    "javascript"
  );
  const [starterCode, setStarterCode] = useState("");
  const [timeLimitSec, setTimeLimitSec] = useState<number>(60);
  const [tests, setTests] = useState<CodingTest[]>([
    { input: "", output: "" },
  ]);
  const [entryPoint, setEntryPoint] = useState<string>("solution"); // function to invoke

  const [rubric, setRubric] = useState("");
  const [maxWords, setMaxWords] = useState<number | "">("");

  // Keep URL in sync when tab changes
  useEffect(() => {
    const q = new URLSearchParams(search?.toString());
    q.set("tab", activeTab);
    router.replace(`?${q.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  /** Redirect unauthenticated users */
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  /** Sidebar org */
  useEffect(() => {
    if (!session?.user) return;
    (async () => {
      try {
        const token = localStorage.getItem("bearer_token");
        const resp = await fetch("/api/organizations?mine=true", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resp.ok) {
          const orgs = await resp.json();
          if (Array.isArray(orgs) && orgs.length > 0) {
            setOrg({
              id: orgs[0].id,
              name: orgs[0].name,
              logoUrl: orgs[0].logoUrl,
            });
          }
        }
      } catch (e) {
        console.error("Failed to fetch org (sidebar):", e);
      } finally {
        setLoadingOrg(false);
      }
    })();
  }, [session]);

  /** Load assessment details */
  useEffect(() => {
    if (!session?.user || !assessmentId) return;
    (async () => {
      try {
        const token = localStorage.getItem("bearer_token");
        const resp = await fetch(`/api/assessments/${assessmentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resp.ok) {
          const a = (await resp.json()) as Assessment;
          setForm(a);
        } else {
          console.warn(await resp.text());
        }
      } catch (e) {
        console.error("Error loading assessment:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [session, assessmentId]);

  /** Load questions */
  const loadQuestions = async () => {
    if (!assessmentId) return;
    setLoadingQs(true);
    try {
      const token = localStorage.getItem("bearer_token");
      const resp = await fetch(
        `/api/assessments/${assessmentId}/questions`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (resp.ok) {
        const rows: Question[] = await resp.json();
        setQuestions(rows);
      } else {
        console.warn("Failed to load questions:", await resp.text());
      }
    } catch (e) {
      console.error("Error loading questions:", e);
    } finally {
      setLoadingQs(false);
    }
  };
  useEffect(() => {
    if (session?.user && assessmentId) loadQuestions();
  }, [session, assessmentId]);

  /** Save details */
  const save = async (mode?: "draft" | "publish") => {
    if (!form || !assessmentId) return;
    setSaving(true);
    try {
      // decide final status/visibility
      let nextStatus = form.status;
      let nextPublished = form.isPublished;

      if (mode === "draft") {
        nextStatus = "Draft";
        nextPublished = false;
      } else if (mode === "publish") {
        nextStatus = "Published";
        nextPublished = true;
      }

      const token = localStorage.getItem("bearer_token");
      const resp = await fetch(`/api/assessments/${assessmentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: form.title,
          type: form.type,
          duration: form.duration,
          status: nextStatus,
          descriptionMd: form.descriptionMd ?? null,
          isPublished: nextPublished,
        }),
      });

      if (resp.ok) {
        toast.success(
          mode === "publish"
            ? "Published"
            : mode === "draft"
            ? "Saved as draft"
            : "Saved changes"
        );
      } else {
        toast.error("Failed to update");
      }
    } catch (e) {
      toast.error("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  /** Sign out */
  const handleSignOut = async () => {
    const { error } = await authClient.signOut();
    if (error?.code) return;
    localStorage.removeItem("bearer_token");
    router.push("/");
  };

  // ---------- Builder helpers ----------
  const resetBuilder = () => {
    setPrompt("");
    setKind("mcq");
    setPoints(1);
    setMcqOptions([
      { id: crypto.randomUUID(), value: "" },
      { id: crypto.randomUUID(), value: "" },
    ]);
    setMcqCorrect("");
    setLang("javascript");
    setStarterCode("");
    setTimeLimitSec(60);
    setTests([{ input: "", output: "" }]);
    setEntryPoint("solution");
    setRubric("");
    setMaxWords("");
  };

  const addMcqOption = () =>
    setMcqOptions((o) => [...o, { id: crypto.randomUUID(), value: "" }]);
  const removeMcqOption = (id: string) =>
    setMcqOptions((o) => o.filter((x) => x.id !== id));
  const updateMcqOption = (id: string, value: string) =>
    setMcqOptions((o) =>
      o.map((x) => (x.id === id ? { ...x, value } : x))
    );

  const addTest = () =>
    setTests((t) => [...t, { input: "", output: "" }]);
  const removeTest = (idx: number) =>
    setTests((t) => t.filter((_, i) => i !== idx));
  const updateTest = (
    idx: number,
    field: "input" | "output",
    value: string
  ) =>
    setTests((t) =>
      t.map((test, i) =>
        i === idx ? { ...test, [field]: value } : test
      )
    );

  const buildPayload = () => {
    const base: any = {
      prompt: prompt.trim(),
      kind,
      optionsJson: null,
      correctAnswer: null,
    };

    if (kind === "mcq") {
      const opts = mcqOptions
        .map((o) => o.value.trim())
        .filter(Boolean);
      base.optionsJson = { type: "mcq", points, options: opts };
      base.correctAnswer = mcqCorrect || null;
    } else if (kind === "coding") {
      base.optionsJson = {
        type: "coding",
        points,
        language: lang,
        starterCode,
        timeLimitSec,
        entryPoint: (entryPoint || "solution").trim(),
        tests: tests
          .map((t) => ({ input: t.input, output: t.output }))
          .filter((t) => t.input || t.output),
      };
      base.correctAnswer = null;
    } else if (kind === "case") {
      base.optionsJson = {
        type: "case",
        points,
        rubric,
        maxWords: maxWords === "" ? null : Number(maxWords),
      };
      base.correctAnswer = null;
    } else if (kind === "short") {
      base.optionsJson = { type: "short", points };
      base.correctAnswer = null;
    }
    return base;
  };

  const validate = (): string | null => {
    if (!prompt.trim()) return "Prompt is required.";
    if (points <= 0) return "Points must be a positive number.";
    if (kind === "mcq") {
      const opts = mcqOptions
        .map((o) => o.value.trim())
        .filter(Boolean);
      if (opts.length < 2)
        return "MCQ requires at least two options.";
      if (mcqCorrect && !opts.includes(mcqCorrect))
        return "Correct answer must match one of the options exactly.";
    }
    if (kind === "coding") {
      if (timeLimitSec <= 0)
        return "Time limit must be positive.";
      const nonEmptyTests = tests.filter(
        (t) => t.input || t.output
      );
      if (nonEmptyTests.length === 0)
        return "Add at least one test case for coding questions.";
      if (!entryPoint.trim())
        return "Entry point (function name) is required.";
    }
    if (kind === "case") {
      if (!rubric.trim())
        return "Provide a brief rubric/expected approach.";
      if (
        maxWords !== "" &&
        (!Number.isFinite(Number(maxWords)) ||
          Number(maxWords) <= 0)
      ) {
        return "Word limit must be a positive number or left blank.";
      }
    }
    return null;
  };

  const addQuestion = async () => {
    if (!assessmentId) return;
    const err = validate();
    if (err) return alert(err);

    setCreating(true);
    try {
      const token = localStorage.getItem("bearer_token");
      const resp = await fetch(
        `/api/assessments/${assessmentId}/questions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(buildPayload()),
        }
      );
      if (resp.ok) {
        resetBuilder();
        await loadQuestions();
        toast.success("Question added");
      } else {
        console.error("Add question failed:", await resp.text());
        alert("Failed to add question.");
      }
    } catch (e) {
      console.error(e);
      alert("Something went wrong.");
    } finally {
      setCreating(false);
    }
  };

  // ---------- Render ----------
  if (isPending || loadingOrg || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FEFEFA]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!session?.user || !form || !orgIdFromRoute) return null;

  return (
    <div className="min-h-screen bg-[#FEFEFA] flex">
      <CompanySidebar
        org={org}
        user={session?.user || null}
        onSignOut={handleSignOut}
        active="assessments"
      />

      <main className="flex-1 bg-[#FEFEFA] overflow-y-auto">
        <div className="p-8">
          <div className="max-w-6xl">
            {/* Breadcrumb */}
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
                  href={`/dashboard/organizations/${orgIdFromRoute}/assessments`}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Assessments
                </Link>
                <span className="text-gray-400">&gt;</span>
                <span className="text-gray-900 font-medium">
                  Edit
                </span>
              </nav>
            </div>

            {/* Header w/ Tabs */}
            <div className="bg-white rounded-lg shadow-sm p-5 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">
                    Edit Assessment
                  </h2>
                  <p className="text-sm text-gray-500">{form.title}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={
                      activeTab === "details" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setActiveTab("details")}
                  >
                    Details
                  </Button>
                  <Button
                    variant={
                      activeTab === "questions"
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() => setActiveTab("questions")}
                  >
                    Questions
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={saving}
                    onClick={() => save("draft")}
                  >
                    {saving ? "Saving…" : "Save Draft"}
                  </Button>

                  <Button
                    variant="default"
                    size="sm"
                    disabled={saving}
                    onClick={() => save("publish")}
                  >
                    {saving ? "Publishing…" : "Publish"}
                  </Button>
                </div>
              </div>
            </div>

            {activeTab === "details" ? (
              // ---------- DETAILS TAB ----------
              <div className="bg-white rounded-lg shadow-sm p-5 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={form.type}
                      onValueChange={(v) =>
                        setForm({ ...form, type: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MCQ">MCQ</SelectItem>
                        <SelectItem value="Coding">Coding</SelectItem>
                        <SelectItem value="Case Study">
                          Case Study
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration</Label>
                    <Input
                      id="duration"
                      value={form.duration}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          duration: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={form.status}
                      onValueChange={(v) =>
                        setForm({ ...form, status: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Draft">Draft</SelectItem>
                        <SelectItem value="Published">
                          Published
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="desc">
                    Description (Markdown)
                  </Label>
                  <Input
                    id="desc"
                    value={form.descriptionMd || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        descriptionMd: e.target.value,
                      })
                    }
                    placeholder="Short description for collaborators"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Visibility</Label>
                  <Select
                    value={form.isPublished ? "true" : "false"}
                    onValueChange={(v) =>
                      setForm({
                        ...form,
                        isPublished: v === "true",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">
                        Unpublished
                      </SelectItem>
                      <SelectItem value="true">Published</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => save()} disabled={saving}>
                    {saving ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              </div>
            ) : (
              // ---------- QUESTIONS TAB ----------
              <div className="space-y-6">
                {/* Builder */}
                <div className="bg-white rounded-lg shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-medium text-gray-900">
                        Add Question
                      </h3>
                      <p className="text-xs text-gray-500">
                        MCQ, short, coding or case
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={addQuestion}
                      disabled={creating}
                    >
                      {creating ? "Saving…" : "Save question"}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Editor */}
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label>Question Type</Label>
                        <select
                          className="border rounded h-9 px-2 text-sm"
                          value={kind}
                          onChange={(e) =>
                            setKind(e.target.value as any)
                          }
                        >
                          <option value="mcq">MCQ</option>
                          <option value="short">Short Answer</option>
                          <option value="coding">Coding Task</option>
                          <option value="case">Case Study</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <Label>Prompt</Label>
                        <Textarea
                          rows={4}
                          value={prompt}
                          onChange={(e) =>
                            setPrompt(e.target.value)
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <Label>Points</Label>
                        <Input
                          type="number"
                          min={1}
                          value={points}
                          onChange={(e) =>
                            setPoints(Number(e.target.value || 0))
                          }
                        />
                      </div>

                      {kind === "mcq" && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="m-0">Options</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={addMcqOption}
                            >
                              + Add option
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {mcqOptions.map((opt, idx) => (
                              <div
                                key={opt.id}
                                className="flex items-center gap-2"
                              >
                                <Input
                                  placeholder={`Option ${
                                    idx + 1
                                  }`}
                                  value={opt.value}
                                  onChange={(e) =>
                                    updateMcqOption(
                                      opt.id,
                                      e.target.value
                                    )
                                  }
                                />
                                <Button
                                  type="button"
                                  variant={
                                    mcqCorrect ===
                                      opt.value &&
                                    opt.value.trim()
                                      ? "secondary"
                                      : "outline"
                                  }
                                  size="sm"
                                  onClick={() =>
                                    setMcqCorrect(
                                      opt.value.trim()
                                    )
                                  }
                                  disabled={!opt.value.trim()}
                                >
                                  {mcqCorrect ===
                                  opt.value.trim()
                                    ? "Correct ✓"
                                    : "Mark correct"}
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    removeMcqOption(opt.id)
                                  }
                                  disabled={
                                    mcqOptions.length <= 2
                                  }
                                  title="Remove option"
                                >
                                  ✕
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {kind === "coding" && (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <Label>Language</Label>
                            <select
                              className="border rounded h-9 px-2 text-sm"
                              value={lang}
                              onChange={(e) =>
                                setLang(e.target.value as any)
                              }
                            >
                              <option value="javascript">
                                JavaScript
                              </option>
                              <option value="python">Python</option>
                              <option value="cpp">C++</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <Label>Starter Code (optional)</Label>
                            <Textarea
                              rows={6}
                              value={starterCode}
                              onChange={(e) =>
                                setStarterCode(e.target.value)
                              }
                            />
                          </div>

                          <div className="space-y-1">
                            <Label>Time Limit (seconds)</Label>
                            <Input
                              type="number"
                              min={5}
                              value={timeLimitSec}
                              onChange={(e) =>
                                setTimeLimitSec(
                                  Number(e.target.value || 0)
                                )
                              }
                            />
                          </div>

                          <div className="space-y-1">
                            <Label>
                              Entry point (function name)
                            </Label>
                            <Input
                              placeholder="e.g. twoSum or solution"
                              value={entryPoint}
                              onChange={(e) =>
                                setEntryPoint(e.target.value)
                              }
                            />
                            <p className="text-xs text-gray-500">
                              We will call{" "}
                              <code>
                                {entryPoint || "solution"}
                              </code>
                              (...args) for each test.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="m-0">
                                Test Cases
                              </Label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addTest}
                              >
                                + Add test
                              </Button>
                            </div>
                            {tests.map((t, i) => (
                              <div
                                key={i}
                                className="grid grid-cols-1 md:grid-cols-2 gap-2"
                              >
                                <div className="space-y-1">
                                  <Label className="text-xs">
                                    Input
                                  </Label>
                                  <Textarea
                                    rows={3}
                                    value={t.input}
                                    onChange={(e) =>
                                      updateTest(
                                        i,
                                        "input",
                                        e.target.value
                                      )
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">
                                    Expected Output
                                  </Label>
                                  <Textarea
                                    rows={3}
                                    value={t.output}
                                    onChange={(e) =>
                                      updateTest(
                                        i,
                                        "output",
                                        e.target.value
                                      )
                                    }
                                  />
                                </div>
                                <div className="md:col-span-2 flex justify-end">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      removeTest(i)
                                    }
                                  >
                                    Remove
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {kind === "case" && (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <Label>
                              Rubric / What good looks like
                              (internal)
                            </Label>
                            <Textarea
                              rows={5}
                              value={rubric}
                              onChange={(e) =>
                                setRubric(e.target.value)
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Word Limit (optional)</Label>
                            <Input
                              type="number"
                              min={1}
                              value={maxWords}
                              onChange={(e) => {
                                const v = e.target.value;
                                setMaxWords(
                                  v === "" ? "" : Number(v)
                                );
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right: Live Preview */}
                    <div className="space-y-2">
                      <Label>Preview</Label>
                      <div className="border rounded p-3 bg-gray-50 text-sm">
                        {!prompt.trim() ? (
                          <div className="text-gray-500">
                            Preview will appear here…
                          </div>
                        ) : kind === "mcq" ? (
                          <div>
                            <div className="font-medium mb-2">
                              {prompt}
                            </div>
                            <ul className="space-y-1">
                              {mcqOptions
                                .map((o) => o.value.trim())
                                .filter(Boolean)
                                .map((o) => (
                                  <li key={o}>
                                    <span className="inline-block w-3 h-3 border rounded-full mr-2 align-middle" />
                                    <span
                                      className={
                                        o === mcqCorrect
                                          ? "font-semibold"
                                          : ""
                                      }
                                    >
                                      {o}{" "}
                                      {o === mcqCorrect
                                        ? "(correct)"
                                        : ""}
                                    </span>
                                  </li>
                                ))}
                            </ul>
                            <div className="text-xs text-gray-500 mt-2">
                              Points: {points}
                            </div>
                          </div>
                        ) : kind === "coding" ? (
                          <div>
                            <div className="font-medium mb-2">
                              {prompt}
                            </div>
                            <div className="text-xs text-gray-500 mb-2">
                              Language: {lang} • Time limit:{" "}
                              {timeLimitSec}s • Points: {points}
                              {entryPoint
                                ? ` • Entry: ${entryPoint}`
                                : ""}
                            </div>
                            <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
{starterCode || "// starter code"}
                            </pre>
                            <div className="mt-2 text-xs text-gray-600">
                              Tests:{" "}
                              {
                                tests.filter(
                                  (t) => t.input || t.output
                                ).length
                              }
                            </div>
                          </div>
                        ) : kind === "case" ? (
                          <div>
                            <div className="font-medium mb-2">
                              {prompt}
                            </div>
                            <div className="text-xs text-gray-500">
                              Points: {points}{" "}
                              {maxWords
                                ? `• Word limit: ${maxWords}`
                                : ""}
                            </div>
                            {rubric && (
                              <div className="mt-2">
                                <div className="text-xs font-medium text-gray-700">
                                  Rubric (internal):
                                </div>
                                <div className="text-xs text-gray-600 whitespace-pre-wrap">
                                  {rubric}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <div className="font-medium mb-2">
                              {prompt}
                            </div>
                            <div className="text-xs text-gray-500">
                              Short answer • Points: {points}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Questions list */}
                <div className="bg-white rounded-lg shadow-sm p-5">
                  {loadingQs ? (
                    <div className="py-8 text-sm text-gray-600">
                      Loading…
                    </div>
                  ) : questions.length === 0 ? (
                    <div className="py-8 text-sm text-gray-600">
                      No questions yet. Use{" "}
                      <span className="font-medium">
                        “Save question”
                      </span>{" "}
                      above to create one.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {questions.map((q) => (
                        <div
                          key={q.id}
                          className="border rounded p-3 bg-white"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {q.prompt}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                Type: {q.kind.toUpperCase()} •
                                Points:{" "}
                                {q.optionsJson?.points ?? 1}
                              </div>
                            </div>
                            {/* Future: Edit / Delete per-question */}
                          </div>

                          {q.kind === "mcq" && (
                            <div className="mt-3 text-xs">
                              <div className="text-gray-700 font-medium mb-1">
                                Options:
                              </div>
                              <ul className="list-disc ml-5">
                                {q.optionsJson?.options?.map(
                                  (o: string) => (
                                    <li
                                      key={o}
                                      className={
                                        o === q.correctAnswer
                                          ? "font-semibold"
                                          : ""
                                      }
                                    >
                                      {o}{" "}
                                      {o === q.correctAnswer
                                        ? "(correct)"
                                        : ""}
                                    </li>
                                  )
                                )}
                              </ul>
                            </div>
                          )}

                          {q.kind === "coding" && (
                            <div className="mt-3 text-xs text-gray-700">
                              Language:{" "}
                              {q.optionsJson?.language} • Time
                              limit: {q.optionsJson?.timeLimitSec}
                              s • Tests:{" "}
                              {Array.isArray(
                                q.optionsJson?.tests
                              )
                                ? q.optionsJson.tests.length
                                : 0}
                              {q.optionsJson?.entryPoint
                                ? ` • Entry: ${q.optionsJson.entryPoint}`
                                : ""}
                            </div>
                          )}

                          {q.kind === "case" && (
                            <div className="mt-3 text-xs text-gray-700">
                              {q.optionsJson?.maxWords
                                ? `Word limit: ${q.optionsJson.maxWords} • `
                                : ""}
                              Rubric stored
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={closeCommandPalette}
        orgId={org?.id}
      />
    </div>
  );
}

// ✅ Suspense-wrapped default export so Next 15 is happy with useSearchParams
export default function AssessmentEditPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FEFEFA]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AssessmentEditPageInner />
    </Suspense>
  );
}
