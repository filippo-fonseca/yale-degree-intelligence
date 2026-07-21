"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Command as CommandIcon,
  CornerDownLeft,
  FileText,
  GraduationCap,
  MonitorCog,
  BarChart2,
  Users,
  Building2,
  Upload,
  Plus,
  SunMoon,
  BookOpen,
  ListChecks,
  Layers,
  Award,
} from "lucide-react";
import { Course } from "@/lib/types";
import { ALL_COURSES, getCourseNameFromCode } from "@/lib/courseCatalog";
import { majorRequirements, MAJORS } from "@/lib/majors";
import {
  certificateRequirements,
  CERTIFICATES,
} from "@/lib/certificates";

type Group =
  | "Actions"
  | "Jump to"
  | "My courses"
  | "Major requirements"
  | "Certificate requirements"
  | "Distributionals"
  | "Course catalog";

const GROUP_ORDER: Group[] = [
  "Actions",
  "Jump to",
  "My courses",
  "Major requirements",
  "Certificate requirements",
  "Distributionals",
  "Course catalog",
];

type PaletteItem = {
  id: string;
  group: Group;
  title: string;
  subtitle?: string;
  badge?: string;
  icon: ReactNode;
  keywords: string;
  onRun: () => void;
};

const DISTRIBUTIONALS: { code: string; name: string }[] = [
  { code: "Hu", name: "Humanities & Arts" },
  { code: "Sc", name: "Sciences" },
  { code: "So", name: "Social Sciences" },
  { code: "QR", name: "Quantitative Reasoning" },
  { code: "WR", name: "Writing" },
  { code: "L", name: "Foreign Language (L1–L5)" },
];

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  selectedMajor: string;
  selectedCertificate?: string;
  hasData: boolean;
  onNavigate: (tabId: string) => void;
  onImportTranscript: () => void;
  onManualAdd: () => void;
  onToggleTheme: () => void;
}

export default function CommandPalette({
  isOpen,
  onClose,
  courses,
  selectedMajor,
  selectedCertificate = "",
  hasData,
  onNavigate,
  onImportTranscript,
  onManualAdd,
  onToggleTheme,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Reset state whenever the palette opens
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setActiveIndex(0);
      // focus after the open animation kicks in
      const t = setTimeout(() => inputRef.current?.focus(), 40);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const run = (fn: () => void) => {
    onClose();
    // defer the side-effect so the modal unmount doesn't swallow it
    setTimeout(fn, 0);
  };

  // Build the full item set (unfiltered)
  const items = useMemo<PaletteItem[]>(() => {
    const out: PaletteItem[] = [];

    // ---- Actions ----
    out.push({
      id: "action-import",
      group: "Actions",
      title: hasData ? "Import a new transcript" : "Import your transcript",
      subtitle: "Upload a PDF to add your courses",
      icon: <Upload size={15} />,
      keywords: "import transcript upload pdf add courses new",
      onRun: () => run(onImportTranscript),
    });
    out.push({
      id: "action-manual",
      group: "Actions",
      title: "Add a course manually",
      subtitle: "Search the catalog and add by hand",
      icon: <Plus size={15} />,
      keywords: "add course manual manually entry new",
      onRun: () => run(onManualAdd),
    });
    out.push({
      id: "action-theme",
      group: "Actions",
      title: "Toggle light / dark theme",
      icon: <SunMoon size={15} />,
      keywords: "theme dark light mode toggle appearance",
      onRun: () => run(onToggleTheme),
    });

    // ---- Jump to (navigation) ----
    const nav: {
      id: string;
      label: string;
      icon: ReactNode;
      needsData?: boolean;
    }[] = [
      { id: "upload", label: "My courses", icon: <FileText size={15} /> },
      { id: "major", label: "My major", icon: <GraduationCap size={15} /> },
      {
        id: "certificate",
        label: "My certificates",
        icon: <Award size={15} />,
      },
      { id: "simulator", label: "Simulator", icon: <MonitorCog size={15} /> },
      {
        id: "stats",
        label: "Academic stats",
        icon: <BarChart2 size={15} />,
        needsData: true,
      },
      {
        id: "friends",
        label: "Friends",
        icon: <Users size={15} />,
        needsData: true,
      },
      {
        id: "distributionals",
        label: "Distributionals",
        icon: <Building2 size={15} />,
        needsData: true,
      },
    ];
    nav
      .filter((n) => !n.needsData || hasData)
      .forEach((n) => {
        out.push({
          id: `nav-${n.id}`,
          group: "Jump to",
          title: n.label,
          icon: n.icon,
          keywords: `go to open ${n.label} ${n.id}`,
          onRun: () => run(() => onNavigate(n.id)),
        });
      });

    // ---- My courses ----
    const seen = new Set<string>();
    courses
      .filter((c) => !c.skipped)
      .forEach((c) => {
        if (seen.has(c.code)) return;
        seen.add(c.code);
        const name = getCourseNameFromCode(c.code) || "Course";
        const status =
          c.status === "in-progress"
            ? "In progress"
            : c.grade
              ? c.grade
              : "Completed";
        out.push({
          id: `course-${c.id}`,
          group: "My courses",
          title: c.code,
          subtitle: name,
          badge: status,
          icon: <BookOpen size={15} />,
          keywords: `${c.code} ${name} ${c.semester} ${c.year}`.toLowerCase(),
          onRun: () => run(() => onNavigate("upload")),
        });
      });

    // ---- Major requirements ----
    const major = selectedMajor ? majorRequirements[selectedMajor] : undefined;
    if (major) {
      const majorName = MAJORS[selectedMajor] || major.name;
      major.requirements.forEach((req, i) => {
        out.push({
          id: `req-${i}`,
          group: "Major requirements",
          title: req.name,
          subtitle: `${req.required} course${req.required === 1 ? "" : "s"} · ${majorName}`,
          icon: <ListChecks size={15} />,
          keywords: `${req.name} ${majorName} requirement`.toLowerCase(),
          onRun: () => run(() => onNavigate("major")),
        });
      });
    }

    // ---- Certificate requirements ----
    const certificate = selectedCertificate
      ? certificateRequirements[selectedCertificate]
      : undefined;
    if (certificate) {
      const certName =
        CERTIFICATES[selectedCertificate] || certificate.name;
      certificate.requirements.forEach((req, i) => {
        out.push({
          id: `cert-req-${i}`,
          group: "Certificate requirements",
          title: req.name,
          subtitle: `${req.required} course${req.required === 1 ? "" : "s"} · ${certName}`,
          icon: <Award size={15} />,
          keywords: `${req.name} ${certName} certificate requirement`.toLowerCase(),
          onRun: () => run(() => onNavigate("certificate")),
        });
      });
    }

    // ---- Distributionals ----
    DISTRIBUTIONALS.forEach((d) => {
      out.push({
        id: `dist-${d.code}`,
        group: "Distributionals",
        title: d.name,
        subtitle: `Distributional · ${d.code}`,
        badge: d.code,
        icon: <Layers size={15} />,
        keywords: `${d.name} ${d.code} distributional requirement`.toLowerCase(),
        onRun: () => run(() => onNavigate("distributionals")),
      });
    });

    return out;
  }, [
    courses,
    selectedMajor,
    hasData,
    onNavigate,
    onImportTranscript,
    onManualAdd,
    onToggleTheme,
    selectedCertificate,
  ]);

  // Filter + assemble visible, grouped, flat list
  const flat = useMemo(() => {
    const q = query.trim().toLowerCase();
    const tokens = q.split(/\s+/).filter(Boolean);
    const matches = (it: PaletteItem) => {
      const hay = `${it.title} ${it.subtitle ?? ""} ${it.keywords}`.toLowerCase();
      return tokens.every((t) => hay.includes(t));
    };

    let pool: PaletteItem[];
    if (!q) {
      // Empty state: just actions + navigation
      pool = items.filter(
        (it) => it.group === "Actions" || it.group === "Jump to",
      );
    } else {
      pool = items.filter(matches);
      // Add catalog matches (kept out of the unfiltered set for perf)
      if (tokens.length) {
        const catalog: PaletteItem[] = [];
        for (const c of ALL_COURSES) {
          if (catalog.length >= 6) break;
          const hay =
            `${c.codes.join(" ")} ${c.name} ${c.department}`.toLowerCase();
          if (tokens.every((t) => hay.includes(t))) {
            catalog.push({
              id: `cat-${c.codes[0]}`,
              group: "Course catalog",
              title: c.codes[0],
              subtitle: c.name,
              badge: c.distributionals?.join(" ") || undefined,
              icon: <Search size={15} />,
              keywords: hay,
              onRun: () => run(() => onManualAdd()),
            });
          }
        }
        pool = [...pool, ...catalog];
      }
    }

    // Cap noisy groups
    const caps: Partial<Record<Group, number>> = {
      "My courses": 6,
      "Major requirements": 8,
      "Course catalog": 6,
    };
    const result: PaletteItem[] = [];
    for (const g of GROUP_ORDER) {
      const inGroup = pool.filter((it) => it.group === g);
      const cap = caps[g];
      result.push(...(cap ? inGroup.slice(0, cap) : inGroup));
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, query]);

  // Clamp active index when the list changes
  useEffect(() => {
    setActiveIndex((i) => Math.min(i, Math.max(0, flat.length - 1)));
  }, [flat.length]);

  // Keep the active item scrolled into view
  useEffect(() => {
    itemRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (flat.length ? (i + 1) % flat.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) =>
        flat.length ? (i - 1 + flat.length) % flat.length : 0,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      flat[activeIndex]?.onRun();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  // Render with group headers interleaved
  let renderIndex = -1;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[1000] flex items-start justify-center bg-black/50 p-4 pt-[12vh] backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.97, y: -8, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.97, y: -8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 460, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={onKeyDown}
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl ring-1 ring-black/5 dark:border-white/10 dark:bg-[#0c0c0e] dark:ring-white/5"
          >
            {/* Search row */}
            <div className="flex items-center gap-3 border-b border-gray-100 px-4 dark:border-white/[0.06]">
              <Search
                size={18}
                className="shrink-0 text-gray-400 dark:text-gray-500"
              />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                placeholder="Search courses, requirements, actions…"
                className="w-full bg-transparent py-4 text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-white dark:placeholder:text-gray-500"
              />
              <kbd className="hidden shrink-0 items-center rounded-md border border-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 dark:border-white/10 dark:text-gray-500 sm:flex">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div
              ref={listRef}
              className="max-h-[56vh] overflow-y-auto overflow-x-hidden py-2"
            >
              {flat.length === 0 && (
                <div className="px-4 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
                  No results for{" "}
                  <span className="font-medium text-gray-600 dark:text-gray-300">
                    “{query}”
                  </span>
                </div>
              )}

              {GROUP_ORDER.map((group) => {
                const groupItems = flat.filter((it) => it.group === group);
                if (groupItems.length === 0) return null;
                return (
                  <div key={group} className="mb-1">
                    <div className="px-4 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      {group}
                    </div>
                    {groupItems.map((it) => {
                      renderIndex += 1;
                      const idx = renderIndex;
                      const active = idx === activeIndex;
                      return (
                        <button
                          key={it.id}
                          ref={(el) => {
                            itemRefs.current[idx] = el;
                          }}
                          onMouseMove={() => setActiveIndex(idx)}
                          onClick={() => it.onRun()}
                          className={`mx-2 flex w-[calc(100%-1rem)] items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                            active
                              ? "bg-pink-50 dark:bg-pink-500/10"
                              : "hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                          }`}
                        >
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
                              active
                                ? "border-pink-200 bg-white text-pink-600 dark:border-pink-500/30 dark:bg-pink-500/15 dark:text-pink-300"
                                : "border-gray-200 bg-gray-50 text-gray-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-400"
                            }`}
                          >
                            {it.icon}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">
                              {it.title}
                            </span>
                            {it.subtitle && (
                              <span className="block truncate text-xs text-gray-400 dark:text-gray-500">
                                {it.subtitle}
                              </span>
                            )}
                          </span>
                          {it.badge && (
                            <span className="shrink-0 rounded-md border border-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:border-white/10 dark:text-gray-400">
                              {it.badge}
                            </span>
                          )}
                          {active && (
                            <CornerDownLeft
                              size={14}
                              className="shrink-0 text-pink-400"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2.5 text-[11px] text-gray-400 dark:border-white/[0.06] dark:text-gray-500">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-gray-200 px-1 dark:border-white/10">
                    ↑
                  </kbd>
                  <kbd className="rounded border border-gray-200 px-1 dark:border-white/10">
                    ↓
                  </kbd>
                  navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-gray-200 px-1 dark:border-white/10">
                    ↵
                  </kbd>
                  select
                </span>
              </div>
              <span className="flex items-center gap-1">
                <CommandIcon size={11} /> K
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
