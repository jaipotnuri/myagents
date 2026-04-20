/**
 * Profile — two-panel layout.
 * Left:  CV Viewer (cv.md rendered as formatted readable text)
 * Right: Profile Editor (profile.yml fields, edit/save toggle, completeness bar)
 */
"use client";

import { useEffect, useState } from "react";
import { FileText, User, Edit2, Save, Loader2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProfileFields {
  full_name:   string;
  email:       string;
  location:    string;
  comp_target: string;
  visa_status: string;
  north_star:  string;
}

const EMPTY_PROFILE: ProfileFields = {
  full_name:   "",
  email:       "",
  location:    "",
  comp_target: "",
  visa_status: "",
  north_star:  "",
};

const FIELD_META: { key: keyof ProfileFields; label: string; placeholder: string }[] = [
  { key: "full_name",   label: "Full Name",           placeholder: "Jane Smith" },
  { key: "email",       label: "Email",               placeholder: "jane@example.com" },
  { key: "location",    label: "Location",            placeholder: "San Francisco, CA" },
  { key: "comp_target", label: "Comp Target",         placeholder: "$250K total comp" },
  { key: "visa_status", label: "Visa Status",         placeholder: "US Citizen / H-1B / etc." },
  { key: "north_star",  label: "North Star Goal",     placeholder: "Build AI infrastructure at scale" },
];

// ---------------------------------------------------------------------------
// Markdown renderer (same pattern as Reports page)
// ---------------------------------------------------------------------------

function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const trimmed = line.trim();

        if (trimmed.startsWith("## ")) {
          return (
            <p key={i} className="mt-4 mb-1 text-sm font-semibold text-slate-200 first:mt-0">
              {trimmed.slice(3)}
            </p>
          );
        }
        if (trimmed.startsWith("# ")) {
          return (
            <p key={i} className="mt-4 mb-1 text-base font-bold text-slate-100 first:mt-0">
              {trimmed.slice(2)}
            </p>
          );
        }
        if (trimmed.startsWith("### ")) {
          return (
            <p key={i} className="mt-3 mb-0.5 text-sm font-semibold text-slate-300 first:mt-0">
              {trimmed.slice(4)}
            </p>
          );
        }
        if (trimmed.startsWith("- ")) {
          return (
            <div key={i} className="flex gap-2">
              <span className="mt-[5px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-500" />
              <span className="text-sm text-slate-300">{trimmed.slice(2)}</span>
            </div>
          );
        }
        if (trimmed === "") return <div key={i} className="h-2" />;

        const text = trimmed.replace(/\*\*(.+?)\*\*/g, "$1");
        return (
          <p key={i} className="text-sm leading-relaxed text-slate-300">
            {text}
          </p>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Completeness bar
// ---------------------------------------------------------------------------

function CompletenessBar({ profile }: { profile: ProfileFields }) {
  const total = FIELD_META.length;
  const filled = FIELD_META.filter(({ key }) => profile[key].trim() !== "").length;
  const pct = Math.round((filled / total) * 100);

  const color =
    pct === 100 ? "bg-green-500" :
    pct >= 60   ? "bg-indigo-500" :
                  "bg-yellow-500";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>Profile completeness</span>
        <span className={pct === 100 ? "text-green-400 font-semibold" : ""}>{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-slate-500">
        {filled} of {total} fields filled
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProfilePage() {
  const [cvContent,    setCvContent]    = useState<string>("");
  const [cvDraft,      setCvDraft]      = useState<string>("");
  const [cvEditMode,   setCvEditMode]   = useState(false);
  const [cvSaving,     setCvSaving]     = useState(false);
  const [cvSaveMsg,    setCvSaveMsg]    = useState<string | null>(null);
  const [profile,      setProfile]      = useState<ProfileFields>(EMPTY_PROFILE);
  const [editMode,     setEditMode]     = useState(false);
  const [draft,        setDraft]        = useState<ProfileFields>(EMPTY_PROFILE);
  const [loadingCv,    setLoadingCv]    = useState(true);
  const [loadingProf,  setLoadingProf]  = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [saveMessage,  setSaveMessage]  = useState<string | null>(null);

  // ---- fetch on mount -------------------------------------------------------
  useEffect(() => {
    fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        const p: ProfileFields = {
          full_name:   data.full_name   ?? "",
          email:       data.email       ?? "",
          location:    data.location    ?? "",
          comp_target: data.comp_target ?? "",
          visa_status: data.visa_status ?? "",
          north_star:  data.north_star  ?? "",
        };
        setProfile(p);
        setDraft(p);
        if (data.cvContent) {
          setCvContent(data.cvContent as string);
          setCvDraft(data.cvContent as string);
        }
      })
      .catch(() => {/* keep defaults */})
      .finally(() => {
        setLoadingCv(false);
        setLoadingProf(false);
      });
  }, []);

  // ---- edit / save ----------------------------------------------------------
  function handleEdit() {
    setDraft({ ...profile });
    setEditMode(true);
  }

  function handleCancel() {
    setDraft({ ...profile });
    setEditMode(false);
  }

  async function handleCvSave() {
    setCvSaving(true);
    try {
      const res = await fetch("/api/cv", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: cvDraft }),
      });
      if (!res.ok) throw new Error("Save failed");
      setCvContent(cvDraft);
      setCvEditMode(false);
      setCvSaveMsg("Saved ✓");
    } catch {
      setCvSaveMsg("Save failed");
    } finally {
      setCvSaving(false);
      setTimeout(() => setCvSaveMsg(null), 3000);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error("Save failed");
      setProfile({ ...draft });
      setEditMode(false);
      setSaveMessage("Saved ✓");
    } catch {
      setSaveMessage("Save failed — check the console");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  }

  function handleChange(key: keyof ProfileFields, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  const displayProfile = editMode ? draft : profile;

  // ---------------------------------------------------------------------------
  return (
    <div className="flex h-full flex-col overflow-hidden -m-6">
      {/* Page title bar */}
      <div className="flex-shrink-0 border-b border-slate-700/60 px-6 py-4">
        <h1 className="text-2xl font-bold text-white">Profile</h1>
        <p className="mt-0.5 text-sm text-slate-400">
          CV viewer and profile configuration
        </p>
      </div>

      {/* Two-panel body */}
      <div className="flex flex-1 gap-0 overflow-hidden">
        {/* ---------------------------------------------------------------- */}
        {/* Left panel — CV Viewer / Editor                                   */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex w-1/2 flex-col border-r border-slate-700 overflow-hidden">
          {/* Panel header */}
          <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-700 bg-slate-800/60 px-5 py-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-400" />
              <h2 className="text-sm font-semibold text-slate-200">cv.md</h2>
              {cvSaveMsg && (
                <span className={`text-xs font-medium ${cvSaveMsg.includes("✓") ? "text-green-400" : "text-red-400"}`}>
                  {cvSaveMsg}
                </span>
              )}
            </div>
            {!cvEditMode ? (
              <button
                onClick={() => { setCvDraft(cvContent); setCvEditMode(true); }}
                className="flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-indigo-500 hover:text-indigo-300"
              >
                <Edit2 className="h-3.5 w-3.5" />
                Edit
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCvEditMode(false)}
                  className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCvSave}
                  disabled={cvSaving}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
                >
                  {cvSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save
                </button>
              </div>
            )}
          </div>

          {/* CV content */}
          <div className="flex-1 overflow-y-auto bg-slate-900 px-6 py-5">
            {loadingCv ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-5 w-48 rounded bg-slate-700" />
                <div className="h-3 w-full rounded bg-slate-700/60" />
                <div className="h-3 w-5/6 rounded bg-slate-700/60" />
                <div className="h-3 w-4/6 rounded bg-slate-700/60" />
                <div className="mt-4 h-4 w-32 rounded bg-slate-700" />
                <div className="h-3 w-full rounded bg-slate-700/60" />
                <div className="h-3 w-3/4 rounded bg-slate-700/60" />
              </div>
            ) : cvEditMode ? (
              <textarea
                value={cvDraft}
                onChange={(e) => setCvDraft(e.target.value)}
                className="h-full w-full resize-none bg-transparent font-mono text-sm text-slate-200 placeholder-slate-600 focus:outline-none"
                placeholder="# Your Name&#10;&#10;## Summary&#10;..."
                spellCheck={false}
              />
            ) : cvContent ? (
              <MarkdownRenderer content={cvContent} />
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="h-10 w-10 text-slate-600 mb-3 opacity-40" />
                <p className="text-sm font-medium text-slate-500">cv.md not found</p>
                <p className="mt-1 text-xs text-slate-600">
                  Place cv.md in your career-ops directory
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Right panel — Profile Editor                                      */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex w-1/2 flex-col overflow-hidden">
          {/* Panel header */}
          <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-700 bg-slate-800/60 px-5 py-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-indigo-400" />
              <h2 className="text-sm font-semibold text-slate-200">profile.yml</h2>
            </div>
            {!editMode ? (
              <button
                onClick={handleEdit}
                className="flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-indigo-500 hover:text-indigo-300"
              >
                <Edit2 className="h-3.5 w-3.5" />
                Edit
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancel}
                  className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Save
                </button>
              </div>
            )}
          </div>

          {/* Fields */}
          <div className="flex-1 overflow-y-auto bg-slate-900 px-5 py-5">
            {loadingProf ? (
              <div className="space-y-4 animate-pulse">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="h-3 w-24 rounded bg-slate-700" />
                    <div className="h-9 w-full rounded-lg bg-slate-800" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {FIELD_META.map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="mb-1.5 block text-xs font-medium text-slate-400 uppercase tracking-wide">
                      {label}
                    </label>
                    {editMode ? (
                      key === "north_star" ? (
                        <textarea
                          value={displayProfile[key]}
                          onChange={(e) => handleChange(key, e.target.value)}
                          placeholder={placeholder}
                          rows={3}
                          className="w-full resize-none rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
                        />
                      ) : (
                        <input
                          type={key === "email" ? "email" : "text"}
                          value={displayProfile[key]}
                          onChange={(e) => handleChange(key, e.target.value)}
                          placeholder={placeholder}
                          className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
                        />
                      )
                    ) : (
                      <div className="min-h-[36px] rounded-lg bg-slate-900/50 border border-slate-800 px-3 py-2 text-sm text-slate-300">
                        {displayProfile[key] || (
                          <span className="text-slate-600 italic">{placeholder}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer — save message + completeness bar */}
          <div className="flex-shrink-0 border-t border-slate-700 bg-slate-800/60 px-5 py-4 space-y-3">
            {saveMessage && (
              <p className={`text-xs font-medium ${saveMessage.startsWith("Saved") ? "text-green-400" : "text-red-400"}`}>
                {saveMessage}
              </p>
            )}
            <CompletenessBar profile={editMode ? draft : profile} />
          </div>
        </div>
      </div>
    </div>
  );
}
