"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  BrainCircuit,
  Briefcase,
  CalendarDays,
  Code,
  Cpu,
  FileText,
  Grid3x3,
  Hexagon,
  LayoutDashboard,
  ListChecks,
  Mail,
  Menu,
  Moon,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Shield,
  SlidersHorizontal,
  Sun,
  Bell,
  X,
  Terminal,
  Users,
  Folder,
  Globe
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { BoardColumn, type JobApplication } from "@/types";

const COLUMN_ORDER: BoardColumn[] = [
  BoardColumn.WISHLIST,
  BoardColumn.APPLIED,
  BoardColumn.ASSESSMENT,
  BoardColumn.INTERVIEW,
  BoardColumn.OUTCOME,
];

const KANBAN_JOBS_STORAGE_KEY = "kanban-jobs";
const KANBAN_EVENTS_STORAGE_KEY = "kanban-events";

function isValidStoredJob(item: unknown): item is JobApplication {
  if (!item || typeof item !== "object") return false;
  const o = item as Record<string, unknown>;
  if (typeof o.id !== "string" || !o.id) return false;
  if (typeof o.company !== "string" || typeof o.role !== "string") return false;
  if (
    typeof o.status !== "string" ||
    !COLUMN_ORDER.includes(o.status as BoardColumn)
  ) {
    return false;
  }
  if (o.resumeVersion !== undefined && typeof o.resumeVersion !== "string") {
    return false;
  }
  if (o.deadline !== undefined && typeof o.deadline !== "string") return false;
  if (o.interviewNotes !== undefined && typeof o.interviewNotes !== "string") {
    return false;
  }
  if (o.prepTags !== undefined) {
    if (
      !Array.isArray(o.prepTags) ||
      !o.prepTags.every((t) => typeof t === "string")
    ) {
      return false;
    }
  }
  return true;
}

function tryParseStoredJobs(raw: string | null): JobApplication[] | null {
  if (raw == null || raw === "") return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data) || data.length === 0) return null;
    if (!data.every(isValidStoredJob)) return null;
    return data;
  } catch {
    return null;
  }
}

const initialMockData: JobApplication[] = [
  {
    id: "qc-1",
    company: "Qualcomm",
    role: "Algorithm Engineer",
    status: BoardColumn.WISHLIST,
    resumeVersion: "Algo_Focus_v1",
    prepTags: ["DSP", "5G PHY", "C++"],
  },
  {
    id: "ap-1",
    company: "Apple",
    role: "ECE Intern",
    status: BoardColumn.APPLIED,
    resumeVersion: "Intern_HW",
    deadline: "2026-05-18",
    prepTags: ["Verilog", "Signal Integrity"],
  },
  {
    id: "me-1",
    company: "Meta",
    role: "Software Engineer Intern",
    status: BoardColumn.ASSESSMENT,
    resumeVersion: "SWE_Intern",
    deadline: "2026-04-24",
    prepTags: ["System Design", "Graphs"],
  },
  {
    id: "nv-1",
    company: "NVIDIA",
    role: "Deep Learning Intern",
    status: BoardColumn.ASSESSMENT,
    resumeVersion: "ML_Focus",
    deadline: "2026-04-26",
    prepTags: ["CUDA", "PyTorch"],
  },
  {
    id: "go-1",
    company: "Google",
    role: "Algorithm Engineer",
    status: BoardColumn.INTERVIEW,
    prepTags: ["HashMap", "Dynamic Programming"],
  },
];

function groupByColumn(
  items: JobApplication[],
): Record<BoardColumn, JobApplication[]> {
  const buckets: Record<BoardColumn, JobApplication[]> = {
    [BoardColumn.WISHLIST]: [],
    [BoardColumn.APPLIED]: [],
    [BoardColumn.ASSESSMENT]: [],
    [BoardColumn.INTERVIEW]: [],
    [BoardColumn.OUTCOME]: [],
  };
  for (const job of items) {
    buckets[job.status].push(job);
  }
  return buckets;
}

function flattenByColumnOrder(jobs: JobApplication[]): JobApplication[] {
  return COLUMN_ORDER.flatMap((col) => jobs.filter((j) => j.status === col));
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <div
        className="h-10 w-10 shrink-0 rounded-full bg-gray-200/80 dark:bg-white/10"
        aria-hidden
      />
    );
  }
  const isDark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-white/80 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-200"
      aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      {isDark ? (
        <Sun size={20} strokeWidth={2} />
      ) : (
        <Moon size={20} strokeWidth={2} />
      )}
    </button>
  );
}

const STATUS_PROGRESS: Record<BoardColumn, number> = {
  [BoardColumn.WISHLIST]: 22,
  [BoardColumn.APPLIED]: 38,
  [BoardColumn.ASSESSMENT]: 55,
  [BoardColumn.INTERVIEW]: 72,
  [BoardColumn.OUTCOME]: 100,
};

type RoleVisual = {
  Icon: LucideIcon;
  cardBg: string;
  iconBg: string;
  iconColor: string;
  badgeBg: string;
  progressTrack: string;
  progressFill: string;
};

type ScheduleEvent = {
  id: string;
  title: string;
  category: "INTERVIEWS" | "ASSESSMENTS" | "ACADEMICS" | "CODING PREP";
  startTime: number;
  duration: number;
  color: "indigo" | "orange" | "blue";
  dateString: string;
  isLinked?: boolean;
};

const todayStr = new Date().toISOString().split("T")[0];

const initialScheduleEvents: ScheduleEvent[] = [
  { id: "evt-1", title: "Qualcomm Technical Phone Screen", category: "INTERVIEWS", startTime: 9.5, duration: 1.5, color: "indigo", dateString: todayStr },
  { id: "evt-2", title: "Amazon HackerRank OA", category: "ASSESSMENTS", startTime: 11.0, duration: 3.0, color: "orange", dateString: todayStr },
  { id: "evt-3", title: "Treehouse App Dev / Portfolio", category: "CODING PREP", startTime: 14.0, duration: 2.0, color: "blue", dateString: todayStr },
  { id: "evt-4", title: "ECE 251B Final Project Meeting", category: "ACADEMICS", startTime: 12.0, duration: 2.5, color: "indigo", dateString: todayStr },
];

type SemiCircleChartProps = {
  percentage: number;
  color: string;
  label: string;
  shadowColor: string;
  filterId: string;
  legendCompleted?: string;
  legendRemaining?: string;
};

const TIMELINE_START_HOUR = 9;
const TIMELINE_HOURS_SPAN = 8;
const TIMELINE_CATEGORIES: ScheduleEvent["category"][] = [
  "INTERVIEWS",
  "ASSESSMENTS",
  "ACADEMICS",
  "CODING PREP",
];
const COMPANY_OFFICE_LOCATION: Record<string, string> = {
  Qualcomm: "San Diego",
  Apple: "Cupertino",
  Meta: "Menlo Park",
  NVIDIA: "Santa Clara",
  Google: "Mountain View",
  Amazon: "Seattle",
  Illumina: "San Diego",
  ServiceNow: "Santa Clara",
  Sony: "San Diego",
};

const STATUS_FILTER_ALL = "ALL" as const;
type ApplicationsStatusFilter = typeof STATUS_FILTER_ALL | BoardColumn;

function companyInitialFromName(name: string): string {
  const t = name.trim();
  if (!t) return "?";
  const ch = Array.from(t)[0] ?? "?";
  return /^[a-z]$/i.test(ch) ? ch.toUpperCase() : ch;
}

function isSdeCarouselRole(role: string): boolean {
  const r = role.toLowerCase();
  return (
    r.includes("software development engineer") ||
    r.includes("software engineer") ||
    r.includes("sde") ||
    r.includes("developer") ||
    r.includes("开发")
  );
}

function isAlgoCarouselRole(role: string): boolean {
  const r = role.toLowerCase();
  if (isSdeCarouselRole(role)) return false;
  return (
    r.includes("algorithm") ||
    /\bai\b/i.test(role) ||
    r.includes("deep learning") ||
    r.includes("machine learning") ||
    r.includes("算法") ||
    r.includes("深度学习")
  );
}

function carouselVisualFlavor(
  role: string,
): "algo" | "sde" | "neutral" {
  if (isSdeCarouselRole(role)) return "sde";
  if (isAlgoCarouselRole(role)) return "algo";
  return "neutral";
}

function officeLine(company: string): string {
  const loc = COMPANY_OFFICE_LOCATION[company] ?? "Remote";
  return `${company} — ${loc}`;
}

function formatScheduleHour(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function getEventPositionStyle(startTime: number, duration: number) {
  const left = ((startTime - TIMELINE_START_HOUR) / TIMELINE_HOURS_SPAN) * 100;
  const width = (duration / TIMELINE_HOURS_SPAN) * 100;
  return { left: `${left}%`, width: `${width}%` };
}

function normalizeDeadlineDate(deadline?: string): string | null {
  const raw = deadline?.trim();
  if (!raw) return null;
  return raw.length >= 10 ? raw.slice(0, 10) : raw;
}

function mapJobStatusToTimelineCategory(
  status: BoardColumn,
): ScheduleEvent["category"] {
  if (status === BoardColumn.INTERVIEW) return "INTERVIEWS";
  if (status === BoardColumn.ASSESSMENT) return "ASSESSMENTS";
  return "CODING PREP";
}

function linkedEventColor(job: JobApplication): ScheduleEvent["color"] {
  if (job.status === BoardColumn.INTERVIEW) return "indigo";
  if (job.status === BoardColumn.ASSESSMENT) return "orange";
  return "blue";
}

function buildLinkedScheduleEvents(
  jobs: JobApplication[],
  currentDateStr: string,
  allEvents: ScheduleEvent[],
): ScheduleEvent[] {
  const dueToday = jobs.filter((j) => {
    const d = normalizeDeadlineDate(j.deadline);
    return d === currentDateStr;
  });

  const manualsToday = allEvents.filter(
    (e) => e.dateString === currentDateStr && !e.isLinked,
  );

  let nextStart = TIMELINE_START_HOUR;
  if (manualsToday.length > 0) {
    const latestEnd = Math.max(
      ...manualsToday.map((e) => e.startTime + e.duration),
    );
    nextStart = Math.max(TIMELINE_START_HOUR, latestEnd);
  }

  return dueToday.map((job) => {
    const startTime = nextStart;
    nextStart += 1.5;
    return {
      id: `linked-job-${job.id}`,
      title: `[Deadline] ${job.company} ${job.role}`,
      category: mapJobStatusToTimelineCategory(job.status),
      startTime,
      duration: 1.5,
      color: linkedEventColor(job),
      dateString: currentDateStr,
      isLinked: true,
    };
  });
}

function getTimelineColorClasses(color: ScheduleEvent["color"]) {
  if (color === "indigo") {
    return {
      pillBg: "bg-indigo-50",
      title: "text-indigo-900/90",
    };
  }
  if (color === "orange") {
    return {
      pillBg: "bg-orange-50",
      title: "text-orange-900/85",
    };
  }
  return {
    pillBg: "bg-blue-50",
    title: "text-blue-900/85",
  };
}

function SemiCircleChart({
  percentage,
  color,
  label,
  shadowColor,
  filterId,
  legendCompleted = "Completed",
  legendRemaining = "Remaining",
}: SemiCircleChartProps) {
  const clamped = Math.max(0, Math.min(100, percentage));
  const halfCircumference = 40 * Math.PI;
  const dashOffset = halfCircumference * (1 - clamped / 100);
  const arcPath = "M 10 50 A 40 40 0 0 1 90 50";
  const completedLegendColor =
    color === "text-green-500" ? "bg-green-500" : "bg-indigo-500";

  return (
    <div className="w-full">
      <div className="relative mx-auto w-full max-w-[220px]">
        <svg viewBox="0 0 100 55" className={`w-full overflow-visible ${color}`}>
          <defs>
            <filter id={filterId} x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="8" />
            </filter>
          </defs>

          <path
            d={arcPath}
            fill="none"
            stroke="#F3F4F6"
            strokeWidth="12"
            strokeLinecap="round"
          />

          <path
            d={arcPath}
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={halfCircumference}
            strokeDashoffset={dashOffset}
            className={`${shadowColor} opacity-45`}
            filter={`url(#${filterId})`}
          />

          <path
            d={arcPath}
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={halfCircumference}
            strokeDashoffset={dashOffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        <div className="absolute inset-x-0 bottom-1 flex flex-col items-center">
          <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            {clamped}%
          </p>
          <p className="text-[10px] font-medium text-gray-400">{label}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-4 text-[10px] text-gray-400">
        <span className="inline-flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-sm ${completedLegendColor}`} />
          {legendCompleted}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-gray-300" />
          {legendRemaining}
        </span>
      </div>
    </div>
  );
}

function formatCardDate(deadline?: string): string {
  const d = deadline?.trim();
  if (!d) return "Next Deadline: TBD";
  return `Next Deadline: ${d}`;
}

function getRoleVisual(role: string): RoleVisual {
  const lower = role.toLowerCase();
  if (
    lower.includes("algorithm") ||
    /\bai\b/i.test(role) ||
    role.includes("人工智能")
  ) {
    return {
      Icon: BrainCircuit,
      cardBg:
        "bg-purple-50 dark:bg-purple-950/25 dark:ring-1 dark:ring-purple-900/30",
      iconBg: "bg-purple-100 dark:bg-purple-500/20",
      iconColor: "text-purple-600 dark:text-purple-300",
      badgeBg: "bg-purple-50 dark:bg-purple-500/10",
      progressTrack: "bg-purple-100/90 dark:bg-purple-900/40",
      progressFill: "bg-purple-400 dark:bg-purple-400",
    };
  }
  if (
    lower.includes("software") ||
    lower.includes("sde") ||
    role.includes("开发")
  ) {
    return {
      Icon: Code,
      cardBg:
        "bg-blue-50 dark:bg-blue-950/25 dark:ring-1 dark:ring-blue-900/30",
      iconBg: "bg-blue-100 dark:bg-blue-500/20",
      iconColor: "text-blue-600 dark:text-blue-300",
      badgeBg: "bg-blue-50 dark:bg-blue-500/10",
      progressTrack: "bg-blue-100/90 dark:bg-blue-900/40",
      progressFill: "bg-blue-400 dark:bg-blue-400",
    };
  }
  if (lower.includes("security")) {
    return {
      Icon: Shield,
      cardBg:
        "bg-orange-50 dark:bg-orange-950/25 dark:ring-1 dark:ring-orange-900/25",
      iconBg: "bg-orange-100 dark:bg-orange-500/20",
      iconColor: "text-orange-600 dark:text-orange-300",
      badgeBg: "bg-orange-50 dark:bg-orange-500/10",
      progressTrack: "bg-orange-100/90 dark:bg-orange-900/40",
      progressFill: "bg-orange-400 dark:bg-orange-400",
    };
  }
  if (lower.includes("embedded") || lower.includes("hardware")) {
    return {
      Icon: Cpu,
      cardBg:
        "bg-emerald-50 dark:bg-emerald-950/25 dark:ring-1 dark:ring-emerald-900/25",
      iconBg: "bg-emerald-100 dark:bg-emerald-500/20",
      iconColor: "text-emerald-600 dark:text-emerald-300",
      badgeBg: "bg-emerald-50 dark:bg-emerald-500/10",
      progressTrack: "bg-emerald-100/90 dark:bg-emerald-900/40",
      progressFill: "bg-emerald-400 dark:bg-emerald-400",
    };
  }
  return {
    Icon: Briefcase,
    cardBg: "bg-gray-50 dark:bg-gray-800/35 dark:ring-1 dark:ring-gray-700/40",
    iconBg: "bg-slate-100 dark:bg-slate-500/15",
    iconColor: "text-slate-700 dark:text-slate-200",
    badgeBg: "bg-slate-50 dark:bg-slate-500/10",
    progressTrack: "bg-slate-200/90 dark:bg-slate-700/50",
    progressFill: "bg-slate-500 dark:bg-slate-400",
  };
}

/** Presentation-only tint aligned with `getRoleVisual(...).cardBg` for glass cards */
function roleGlassAccent(cardBg: string): string {
  if (cardBg.includes("purple")) {
    return "from-purple-400/[0.14] via-white/[0.42] to-indigo-400/[0.11] dark:from-purple-600/[0.22] dark:via-gray-950/[0.38] dark:to-indigo-950/[0.26]";
  }
  if (cardBg.includes("blue")) {
    return "from-blue-400/[0.14] via-white/[0.42] to-cyan-400/[0.10] dark:from-blue-600/[0.22] dark:via-gray-950/[0.38] dark:to-cyan-950/[0.22]";
  }
  if (cardBg.includes("orange")) {
    return "from-orange-400/[0.13] via-white/[0.42] to-amber-300/[0.10] dark:from-orange-600/[0.20] dark:via-gray-950/[0.38] dark:to-amber-950/[0.22]";
  }
  if (cardBg.includes("emerald")) {
    return "from-emerald-400/[0.13] via-white/[0.42] to-teal-400/[0.09] dark:from-emerald-600/[0.18] dark:via-gray-950/[0.38] dark:to-teal-950/[0.22]";
  }
  return "from-gray-400/[0.09] via-white/[0.38] to-slate-300/[0.07] dark:from-gray-600/[0.16] dark:via-gray-950/[0.42] dark:to-gray-800/[0.24]";
}

function IceCreamApplicationCard({
  job,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  job: JobApplication;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (id: string, newStatus: BoardColumn) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const visual = getRoleVisual(job.role);
  const { Icon } = visual;

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [menuOpen]);

  const progressPct = STATUS_PROGRESS[job.status];
  const tags = job.prepTags?.length
    ? job.prepTags
    : job.resumeVersion
      ? [job.resumeVersion]
      : [];

  return (
    <article className="relative flex min-h-[220px] h-auto min-w-[280px] max-w-[320px] shrink-0 snap-center flex-col rounded-[24px] border border-white/80 bg-white/80 p-5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-[#111C44]/80 lg:min-w-[320px]">
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 rounded-[24px] bg-gradient-to-br ${roleGlassAccent(visual.cardBg)}`}
      />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <div className="absolute right-4 top-4 z-20">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-300"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label="More actions"
          >
            <MoreHorizontal className="h-5 w-5" strokeWidth={2} aria-hidden />
          </button>

          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-8 z-50 min-w-[9.5rem] overflow-hidden rounded-xl border border-gray-100 bg-white/95 shadow-2xl backdrop-blur-md dark:border-white/10 dark:bg-gray-950/95"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Move to Stage
              </div>
              {COLUMN_ORDER.filter((col) => col !== job.status).map((col) => (
                <button
                  key={col}
                  type="button"
                  role="menuitem"
                  className="block w-full px-3 py-1.5 text-left text-[13px] font-medium text-gray-700 hover:bg-gray-50 hover:text-indigo-600 dark:text-gray-200 dark:hover:bg-white/10 dark:hover:text-indigo-300"
                  onClick={() => {
                    setMenuOpen(false);
                    onStatusChange(job.id, col);
                  }}
                >
                  {col}
                </button>
              ))}

              <div className="my-1 border-t border-gray-100 dark:border-white/10" />

              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-1.5 text-left text-[13px] font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/10"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit();
                }}
              >
                Edit Details...
              </button>
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-1.5 text-left text-[13px] font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-white/10"
                onClick={() => {
                  setMenuOpen(false);
                  if (window.confirm("Are you sure you want to delete this application?")) {
                    onDelete();
                  }
                }}
              >
                Delete
              </button>
            </div>
          ) : null}
        </div>

        <div className="flex items-start justify-between gap-3 pr-10">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] shadow-sm transition-transform hover:scale-105 ${visual.iconBg} ${visual.iconColor}`}
          >
            <Icon size={24} strokeWidth={2} aria-hidden />
          </div>
        </div>

        <div className="mt-3 min-w-0">
          <p className="mb-1 truncate text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
            {job.company}
          </p>
          <p className="line-clamp-2 text-[17px] font-extrabold leading-tight text-gray-900 dark:text-white">
            {job.role}
          </p>
        </div>

        {tags.length > 0 ? (
          <div className="mt-3 mb-3 flex flex-wrap gap-2">
            {tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className={`inline-block rounded-md px-2.5 py-1 text-[10px] font-bold ${visual.badgeBg} ${visual.iconColor}`}
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-auto flex w-full items-center justify-between gap-3 border-t border-gray-200/50 pt-2.5 dark:border-white/10">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <Calendar
              className="h-3 w-3 shrink-0 text-gray-400"
              strokeWidth={2}
            />
            <span className="text-[11px] font-medium leading-tight text-gray-500 dark:text-gray-400">
              {formatCardDate(job.deadline)}
            </span>
          </div>
          <div
            className={`h-2 w-20 shrink-0 overflow-hidden rounded-full transition-colors duration-300 ${visual.progressTrack}`}
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${visual.progressFill}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

function SortableJobCard({
  job,
  onEditJob,
  onDeleteJob,
  onStatusChange,
}: {
  job: JobApplication;
  onEditJob: (job: JobApplication) => void;
  onDeleteJob: (id: string) => void;
  onStatusChange: (id: string, newStatus: BoardColumn) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: job.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`touch-none ${isDragging ? "z-10 opacity-60" : ""}`}
      {...attributes}
      {...listeners}
    >
      <IceCreamApplicationCard
        job={job}
        onEdit={() => onEditJob(job)}
        onDelete={() => onDeleteJob(job.id)}
        onStatusChange={onStatusChange}
      />
    </div>
  );
}

function YourApplicationsCarousel({
  jobs,
  onEditJob,
  onDeleteJob,
  onChangeJobStatus,
  searchQuery,
}: {
  jobs: JobApplication[];
  onEditJob: (job: JobApplication) => void;
  onDeleteJob: (id: string) => void;
  onChangeJobStatus: (id: string, newStatus: BoardColumn) => void;
  searchQuery: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [statusFilter, setStatusFilter] = useState<ApplicationsStatusFilter>(STATUS_FILTER_ALL);

  const visibleJobs = useMemo(() => {
    let filtered = flattenByColumnOrder(jobs);
    if (statusFilter !== STATUS_FILTER_ALL) {
      filtered = filtered.filter((j) => j.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((j) =>
        j.company.toLowerCase().includes(q) ||
        j.role.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [jobs, statusFilter, searchQuery]);

  const scrollBy = (delta: number) => {
    scrollerRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <section aria-label="Active Job Applications" className="min-w-0 shrink-0">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-indigo-950 dark:text-indigo-100">
          Active Job Applications
        </h2>
        <div className="flex shrink-0 items-center gap-4">
          <label htmlFor="applications-status-filter" className="sr-only">
            Filter by Status
          </label>
          <select
            id="applications-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ApplicationsStatusFilter)}
            className="cursor-pointer border-0 bg-transparent text-sm font-medium text-gray-500 focus:outline-none focus:ring-0 dark:text-gray-400"
          >
            <option value={STATUS_FILTER_ALL}>Filter by Status ▾</option>
            {COLUMN_ORDER.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
          <div className="flex gap-2 text-gray-400 [&>svg]:h-5 [&>svg]:w-5 [&>svg]:cursor-pointer hover:[&>svg]:text-gray-700 dark:[&>svg]:text-gray-500 dark:hover:[&>svg]:text-gray-300">
            <button type="button" onClick={() => scrollBy(-340)} aria-label="Scroll left">
              <ChevronLeft strokeWidth={2} />
            </button>
            <button type="button" onClick={() => scrollBy(340)} aria-label="Scroll right">
              <ChevronRight strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {visibleJobs.length > 0 ? (
          visibleJobs.map((job) => (
            <IceCreamApplicationCard
              key={job.id}
              job={job}
              onEdit={() => onEditJob(job)}
              onDelete={() => onDeleteJob(job.id)}
              onStatusChange={onChangeJobStatus}
            />
          ))
        ) : (
          <div className="flex h-[192px] w-full items-center justify-center rounded-[24px] border-2 border-dashed border-gray-200 text-sm text-gray-400 dark:border-white/10 dark:text-gray-500">
            No matching applications found.
          </div>
        )}
      </div>
    </section>
  );
}

function ColumnLane({
  column,
  jobs,
  onEditJob,
  onDeleteJob,
  onStatusChange,
}: {
  column: BoardColumn;
  jobs: JobApplication[];
  onEditJob: (job: JobApplication) => void;
  onDeleteJob: (id: string) => void;
  onStatusChange: (id: string, newStatus: BoardColumn) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column });
  const ids = jobs.map((j) => j.id);

  return (
    <div className={`flex min-w-0 flex-col ${isOver ? "opacity-[0.97]" : ""}`}>
      <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-gray-100">
        {column}
        <span className="ml-2 text-sm font-normal text-gray-400 dark:text-gray-500">
          {jobs.length}
        </span>
      </h3>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex min-h-[10rem] flex-col gap-4">
          {jobs.length === 0 ? (
            <div className="flex h-36 items-center justify-center rounded-[24px] border-2 border-dashed border-gray-200 bg-white/40 dark:border-gray-600 dark:bg-white/[0.03]">
              <span className="text-sm text-gray-400 dark:text-gray-500">
                No applications
              </span>
            </div>
          ) : (
            jobs.map((job) => (
              <SortableJobCard
                key={job.id}
                job={job}
                onEditJob={onEditJob}
                onDeleteJob={onDeleteJob}
                onStatusChange={onStatusChange}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function KanbanBoardView({
  jobs,
  onEditJob,
  onDeleteJob,
  onStatusChange,
  searchQuery,
}: {
  jobs: JobApplication[];
  onEditJob: (job: JobApplication) => void;
  onDeleteJob: (id: string) => void;
  onStatusChange: (id: string, newStatus: BoardColumn) => void;
  searchQuery: string;
}) {
  const grouped = useMemo(() => {
    let filtered = jobs;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((j) =>
        j.company.toLowerCase().includes(q) ||
        j.role.toLowerCase().includes(q)
      );
    }
    return groupByColumn(filtered);
  }, [jobs, searchQuery]);

  return (
    <div className="h-full flex-1 overflow-x-auto overflow-y-auto px-8 pb-8 pt-5">
      <div className="flex h-full min-w-max gap-6">
        {COLUMN_ORDER.map((col) => (
          <div key={col} className="flex w-[320px] shrink-0 flex-col">
            <ColumnLane
              column={col}
              jobs={grouped[col]}
              onEditJob={onEditJob}
              onDeleteJob={onDeleteJob}
              onStatusChange={onStatusChange}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function CalendarView({ jobs }: { jobs: JobApplication[] }) {
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  const startOffset = 3;

  return (
    <div className="flex h-full flex-col px-8 pb-8 pt-5 overflow-y-auto">
      <h2 className="mb-6 text-xl font-bold text-gray-900 dark:text-white">Monthly Overview</h2>
      <div className="grid grid-cols-7 gap-px rounded-2xl bg-gray-200 overflow-hidden dark:bg-white/10">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
          <div key={d} className="bg-gray-50 py-3 text-center text-sm font-semibold text-gray-500 dark:bg-gray-900/60 dark:text-gray-400">
            {d}
          </div>
        ))}
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[120px] bg-[#F8F9FA] dark:bg-[#0B1437]/50" />
        ))}
        {days.map((day) => {
          const dayStr = day < 10 ? `0${day}` : `${day}`;
          const dayJobs = jobs.filter(j => j.deadline && j.deadline.endsWith(`-${dayStr}`));

          return (
            <div key={day} className="min-h-[120px] bg-white p-2 dark:bg-[#111C44]">
              <span className={`text-sm font-medium ${day === 18 ? "flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white" : "text-gray-700 dark:text-gray-300"}`}>
                {day}
              </span>
              <div className="mt-2 flex flex-col gap-1">
                {dayJobs.map(j => (
                  <div key={j.id} className="truncate rounded border border-orange-200 bg-orange-50 px-1.5 py-1 text-[10px] font-bold text-orange-700 dark:border-orange-900/40 dark:bg-orange-900/20 dark:text-orange-400">
                    {j.company} OA
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WorkloadStatusCard({ jobs }: { jobs: JobApplication[] }) {
  const totalJobs = jobs.length;
  const appliedAndBeyond = jobs.filter(
    (j) => j.status !== BoardColumn.WISHLIST,
  ).length;
  const interviewsSecured = jobs.filter(
    (j) =>
      j.status === BoardColumn.INTERVIEW || j.status === BoardColumn.OUTCOME,
  ).length;

  const executionRate =
    totalJobs === 0
      ? 0
      : Math.round((appliedAndBeyond / totalJobs) * 100);
  const interviewRate =
    appliedAndBeyond === 0
      ? 0
      : Math.round((interviewsSecured / appliedAndBeyond) * 100);

  return (
    <section className="shrink-0 rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-gray-900/70">
      <h2 className="mb-5 text-lg font-bold text-gray-900 dark:text-white">
        Pipeline Conversion Stats
      </h2>
      <div className="grid grid-cols-2 gap-5">
        <SemiCircleChart
          percentage={executionRate}
          color="text-indigo-500"
          shadowColor="text-indigo-200"
          label="Application Execution"
          filterId="workload-indigo-glow"
          legendCompleted="Submitted"
          legendRemaining="In Wishlist"
        />
        <SemiCircleChart
          percentage={interviewRate}
          color="text-green-500"
          shadowColor="text-green-200"
          label="Interview Conversion"
          filterId="workload-green-glow"
          legendCompleted="Interviews Secured"
          legendRemaining="Applied/Assessment"
        />
      </div>
    </section>
  );
}

function ApplicationStatsCard({ jobs }: { jobs: JobApplication[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  const urgentDeadlines = jobs.filter((j) => {
    if (!j.deadline?.trim()) return false;
    const d = new Date(j.deadline.trim());
    if (Number.isNaN(d.getTime())) return false;
    d.setHours(0, 0, 0, 0);
    return d >= today && d <= nextWeek;
  }).length;

  const missingMaterials = jobs.filter(
    (j) => !j.resumeVersion || j.resumeVersion.trim() === "",
  ).length;

  const pipelineData = COLUMN_ORDER.map(
    (col) => jobs.filter((j) => j.status === col).length,
  );
  const maxPipeline = Math.max(...pipelineData, 1);
  const pipelineLabels = [
    "Wishlist",
    "Applied",
    "OA/Test",
    "Interview",
    "Outcome",
  ];

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-gray-50 bg-[#F8F9FE] p-4 shadow-sm dark:border-white/10 dark:bg-[#111C44]">
      <div className="flex shrink-0 items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Pipeline Distribution
        </h2>
      </div>

      <div className="mb-4 mt-4 grid shrink-0 grid-cols-2 gap-4">
        <article className="rounded-[20px] bg-white p-4 shadow-sm ring-1 ring-gray-100/80 dark:bg-white/95 dark:ring-white/10">
          <div className="flex items-start justify-between gap-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400">
              <Calendar size={18} strokeWidth={2} />
            </span>
            <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
              Action Needed
            </span>
          </div>
          <p className="mt-2 text-xl font-bold tabular-nums text-gray-900 dark:text-white">
            {urgentDeadlines}
          </p>
          <p className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">
            Deadlines in 7 Days
          </p>
        </article>

        <article className="rounded-[20px] bg-gradient-to-br from-[#5B4AE0] via-[#6B5AE0] to-[#4B3BC9] p-4 text-white shadow-lg shadow-indigo-500/35 ring-1 ring-white/10">
          <div className="flex items-start justify-between gap-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm">
              <FileText size={18} strokeWidth={2} />
            </span>
            <span className="text-xs font-bold text-amber-200/95">
              Check Profile
            </span>
          </div>
          <p className="mt-2 text-xl font-bold tabular-nums text-white">
            {missingMaterials}
          </p>
          <p className="mt-1 text-xs font-medium text-white/85">
            Missing Resumes/Tags
          </p>
        </article>
      </div>

      <div className="relative mt-3 min-h-0 flex-1">
        <div className="relative flex h-44 min-h-0 w-full items-end justify-between gap-1.5 px-1 pt-6 sm:gap-2 sm:px-2">
          <span className="absolute left-0 bottom-[45%] -z-10 w-full border-t border-dashed border-gray-300 dark:border-white/15" />

          <div className="absolute left-1/2 bottom-[45%] z-30 mb-2 -translate-x-1/2 rounded-xl border border-gray-100 bg-white/90 px-3 py-1.5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-gray-900/90">
            <p className="whitespace-nowrap text-[11px] font-semibold text-gray-700 dark:text-gray-200">
              Total Active: {jobs.length}
            </p>
          </div>

          {pipelineData.map((value, index) => (
            <div
              key={pipelineLabels[index]}
              className="flex h-full flex-1 items-end justify-center z-20"
            >
              <div
                className="w-8 max-w-full rounded-full bg-gradient-to-t from-[#4FD1C5] to-[#6B5AE0] transition-all duration-500 ease-out hover:opacity-90 sm:w-10"
                style={{ height: `${(value / maxPipeline) * 85}%` }}
              />
            </div>
          ))}
        </div>

        <div className="mt-3 flex w-full justify-between gap-1 px-1 sm:gap-2 sm:px-2">
          {pipelineLabels.map((label) => (
            <span
              key={label}
              className="flex-1 text-center text-[10px] font-medium leading-tight text-gray-400 dark:text-gray-500"
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function SettingsModal({
  open,
  onClose,
  jobs,
  events,
}: {
  open: boolean;
  onClose: () => void;
  jobs: JobApplication[];
  events: ScheduleEvent[];
}) {
  if (!open) return null;

  const handleExport = () => {
    const data = { jobs, events };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tech-offer-kanban-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearData = () => {
    if (
      window.confirm(
        "Danger zone: Clear all job applications and timeline events stored in this browser? This cannot be undone.",
      )
    ) {
      window.localStorage.removeItem(KANBAN_JOBS_STORAGE_KEY);
      window.localStorage.removeItem(KANBAN_EVENTS_STORAGE_KEY);
      window.location.reload();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        className={modalBackdropClass}
        onClick={onClose}
        aria-label="Close dialog"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        className={`${modalPanelClass} max-w-md`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="settings-modal-title" className={modalTitleClass}>
          Settings
        </h2>
        <p className={modalHintClass}>
          Export a backup, adjust appearance, or clear local data for this device.
        </p>

        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/90 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <p className={modalLabelClass}>Export Backup</p>
            <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
              Download your applications and timeline events as one JSON file.
            </p>
            <button
              type="button"
              onClick={handleExport}
              className={`${modalPrimaryBtnClass} mt-4 inline-flex`}
            >
              Download tech-offer-kanban-backup.json
            </button>
          </div>

          <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/90 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <p className={modalLabelClass}>Appearance</p>
            <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
              Choose light or dark mode for the dashboard.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <ThemeToggle />
              <span className="text-sm text-neutral-700 dark:text-neutral-300">
                Light / dark theme
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-red-200/90 bg-red-50/90 p-4 dark:border-red-900/40 dark:bg-red-950/25">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-400">
              Danger zone
            </p>
            <p className="text-[13px] text-red-600/90 dark:text-red-300/90">
              Permanently remove all saved applications and events from local storage.
            </p>
            <button
              type="button"
              onClick={handleClearData}
              className="mt-4 rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600/30"
            >
              Clear Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        className={modalBackdropClass}
        onClick={onClose}
        aria-label="Close dialog"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        className={`${modalPanelClass} max-w-lg`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <img
            src="https://i.pravatar.cc/150?img=32"
            alt=""
            width={96}
            height={96}
            className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-lg ring-2 ring-gray-100 dark:border-gray-700 dark:ring-white/10"
          />
          <h2 id="profile-modal-title" className={`${modalTitleClass} mt-4`}>
            Name: MK
          </h2>
          <p className={modalHintClass}>Quick reference profile (read-only)</p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/90 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <p className={modalLabelClass}>Education</p>
            <p className="select-all text-[13px] leading-snug text-neutral-700 dark:text-neutral-200">
              University of California, San Diego (UCSD)
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/90 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <p className={modalLabelClass}>Major</p>
            <p className="select-all text-[13px] leading-snug text-neutral-700 dark:text-neutral-200">
              Electrical and Computer Engineering (Graduate Student)
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/90 p-4 dark:border-white/10 dark:bg-white/[0.04] sm:col-span-2">
            <p className={modalLabelClass}>Standardized Tests</p>
            <p className="select-all text-[13px] leading-snug text-neutral-700 dark:text-neutral-200">
              IELTS 7.5 | GRE 321
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/90 p-4 dark:border-white/10 dark:bg-white/[0.04] sm:col-span-2">
            <p className={modalLabelClass}>Focus</p>
            <p className="select-all text-[13px] leading-snug text-neutral-700 dark:text-neutral-200">
              AI-native development, Machine Learning, Digital Signal Processing.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className={`${modalSecondaryBtnClass} mt-8 w-full`}
        >
          Close
        </button>
      </div>
    </div>
  );
}

type AppView = "dashboard" | "projects" | "calendar";

function SlimAppSidebar({
  currentView,
  setCurrentView,
  onClearSearch,
  onAddClick,
  onSettingsClick,
  onProfileClick,
}: {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  onClearSearch: () => void;
  onAddClick: () => void;
  onSettingsClick: () => void;
  onProfileClick: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const labelCn =
    "overflow-hidden whitespace-nowrap text-sm font-semibold text-gray-700 transition-all duration-300 ease-in-out dark:text-gray-200";
  const labelVisibility = expanded
    ? "max-w-[180px] opacity-100"
    : "max-w-0 opacity-0";

  return (
    <aside
      className={`z-20 flex shrink-0 flex-col border-r border-white/70 bg-white/80 py-6 pb-20 shadow-[inset_-1px_0_0_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300 ease-in-out dark:border-white/10 dark:bg-gray-950/75 dark:shadow-none ${
        expanded ? "w-[240px]" : "w-[80px]"
      }`}
      aria-label="Main Navigation"
    >
      <div className={`flex flex-col gap-3 ${expanded ? "items-stretch px-3" : "items-center px-2"}`}>
        <button
          type="button"
          onClick={() => {
            setCurrentView("dashboard");
            onClearSearch();
          }}
          className={`flex h-11 min-w-0 shrink-0 items-center rounded-2xl text-left text-indigo-950 transition-colors hover:bg-gray-100/90 dark:text-indigo-100 dark:hover:bg-white/10 ${
            expanded ? "gap-3 px-2" : "w-11 justify-center px-0"
          }`}
          aria-label="Dashboard"
        >
          <Hexagon
            className="shrink-0 fill-indigo-950 stroke-indigo-950 text-indigo-950 dark:fill-indigo-100 dark:stroke-indigo-100 dark:text-indigo-100"
            size={28}
            strokeWidth={1.25}
            aria-hidden
          />
          <span className={`${labelCn} ${labelVisibility}`}>Dashboard</span>
        </button>

        <span className={`block border-t border-gray-200/80 dark:border-white/10 ${expanded ? "w-full" : "mx-auto w-8"}`} />

        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className={`flex h-11 min-w-0 items-center rounded-2xl text-gray-500 transition-colors hover:bg-gray-100/90 hover:text-gray-800 dark:hover:bg-white/10 dark:hover:text-gray-200 ${
            expanded ? "justify-start gap-3 px-2" : "w-11 justify-center px-0"
          }`}
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          <Menu size={20} strokeWidth={2} className="shrink-0" aria-hidden />
          <span className={`${labelCn} ${labelVisibility}`}>Menu</span>
        </button>
      </div>

      <div
        className={`mt-8 flex flex-col gap-2 ${expanded ? "items-stretch px-3" : "items-center gap-4 px-2"}`}
      >
        <button
          type="button"
          onClick={onProfileClick}
          className={`flex min-h-[44px] min-w-0 items-center rounded-2xl bg-indigo-500/95 text-sm font-bold text-white shadow-md shadow-indigo-500/25 transition-colors hover:bg-indigo-600 dark:bg-indigo-600/90 dark:hover:bg-indigo-500 ${
            expanded ? "gap-3 px-2 py-1.5" : "h-10 w-10 shrink-0 justify-center p-0"
          }`}
          title="My Profile"
          aria-label="My Profile"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-[13px]">
            MK
          </span>
          <span className={`${labelCn} text-white ${labelVisibility}`}>
            My Profile
          </span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentView("projects")}
          className={`flex min-h-[44px] min-w-0 items-center rounded-2xl bg-orange-500 text-white shadow-md shadow-orange-500/30 transition-colors hover:bg-orange-600 ${
            expanded ? "gap-3 px-2 py-1.5" : "h-10 w-10 shrink-0 justify-center p-0"
          } ${currentView === "projects" ? "ring-2 ring-white/50 ring-offset-2 ring-offset-orange-500 dark:ring-offset-gray-950" : ""}`}
          aria-label="Kanban Board"
          title="Kanban Board"
        >
          <Briefcase size={20} strokeWidth={2} className="shrink-0 opacity-95" aria-hidden />
          <span className={`${labelCn} text-white ${labelVisibility}`}>
            Kanban Board
          </span>
        </button>

        <button
          type="button"
          onClick={onAddClick}
          className={`flex min-h-[44px] min-w-0 items-center rounded-full border border-dashed border-gray-300 text-gray-500 transition-colors hover:border-indigo-400 hover:bg-gray-50 hover:text-indigo-700 dark:border-gray-600 dark:text-gray-400 dark:hover:border-indigo-400 dark:hover:bg-white/10 dark:hover:text-indigo-300 ${
            expanded ? "justify-start gap-3 px-2 py-2" : "h-10 w-10 shrink-0 justify-center border-none p-0 hover:bg-gray-50 dark:hover:bg-white/10"
          }`}
          aria-label="New Application"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-dashed border-gray-300 dark:border-gray-600">
            <Plus size={20} strokeWidth={2} aria-hidden />
          </span>
          <span className={`${labelCn} ${labelVisibility}`}>New Application</span>
        </button>
      </div>

      <button
        type="button"
        onClick={onSettingsClick}
        className={`mt-auto flex min-h-[44px] items-center rounded-2xl text-gray-400 transition-colors hover:bg-gray-100/90 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-gray-200 ${
          expanded ? "mx-3 mb-1 gap-3 px-2 py-2" : "mx-auto mb-1 w-11 justify-center px-0 py-2"
        }`}
        aria-label="Global Settings"
      >
        <Settings size={20} strokeWidth={2} className="shrink-0" aria-hidden />
        <span className={`${labelCn} ${labelVisibility}`}>Global Settings</span>
      </button>
    </aside>
  );
}

function AppTopBar({
  onAddClick,
  searchQuery,
  setSearchQuery,
  currentView,
  setCurrentView,
  toggleNotifications,
  pendingCount
}: {
  onAddClick: () => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  currentView: "dashboard" | "projects" | "calendar";
  setCurrentView: (view: "dashboard" | "projects" | "calendar") => void;
  toggleNotifications: () => void;
  pendingCount: number;
}) {
  const [appsOpen, setAppsOpen] = useState(false);
  const appsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (appsRef.current && !appsRef.current.contains(e.target as Node)) {
        setAppsOpen(false);
      }
    };
    if (appsOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [appsOpen]);

  return (
    <header className="flex h-[80px] w-full shrink-0 items-center justify-between bg-[#F8F9FA] px-8 dark:bg-[#0B1437]">
      <nav
        className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2"
        aria-label="Page Navigation"
      >
        <button
          type="button"
          onClick={() => setCurrentView("dashboard")}
          className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${currentView === "dashboard" ? "bg-[#E8F5E9] text-green-700 dark:bg-green-950/40 dark:text-green-400" : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"}`}
        >
          <LayoutDashboard size={20} strokeWidth={2} aria-hidden />
          Dashboard
        </button>
        <button
          type="button"
          onClick={() => setCurrentView("projects")}
          className={`shrink-0 px-4 py-2 text-sm font-medium rounded-xl transition-colors ${currentView === "projects" ? "bg-white shadow-sm text-indigo-700 dark:bg-white/10 dark:text-indigo-300" : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"}`}
        >
          Projects
        </button>
        <button
          type="button"
          onClick={() => setCurrentView("calendar")}
          className={`hidden shrink-0 px-4 py-2 text-sm font-medium rounded-xl transition-colors sm:inline ${currentView === "calendar" ? "bg-white shadow-sm text-indigo-700 dark:bg-white/10 dark:text-indigo-300" : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"}`}
        >
          Calendar
        </button>
      </nav>

      <div className="flex shrink-0 items-center gap-6 sm:gap-8">
        <label className="hidden w-64 cursor-text items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-400 sm:flex dark:border-white/10 dark:bg-gray-900/60 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
          <Search size={18} strokeWidth={2} className="shrink-0 text-gray-400" />
          <input
            type="search"
            placeholder="Search company or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="min-w-0 flex-1 border-0 bg-transparent text-sm text-gray-600 placeholder:text-gray-400 focus:outline-none dark:text-gray-200 dark:placeholder:text-gray-500"
            aria-label="Search"
          />
        </label>

        <div className="relative" ref={appsRef}>
          <button
            type="button"
            onClick={() => setAppsOpen(!appsOpen)}
            className="rounded-full p-2 text-gray-500 transition-colors hover:bg-white/80 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-200"
            aria-label="Apps"
            aria-expanded={appsOpen}
          >
            <Grid3x3 size={20} strokeWidth={2} />
          </button>

          {appsOpen && (
            <div className="absolute right-0 top-12 z-50 w-72 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl dark:border-white/10 dark:bg-[#111C44]">
              <div className="bg-gray-50 px-5 py-3 dark:bg-white/5">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Quick Tools</h3>
              </div>
              <div className="grid grid-cols-3 gap-2 p-4">
                <a href="#" className="flex flex-col items-center gap-2 rounded-xl p-2 transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400">
                    <Code size={20} />
                  </div>
                  <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300">LeetCode</span>
                </a>
                <a href="#" className="flex flex-col items-center gap-2 rounded-xl p-2 transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                    <Terminal size={20} />
                  </div>
                  <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300">GitHub</span>
                </a>
                <a href="#" className="flex flex-col items-center gap-2 rounded-xl p-2 transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    <Users size={20} />
                  </div>
                  <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300">LinkedIn</span>
                </a>
                <a href="#" className="flex flex-col items-center gap-2 rounded-xl p-2 transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <FileText size={20} />
                  </div>
                  <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300">Resumes</span>
                </a>
                <a href="#" className="flex flex-col items-center gap-2 rounded-xl p-2 transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-500 dark:bg-red-900/30 dark:text-red-400">
                    <Mail size={20} />
                  </div>
                  <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300">Gmail</span>
                </a>
                <a href="#" className="flex flex-col items-center gap-2 rounded-xl p-2 transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                    <Folder size={20} />
                  </div>
                  <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300">Portfolio</span>
                </a>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={toggleNotifications}
          className="relative rounded-full p-2 text-gray-500 transition-colors hover:bg-white/80 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-200"
          aria-label="Messages"
        >
          <Bell size={20} strokeWidth={2} />
          {pendingCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-[#F8F9FA] bg-orange-500 text-[8px] font-bold text-white dark:border-[#0B1437]">
              {pendingCount}
            </span>
          )}
        </button>
        <ThemeToggle />
        <img
          src="https://i.pravatar.cc/150?img=32"
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 shrink-0 rounded-full border-2 border-green-100 object-cover dark:border-green-900/40"
        />
        <button
          type="button"
          onClick={onAddClick}
          className="hidden rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gray-800 lg:inline dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
        >
          New Application
        </button>
      </div>
    </header>
  );
}

function DailyActivityTimeline({
  events,
  jobs,
  onAddClick,
}: {
  events: ScheduleEvent[];
  jobs: JobApplication[];
  onAddClick: () => void;
}) {
  const [activeCategories, setActiveCategories] = useState<
    ScheduleEvent["category"][]
  >([...TIMELINE_CATEGORIES]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [, setNowTick] = useState(0);

  const rowHeight = 120;
  const timelineHeight = rowHeight * activeCategories.length;
  const timeTicks = Array.from({ length: TIMELINE_HOURS_SPAN }, (_, i) => i + 9);

  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNowTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const handlePrevDay = () => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 1);
    setCurrentDate(prev);
  };

  const handleNextDay = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 1);
    setCurrentDate(next);
  };

  const getDateTitle = () => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    if (currentDate.toDateString() === today.toDateString()) return "Today's Schedule";
    if (currentDate.toDateString() === tomorrow.toDateString()) return "Tomorrow's Schedule";
    return currentDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const currentDateStr = currentDate.toISOString().split("T")[0];

  const linkedDayEvents = useMemo(
    () => buildLinkedScheduleEvents(jobs, currentDateStr, events),
    [jobs, currentDateStr, events],
  );

  const visibleEvents = useMemo(() => {
    const manual = events.filter(
      (e) =>
        e.dateString === currentDateStr &&
        activeCategories.includes(e.category) &&
        !e.isLinked,
    );
    const linked = linkedDayEvents.filter((e) =>
      activeCategories.includes(e.category),
    );
    return [...manual, ...linked];
  }, [events, currentDateStr, activeCategories, linkedDayEvents]);

  const today = new Date();
  const isToday = currentDate.toDateString() === today.toDateString();
  const now = new Date();
  const currentHourPosition = now.getHours() + now.getMinutes() / 60;
  const showLiveTimeIndicator =
    isToday &&
    currentHourPosition >= TIMELINE_START_HOUR &&
    currentHourPosition <= TIMELINE_START_HOUR + TIMELINE_HOURS_SPAN;
  const liveIndicatorLeftPct =
    ((currentHourPosition - TIMELINE_START_HOUR) / TIMELINE_HOURS_SPAN) * 100;

  const toggleCategory = (cat: ScheduleEvent["category"]) => {
    setActiveCategories((prev) => {
      if (prev.includes(cat)) {
        return prev.filter((c) => c !== cat);
      }
      return TIMELINE_CATEGORIES.filter(
        (c) => prev.includes(c) || c === cat,
      ) as ScheduleEvent["category"][];
    });
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-gray-100 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-gray-900/70">
      <div className="flex shrink-0 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white min-w-[160px]">
            {getDateTitle()}
          </h2>
          <div className="flex items-center gap-1 text-gray-400">
            <button
              type="button"
              onClick={handlePrevDay}
              className="rounded-md p-1 transition-colors hover:bg-gray-50 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-gray-300"
              aria-label="Previous day"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={handleNextDay}
              className="rounded-md p-1 transition-colors hover:bg-gray-50 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-gray-300"
              aria-label="Next day"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setFilterOpen((o) => !o)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
              aria-expanded={filterOpen}
              aria-haspopup="true"
              aria-label="Filter timeline categories"
            >
              <SlidersHorizontal size={16} strokeWidth={2} />
              Filter
            </button>
            {filterOpen ? (
              <div
                className="absolute right-0 z-50 mt-2 min-w-[220px] rounded-xl border border-gray-100 bg-white p-3 shadow-xl dark:border-white/10 dark:bg-gray-800"
                onPointerDown={(e) => e.stopPropagation()}
              >
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Categories
                </p>
                <ul className="space-y-2">
                  {TIMELINE_CATEGORIES.map((cat) => (
                    <li key={cat}>
                      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-white/20 dark:bg-gray-900"
                          checked={activeCategories.includes(cat)}
                          onChange={() => toggleCategory(cat)}
                        />
                        <span>{cat}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onAddClick}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
          >
            <Plus size={16} strokeWidth={2} />
            Add Event
          </button>
        </div>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-[760px]">
            <div className="w-12 shrink-0 pt-6">
              {activeCategories.map((category) => (
                <div
                  key={category}
                  className="flex items-center justify-center"
                  style={{ height: rowHeight }}
                >
                  <div className="-rotate-90 whitespace-nowrap text-[10px] font-bold tracking-widest text-gray-400 text-center w-[100px]">
                    {category}
                  </div>
                </div>
              ))}
            </div>

            <div className="relative min-h-0 flex-1 overflow-hidden">
              <div className="grid grid-cols-8 pb-2">
                {timeTicks.map((hour) => (
                  <span
                    key={hour}
                    className="text-center text-xs font-medium text-gray-400"
                  >
                    {hour}:00
                  </span>
                ))}
              </div>

              <div
                className="relative max-h-full overflow-hidden"
                style={{ height: timelineHeight }}
              >
                {activeCategories.map((category) => (
                  <div
                    key={category}
                    className="border-b border-gray-50 dark:border-white/5"
                    style={{ height: rowHeight }}
                  />
                ))}

                <div
                  className="absolute top-0 z-10 h-full w-[2px] bg-indigo-400"
                  style={{ left: "37.5%" }}
                  aria-hidden
                >
                  <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-indigo-500" />
                </div>

                {showLiveTimeIndicator ? (
                  <div
                    className="pointer-events-none absolute top-0 z-[25] h-full w-px bg-red-500"
                    style={{ left: `${liveIndicatorLeftPct}%` }}
                    aria-hidden
                  >
                    <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 animate-pulse rounded-full bg-red-500" />
                  </div>
                ) : null}

                {visibleEvents.map((event) => {
                  const rowIndex = activeCategories.indexOf(event.category);
                  if (rowIndex < 0) return null;
                  const colorClasses = getTimelineColorClasses(event.color);
                  return (
                    <div
                      key={event.id}
                      className={`absolute z-20 flex h-[40px] items-center rounded-full p-1.5 shadow-sm transition-transform duration-200 ease-out hover:z-30 hover:scale-[1.02] hover:shadow-lg ${colorClasses.pillBg}`}
                      style={{
                        top: `${rowIndex * rowHeight + 30}px`,
                        ...getEventPositionStyle(event.startTime, event.duration),
                      }}
                    >
                      {event.isLinked ? (
                        <span
                          className="mx-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white bg-amber-100 text-[15px] shadow-sm dark:border-white/25 dark:bg-amber-900/50"
                          aria-hidden
                          title="Linked from applications"
                        >
                          🔗
                        </span>
                      ) : (
                        <div className="ml-1 mr-2 flex -space-x-2">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-indigo-200 text-[10px] font-semibold text-indigo-800">
                            MK
                          </span>
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-[10px] font-semibold text-slate-700">
                            SQ
                          </span>
                        </div>
                      )}
                      <div className="min-w-0 pr-3">
                        <p className={`truncate text-sm font-semibold ${colorClasses.title}`}>
                          {event.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatScheduleHour(event.startTime)} -{" "}
                          {formatScheduleHour(event.startTime + event.duration)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const inputClassName =
  "w-full rounded-xl border-0 border-b border-neutral-200/90 bg-transparent px-0 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 shadow-none outline-none ring-0 transition-all duration-200 focus:border-neutral-800 focus:shadow-[0_1px_0_0_rgba(0,0,0,0.75)] focus:outline-none dark:border-white/12 dark:bg-transparent dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-white/35 dark:focus:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_0_24px_rgba(255,255,255,0.06)]";

const selectChevron =
  "cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 24 24%27 stroke=%27%23525252%27%3E%3Cpath stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%272%27 d=%27M19 9l-7 7-7-7%27/%3E%3C/svg%3E')] bg-[length:1.25rem] bg-[right_0.15rem_center] bg-no-repeat pr-9 dark:bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 24 24%27 stroke=%27%23a3a3a3%27%3E%3Cpath stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%272%27 d=%27M19 9l-7 7-7-7%27/%3E%3C/svg%3E')]";

const textareaClassName =
  "w-full min-h-[168px] resize-y rounded-2xl border border-transparent bg-neutral-100/60 px-3 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none ring-0 transition-all duration-200 focus:ring-2 focus:ring-neutral-900/10 focus:outline-none dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:placeholder:text-neutral-500 dark:focus:ring-white/12";

const modalPanelClass =
  "relative z-10 w-full rounded-3xl border-0 bg-white p-6 shadow-[0_8px_40px_rgba(0,0,0,0.08)] dark:border dark:border-white/10 dark:bg-[#1C1C1E] dark:shadow-none";

const modalBackdropClass =
  "absolute inset-0 bg-black/30 backdrop-blur-md dark:bg-black/50";

const modalPrimaryBtnClass =
  "rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/25 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 dark:focus-visible:ring-white/30";

const modalSecondaryBtnClass =
  "rounded-full border border-neutral-200/90 bg-white px-5 py-2.5 text-sm font-medium text-neutral-800 transition-all duration-200 hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/10 dark:border-white/15 dark:bg-transparent dark:text-neutral-200 dark:hover:bg-white/10 dark:focus-visible:ring-white/15";

const modalLabelClass =
  "mb-1.5 block text-xs font-medium text-neutral-600 dark:text-neutral-400";

const modalTitleClass =
  "text-lg font-semibold tracking-tight text-neutral-900 dark:text-white";

const modalHintClass = "mt-1 text-[13px] text-neutral-500";

const modalStarClass = "text-neutral-800 dark:text-white/70";

const optionClassName = "bg-white text-neutral-900 dark:bg-[#1C1C1E] dark:text-white";

function AddScheduleEventModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (event: ScheduleEvent) => void;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ScheduleEvent["category"]>("INTERVIEWS");
  const [dateStr, setDateStr] = useState("");
  const [timeStr, setTimeStr] = useState("09:00");
  const [durationStr, setDurationStr] = useState("1");

  useEffect(() => {
    if (open) {
      setTitle("");
      setCategory("INTERVIEWS");
      setDateStr(new Date().toISOString().split("T")[0]);
      setTimeStr("09:00");
      setDurationStr("1");
    }
  }, [open]);

  if (!open) return null;

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;

    const [h, m] = timeStr.split(":");
    const startTime = parseInt(h, 10) + parseInt(m, 10) / 60;
    const duration = parseFloat(durationStr);

    let color: ScheduleEvent["color"] = "blue";
    if (category === "INTERVIEWS" || category === "ACADEMICS") color = "indigo";
    if (category === "ASSESSMENTS") color = "orange";

    onAdd({
      id: Date.now().toString(),
      title: t,
      category,
      startTime,
      duration,
      color,
      dateString: dateStr,
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        className={modalBackdropClass}
        onClick={onClose}
        aria-label="Close dialog"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-event-title"
        className={`${modalPanelClass} max-w-md`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="add-event-title" className={modalTitleClass}>
          Add Timeline Event
        </h2>
        <p className={modalHintClass}>
          Schedule a block on your daily timeline.
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="event-title" className={modalLabelClass}>
              Event Title <span className={modalStarClass}>*</span>
            </label>
            <input
              id="event-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., HackerRank OA for Amazon"
              required
              className={inputClassName}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="event-category" className={modalLabelClass}>
                Category <span className={modalStarClass}>*</span>
              </label>
              <select
                id="event-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ScheduleEvent["category"])}
                required
                className={`${inputClassName} ${selectChevron}`}
              >
                {TIMELINE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className={optionClassName}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="event-date" className={modalLabelClass}>
                Date <span className={modalStarClass}>*</span>
              </label>
              <input
                id="event-date"
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                required
                className={inputClassName}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="event-time" className={modalLabelClass}>
                Start Time <span className={modalStarClass}>*</span>
              </label>
              <input
                id="event-time"
                type="time"
                value={timeStr}
                min="09:00"
                max="16:30"
                onChange={(e) => setTimeStr(e.target.value)}
                required
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor="event-duration" className={modalLabelClass}>
                Duration (Hours) <span className={modalStarClass}>*</span>
              </label>
              <input
                id="event-duration"
                type="number"
                step="0.5"
                min="0.5"
                max="8"
                value={durationStr}
                onChange={(e) => setDurationStr(e.target.value)}
                required
                className={inputClassName}
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className={modalSecondaryBtnClass}>
              Cancel
            </button>
            <button type="submit" className={modalPrimaryBtnClass}>
              Add Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddApplicationModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (job: JobApplication) => void;
}) {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState<BoardColumn>(BoardColumn.WISHLIST);
  const [resumeVersion, setResumeVersion] = useState("");
  const [prepTagsInput, setPrepTagsInput] = useState("");
  const [jdText, setJdText] = useState("");
  const [isParsing, setIsParsing] = useState(false);

  useEffect(() => {
    if (open) {
      setCompany("");
      setRole("");
      setDeadline("");
      setStatus(BoardColumn.WISHLIST);
      setResumeVersion("");
      setPrepTagsInput("");
      setJdText("");
      setIsParsing(false);
    }
  }, [open]);

  if (!open) return null;

  function parseGeminiJson(text: string): Record<string, unknown> {
    let cleaned = text.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    try {
      return JSON.parse(cleaned) as Record<string, unknown>;
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]) as Record<string, unknown>;
        } catch {
          /* fall through */
        }
      }
      throw new Error("Could not parse JSON from model response.");
    }
  }

  const handleAIParse = async () => {
    const trimmed = jdText.trim();
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!trimmed) {
      window.alert("Please paste a job description first.");
      return;
    }
    if (!apiKey) {
      window.alert(
        "Missing NEXT_PUBLIC_GEMINI_API_KEY. Add it to .env.local and restart the dev server.",
      );
      return;
    }

    setIsParsing(true);
    try {
      const prompt =
        'You are an expert tech recruiter parser. Extract information from the following Job Description and return ONLY a valid JSON object (no markdown, no backticks). The JSON must have these exact keys:\n\'company\' (string, extract company name),\n\'role\' (string, extract job title),\n\'deadline\' (string, extract deadline in YYYY-MM-DD format, or leave empty string if not found),\n\'prepTags\' (array of strings, extract 3-5 core technical skills or interview topics. Focus heavily on algorithm, software engineering, and hardware/ECE related tech stacks like C++, DSP, Machine Learning, System Design).\nJob Description: ' +
        trimmed;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
          }),
        },
      );

      const raw = await res.text();
      if (!res.ok) {
        throw new Error(raw || `API error ${res.status}`);
      }

      let data: unknown;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error("Invalid API response.");
      }

      const text =
        (data as {
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
          }>;
        }).candidates?.[0]?.content?.parts?.[0]?.text ?? "";

      if (!text.trim()) {
        throw new Error("Empty response from model.");
      }

      const parsed = parseGeminiJson(text);

      const co = parsed.company;
      const ro = parsed.role;
      const dl = parsed.deadline;
      const tags = parsed.prepTags;

      if (typeof co === "string") setCompany(co);
      if (typeof ro === "string") setRole(ro);
      if (typeof dl === "string") setDeadline(dl);
      if (Array.isArray(tags)) {
        const strings = tags.filter((t): t is string => typeof t === "string");
        setPrepTagsInput(strings.join(", "));
      }
    } catch (err) {
      console.error("[AI Quick Parse]", err);
      window.alert(
        err instanceof Error ? err.message : "Failed to parse job description.",
      );
    } finally {
      setIsParsing(false);
      setJdText("");
    }
  };

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const c = company.trim();
    const r = role.trim();
    if (!c || !r) return;

    const tags = prepTagsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const job: JobApplication = {
      id: Date.now().toString(),
      company: c,
      role: r,
      status,
      ...(resumeVersion.trim() ? { resumeVersion: resumeVersion.trim() } : {}),
      ...(deadline.trim() ? { deadline: deadline.trim() } : {}),
      ...(tags.length > 0 ? { prepTags: tags } : {}),
    };
    onAdd(job);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        className={modalBackdropClass}
        onClick={onClose}
        aria-label="Close dialog"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-application-title"
        className={`${modalPanelClass} max-w-md`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="add-application-title" className={modalTitleClass}>
          Add New Application
        </h2>
        <p className={modalHintClass}>
          <span className={modalStarClass}>*</span> Indicates required field
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div className="relative mb-6 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 shadow-[0_0_28px_-8px_rgba(79,70,229,0.35)] dark:border-indigo-500/20 dark:bg-indigo-900/10 dark:shadow-[0_0_28px_-8px_rgba(129,140,248,0.25)]">
            <p className="mb-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
              ✨ AI Quick Parse (Paste JD here)
            </p>
            <div className="relative">
              <textarea
                id="add-jd-ai"
                rows={3}
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                placeholder="Paste full job description…"
                disabled={isParsing}
                className="w-full resize-y rounded-xl border border-indigo-100/80 bg-white/60 px-3 pb-12 pt-2.5 text-sm text-neutral-900 outline-none ring-0 transition-shadow placeholder:text-neutral-400 focus:border-indigo-300 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] dark:border-indigo-500/30 dark:bg-black/20 dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-indigo-400"
              />
              <div className="pointer-events-none absolute bottom-2 right-2 flex justify-end sm:pointer-events-auto">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    void handleAIParse();
                  }}
                  disabled={isParsing || !jdText.trim()}
                  className="pointer-events-auto rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-500/30 transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isParsing ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Parsing...
                    </span>
                  ) : (
                    "Auto Fill"
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="add-company" className={modalLabelClass}>
              Company Name <span className={modalStarClass}>*</span>
            </label>
            <input
              id="add-company"
              type="text"
              name="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g., Qualcomm"
              required
              autoComplete="organization"
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="add-role" className={modalLabelClass}>
              Role / Position <span className={modalStarClass}>*</span>
            </label>
            <input
              id="add-role"
              type="text"
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g., Algorithm Engineer"
              required
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="add-deadline" className={modalLabelClass}>
              Deadline{" "}
              <span className="font-normal text-neutral-600">(Optional)</span>
            </label>
            <input
              id="add-deadline"
              type="date"
              name="deadline"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="add-status" className={modalLabelClass}>
              Current Stage <span className={modalStarClass}>*</span>
            </label>
            <select
              id="add-status"
              name="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as BoardColumn)}
              required
              className={`${inputClassName} ${selectChevron}`}
            >
              {COLUMN_ORDER.map((col) => (
                <option key={col} value={col} className={optionClassName}>
                  {col}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="add-resume" className={modalLabelClass}>
              Resume Version{" "}
              <span className="font-normal text-neutral-600">(Optional)</span>
            </label>
            <input
              id="add-resume"
              type="text"
              name="resumeVersion"
              value={resumeVersion}
              onChange={(e) => setResumeVersion(e.target.value)}
              placeholder="e.g., Algo_Focus_v1"
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="add-tags" className={modalLabelClass}>
              Prep Tags{" "}
              <span className="font-normal text-neutral-600">(Optional)</span>
            </label>
            <input
              id="add-tags"
              type="text"
              name="prepTags"
              value={prepTagsInput}
              onChange={(e) => setPrepTagsInput(e.target.value)}
              placeholder="Comma separated, e.g., DP, DSP"
              className={inputClassName}
            />
          </div>

          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className={modalSecondaryBtnClass}>
              Cancel
            </button>
            <button type="submit" className={modalPrimaryBtnClass}>
              Add Application
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditApplicationModal({
  job,
  onClose,
  onSave,
}: {
  job: JobApplication | null;
  onClose: () => void;
  onSave: (job: JobApplication) => void;
}) {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState<BoardColumn>(BoardColumn.WISHLIST);
  const [resumeVersion, setResumeVersion] = useState("");
  const [deadline, setDeadline] = useState("");
  const [prepTagsInput, setPrepTagsInput] = useState("");
  const [interviewNotes, setInterviewNotes] = useState("");

  useEffect(() => {
    if (job) {
      setCompany(job.company);
      setRole(job.role);
      setStatus(job.status);
      setResumeVersion(job.resumeVersion ?? "");
      setDeadline(job.deadline ?? "");
      setPrepTagsInput(job.prepTags?.join(", ") ?? "");
      setInterviewNotes(job.interviewNotes ?? "");
    }
  }, [job]);

  if (!job) return null;

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!job) return;
    const c = company.trim();
    const r = role.trim();
    if (!c || !r) return;

    const tags = prepTagsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const updated: JobApplication = {
      id: job.id,
      company: c,
      role: r,
      status,
      ...(resumeVersion.trim() ? { resumeVersion: resumeVersion.trim() } : {}),
      ...(deadline.trim() ? { deadline: deadline.trim() } : {}),
      ...(tags.length > 0 ? { prepTags: tags } : {}),
      ...(interviewNotes.trim()
        ? { interviewNotes: interviewNotes.trim() }
        : {}),
    };
    onSave(updated);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        className={modalBackdropClass}
        onClick={onClose}
        aria-label="Close dialog"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-application-title"
        className={`${modalPanelClass} max-h-[min(90vh,40rem)] max-w-lg overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="edit-application-title" className={modalTitleClass}>
          Edit Application Details
        </h2>
        <p className={modalHintClass}>
          <span className={modalStarClass}>*</span> Indicates required field
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="edit-company" className={modalLabelClass}>
              Company Name <span className={modalStarClass}>*</span>
            </label>
            <input
              id="edit-company"
              type="text"
              name="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              required
              autoComplete="organization"
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="edit-role" className={modalLabelClass}>
              Role / Position <span className={modalStarClass}>*</span>
            </label>
            <input
              id="edit-role"
              type="text"
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="edit-status" className={modalLabelClass}>
              Current Stage <span className={modalStarClass}>*</span>
            </label>
            <select
              id="edit-status"
              name="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as BoardColumn)}
              required
              className={`${inputClassName} ${selectChevron}`}
            >
              {COLUMN_ORDER.map((col) => (
                <option key={col} value={col} className={optionClassName}>
                  {col}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="edit-resume" className={modalLabelClass}>
              Resume Version{" "}
              <span className="font-normal text-neutral-600">(Optional)</span>
            </label>
            <input
              id="edit-resume"
              type="text"
              name="resumeVersion"
              value={resumeVersion}
              onChange={(e) => setResumeVersion(e.target.value)}
              placeholder="e.g., Algo_Focus_v1"
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="edit-deadline" className={modalLabelClass}>
              Deadline / Date{" "}
              <span className="font-normal text-neutral-600">(Optional)</span>
            </label>
            <input
              id="edit-deadline"
              type="text"
              name="deadline"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              placeholder="e.g., 2026-05-12"
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="edit-tags" className={modalLabelClass}>
              Prep Tags{" "}
              <span className="font-normal text-neutral-600">(Optional)</span>
            </label>
            <input
              id="edit-tags"
              type="text"
              name="prepTags"
              value={prepTagsInput}
              onChange={(e) => setPrepTagsInput(e.target.value)}
              placeholder="Comma separated, e.g., DP, DSP"
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="edit-interview-notes" className={modalLabelClass}>
              Interview Notes / Retrospective
              <span className="font-normal text-neutral-600">(Optional)</span>
            </label>
            <textarea
              id="edit-interview-notes"
              name="interviewNotes"
              value={interviewNotes}
              onChange={(e) => setInterviewNotes(e.target.value)}
              placeholder="Log technical questions, feedback, areas to improve..."
              rows={7}
              className={textareaClassName}
            />
          </div>

          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className={modalSecondaryBtnClass}>
              Cancel
            </button>
            <button type="submit" className={modalPrimaryBtnClass}>
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NotificationsDrawer({
  open,
  onClose,
  jobs
}: {
  open: boolean;
  onClose: () => void;
  jobs: JobApplication[];
}) {
  if (!open) return null;

  const pendingAssessments = jobs.filter(j => j.status === BoardColumn.ASSESSMENT);
  const upcomingInterviews = jobs.filter(j => j.status === BoardColumn.INTERVIEW);

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex h-full w-[380px] flex-col bg-white shadow-2xl dark:bg-[#0B1437] dark:border-l dark:border-white/10 transform transition-transform duration-300">
        <div className="flex items-center justify-between border-b border-gray-100 p-6 dark:border-white/10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Notifications</h2>
          <button onClick={onClose} className="rounded-full p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {pendingAssessments.length === 0 && upcomingInterviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-20 text-gray-400">
              <Mail size={48} strokeWidth={1} className="mb-4 opacity-50" />
              <p>You're all caught up!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {pendingAssessments.length > 0 && (
                <div>
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-orange-500">Action Required</h3>
                  <div className="space-y-3">
                    {pendingAssessments.map(job => (
                      <div key={job.id} className="rounded-xl border border-orange-100 bg-orange-50 p-4 dark:border-orange-900/30 dark:bg-orange-950/20">
                        <div className="flex items-center gap-2 font-bold text-orange-800 dark:text-orange-400">
                          <CalendarDays size={16} />
                          {job.company} Assessment
                        </div>
                        <p className="mt-1 text-sm text-orange-700 dark:text-orange-300">Due: {job.deadline || 'ASAP'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {upcomingInterviews.length > 0 && (
                <div>
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-indigo-500">Upcoming Interviews</h3>
                  <div className="space-y-3">
                    {upcomingInterviews.map(job => (
                      <div key={job.id} className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 dark:border-indigo-900/30 dark:bg-indigo-950/20">
                        <div className="flex items-center gap-2 font-bold text-indigo-800 dark:text-indigo-400">
                          <ListChecks size={16} />
                          {job.company}
                        </div>
                        <p className="mt-1 text-sm text-indigo-700 dark:text-indigo-300">Role: {job.role}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [jobs, setJobs] = useState<JobApplication[]>(initialMockData);
  const [events, setEvents] = useState<ScheduleEvent[]>(initialScheduleEvents);

  const [isMounted, setIsMounted] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addEventModalOpen, setAddEventModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobApplication | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [currentView, setCurrentView] = useState<"dashboard" | "projects" | "calendar">("dashboard");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const rawJobs = window.localStorage.getItem(KANBAN_JOBS_STORAGE_KEY);
      const parsedJobs = tryParseStoredJobs(rawJobs);
      if (parsedJobs) setJobs(parsedJobs);

      const rawEvents = window.localStorage.getItem(KANBAN_EVENTS_STORAGE_KEY);
      if (rawEvents) {
        const parsedEvents = JSON.parse(rawEvents);
        if (Array.isArray(parsedEvents)) setEvents(parsedEvents);
      }
    } catch {
      /* ignore */
    }
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !isMounted) return;
    try {
      window.localStorage.setItem(KANBAN_JOBS_STORAGE_KEY, JSON.stringify(jobs));
      window.localStorage.setItem(KANBAN_EVENTS_STORAGE_KEY, JSON.stringify(events));
    } catch {
      /* ignore */
    }
  }, [jobs, events, isMounted]);

  const grouped = useMemo(() => groupByColumn(jobs), [jobs]);
  const totalApplications = jobs.filter(j => j.status !== BoardColumn.WISHLIST).length;
  const pendingAssessment = grouped[BoardColumn.ASSESSMENT].length;
  const handleDeleteJob = (id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  };

  const handleChangeJobStatus = (id: string, newStatus: BoardColumn) => {
    setJobs((prev) =>
      flattenByColumnOrder(
        prev.map((j) => (j.id === id ? { ...j, status: newStatus } : j)),
      ),
    );
  };

  const handleAddEvent = (event: ScheduleEvent) => {
    setEvents((prev) => [...prev, event]);
  };

  if (!isMounted) {
    return (
      <div className="flex h-screen w-full items-center justify-center overflow-hidden bg-[#F8F9FA] font-sans antialiased text-gray-900 dark:bg-[#0B1437] dark:text-white">
        <p className="text-[13px] text-gray-500 dark:text-gray-400">Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F8F9FA] font-sans antialiased text-gray-900 dark:bg-[#0B1437] dark:text-gray-100">

      <AddApplicationModal open={addModalOpen} onClose={() => setAddModalOpen(false)} onAdd={(job) => setJobs((prev) => flattenByColumnOrder([...prev, job]))} />
      <EditApplicationModal job={editingJob} onClose={() => setEditingJob(null)} onSave={(updated) => setJobs((prev) => flattenByColumnOrder(prev.map((j) => (j.id === updated.id ? updated : j))))} />
      <AddScheduleEventModal open={addEventModalOpen} onClose={() => setAddEventModalOpen(false)} onAdd={handleAddEvent} />
      <NotificationsDrawer open={notificationsOpen} onClose={() => setNotificationsOpen(false)} jobs={jobs} />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        jobs={jobs}
        events={events}
      />

      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
      />

      <SlimAppSidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        onClearSearch={() => setSearchQuery("")}
        onAddClick={() => setAddModalOpen(true)}
        onSettingsClick={() => setSettingsOpen(true)}
        onProfileClick={() => setProfileOpen((o) => !o)}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <AppTopBar
          onAddClick={() => setAddModalOpen(true)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          currentView={currentView}
          setCurrentView={setCurrentView}
          toggleNotifications={() => setNotificationsOpen(true)}
          pendingCount={pendingAssessment}
        />

        <div className="h-[calc(100vh-80px)] min-h-0 flex-1 overflow-x-hidden overflow-y-hidden">

          {currentView === "dashboard" && (
            <div className="mx-auto grid h-full min-h-0 max-w-[1800px] grid-cols-1 gap-5 px-8 pb-5 pt-5 xl:grid-cols-12 xl:items-stretch">
              <div className="col-span-1 flex h-full min-h-0 flex-col gap-5 xl:col-span-8">
                <div className="flex flex-wrap gap-3">
                  <div className="min-w-[140px] flex-1 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900/60 dark:ring-white/10 dark:shadow-none">
                    <div className="flex items-start justify-between">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Applications Sent</p>
                      <span className="text-[10px] font-bold text-green-500">▲ +12 this month</span>
                    </div>
                    <p className="mt-1 text-xl font-semibold tabular-nums text-gray-900 dark:text-white">{totalApplications}</p>
                  </div>
                  <div className="min-w-[140px] flex-1 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900/60 dark:ring-white/10 dark:shadow-none">
                    <div className="flex items-start justify-between">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Pending Online Assessments</p>
                      {pendingAssessment > 0 ? (
                        <span className="text-[10px] font-bold text-amber-600">Action Required</span>
                      ) : (
                        <span className="text-[10px] font-bold text-gray-400">All Clear</span>
                      )}
                    </div>
                    <p className="mt-1 text-xl font-semibold tabular-nums text-amber-700/90 dark:text-amber-400/90">{pendingAssessment}</p>
                  </div>
                </div>

                <YourApplicationsCarousel
                  jobs={jobs}
                  onEditJob={setEditingJob}
                  onDeleteJob={handleDeleteJob}
                  onChangeJobStatus={handleChangeJobStatus}
                  searchQuery={searchQuery}
                />

                <DailyActivityTimeline
                  events={events}
                  jobs={jobs}
                  onAddClick={() => setAddEventModalOpen(true)}
                />
              </div>

              <div className="col-span-1 flex h-full min-h-0 w-full flex-col gap-5 overflow-hidden xl:col-span-4">
                <WorkloadStatusCard jobs={jobs} />
                <ApplicationStatsCard jobs={jobs} />
              </div>
            </div>
          )}

          {currentView === "projects" && (
            <KanbanBoardView
              jobs={jobs}
              onEditJob={setEditingJob}
              onDeleteJob={handleDeleteJob}
              onStatusChange={handleChangeJobStatus}
              searchQuery={searchQuery}
            />
          )}

          {currentView === "calendar" && (
            <CalendarView jobs={jobs} />
          )}

        </div>
      </div>
    </div>
  );
}