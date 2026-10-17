/**
 * @project Reedo
 * @module chronicles
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-10-16
 * @description Centralized, scalable definitions for Chronicle Rewards & Honors.
 * Adding new chronicles or achievements here automatically propagates to Streak and Library screens.
 */

export type ChronicleCategory = "all" | "streak" | "reading" | "ritual";
export type ChronicleTheme = "navy" | "gold" | "parchment" | "ember" | "emerald";

export interface ChronicleUserStats {
  currentStreak: number;
  bestStreak: number;
  booksCount?: number;
  completedBooks?: number;
  hoursRead?: number;
  annotationsCount?: number;
}

export interface ChronicleItem {
  id: string;
  title: string;
  category: "streak" | "reading" | "ritual";
  description: string;
  requirement: string;
  icon: string;
  theme: ChronicleTheme;
  target: number;
  unit: "days" | "books" | "notes" | "hours" | "nights";
  reward: string;
  watermarkIcon?: string;
  // Dynamic calculation helpers
  computeUnlocked: (stats: ChronicleUserStats) => boolean;
  computeProgress: (stats: ChronicleUserStats) => number; // 0 to 100
}

export const CHRONICLE_ITEMS: ChronicleItem[] = [
  // 1. The Eternal Reader (Ultimate 365 Days Streak)
  {
    id: "eternal-reader",
    title: "The Eternal Reader",
    category: "streak",
    description: "Achieved by maintaining a streak for 365 days without a single disruption.",
    requirement: "365 consecutive days of reading",
    icon: "crown",
    watermarkIcon: "stars",
    theme: "navy",
    target: 365,
    unit: "days",
    reward: "Crown of the Archive + 500 Honor Points",
    computeUnlocked: (s) => Math.max(s.currentStreak, s.bestStreak) >= 365,
    computeProgress: (s) => Math.min(100, Math.round((Math.max(s.currentStreak, s.bestStreak) / 365) * 100)),
  },

  // 2. Midnight Scholar (30 Days Night Discipline)
  {
    id: "midnight-scholar",
    title: "Midnight Scholar",
    category: "ritual",
    description: "Read for 30 consecutive days in deep twilight between 11 PM and 2 AM.",
    requirement: "30 days of nocturnal reading",
    icon: "moonFilled",
    theme: "gold",
    target: 30,
    unit: "nights",
    reward: "Scholar Insignia + 50 Honor Points",
    computeUnlocked: (s) => Math.max(s.currentStreak, s.bestStreak) >= 30,
    computeProgress: (s) => Math.min(100, Math.round((Math.max(s.currentStreak, s.bestStreak) / 30) * 100)),
  },

  // 3. Scribe's Persistence (10 Days Streak)
  {
    id: "scribes-persistence",
    title: "Scribe's Persistence",
    category: "streak",
    description: "Read for 10 consecutive days. Distills an Ink Blot protector into your archive.",
    requirement: "10 consecutive days of reading",
    icon: "quillWrite",
    theme: "parchment",
    target: 10,
    unit: "days",
    reward: "1 Ink Blot Streak Protector",
    computeUnlocked: (s) => Math.max(s.currentStreak, s.bestStreak) >= 10,
    computeProgress: (s) => Math.min(100, Math.round((Math.max(s.currentStreak, s.bestStreak) / 10) * 100)),
  },

  // 4. Centurion Reader (100 Days Streak)
  {
    id: "centurion-reader",
    title: "Centurion Reader",
    category: "streak",
    description: "Reach the formidable centurion milestone of 100 consecutive days of reading.",
    requirement: "100 consecutive days of reading",
    icon: "medalStarFilled",
    watermarkIcon: "shieldCheck",
    theme: "navy",
    target: 100,
    unit: "days",
    reward: "Centurion Insignia + 200 Honor Points",
    computeUnlocked: (s) => Math.max(s.currentStreak, s.bestStreak) >= 100,
    computeProgress: (s) => Math.min(100, Math.round((Math.max(s.currentStreak, s.bestStreak) / 100) * 100)),
  },

  // 5. Week of Focus (7 Days Streak)
  {
    id: "week-of-focus",
    title: "Week of Focus",
    category: "streak",
    description: "Solidify your habit into a lasting literary momentum with a full week.",
    requirement: "7 consecutive days of reading",
    icon: "stars",
    theme: "gold",
    target: 7,
    unit: "days",
    reward: "25 Honor Points + Ink Blot",
    computeUnlocked: (s) => Math.max(s.currentStreak, s.bestStreak) >= 7,
    computeProgress: (s) => Math.min(100, Math.round((Math.max(s.currentStreak, s.bestStreak) / 7) * 100)),
  },

  // 6. First Sparks (3 Days Streak)
  {
    id: "first-sparks",
    title: "First Sparks",
    category: "streak",
    description: "Ignite the ritual with your initial 3-day reading discipline.",
    requirement: "3 consecutive days of reading",
    icon: "fireSolid",
    theme: "ember",
    target: 3,
    unit: "days",
    reward: "First Sparks Badge + 15 Honor Points",
    computeUnlocked: (s) => Math.max(s.currentStreak, s.bestStreak) >= 3,
    computeProgress: (s) => Math.min(100, Math.round((Math.max(s.currentStreak, s.bestStreak) / 3) * 100)),
  },

  // 7. First Folio (From Library > Honors)
  {
    id: "first-folio",
    title: "First Folio",
    category: "reading",
    description: "Finish your first curated volume and close its final chapter.",
    requirement: "1 completed book in archive",
    icon: "bookOpen",
    theme: "parchment",
    target: 1,
    unit: "books",
    reward: "Folio Seal + 20 Honor Points",
    computeUnlocked: (s) => (s.completedBooks || 0) >= 1,
    computeProgress: (s) => ((s.completedBooks || 0) >= 1 ? 100 : 0),
  },

  // 8. Marginaliaist (From Library > Honors)
  {
    id: "marginaliaist",
    title: "Marginaliaist",
    category: "reading",
    description: "Write 50 insightful book annotations or reflections in your personal archive.",
    requirement: "50 written annotations",
    icon: "editNote",
    theme: "emerald",
    target: 50,
    unit: "notes",
    reward: "Golden Quill Insignia",
    computeUnlocked: (s) => (s.annotationsCount || 0) >= 50,
    computeProgress: (s) => Math.min(100, Math.round(((s.annotationsCount || 0) / 50) * 100)),
  },

  // 9. Bibliophile (From Library > Honors)
  {
    id: "bibliophile",
    title: "Bibliophile",
    category: "reading",
    description: "Curate a personal library of over 100 titles in your digital collection.",
    requirement: "100 titles cataloged",
    icon: "library",
    theme: "navy",
    target: 100,
    unit: "books",
    reward: "Bibliophile Seal + Master Pin",
    computeUnlocked: (s) => (s.booksCount || 0) >= 100,
    computeProgress: (s) => Math.min(100, Math.round(((s.booksCount || 0) / 100) * 100)),
  },

  // 10. Night Owl (From Library > Honors)
  {
    id: "night-owl",
    title: "Night Owl",
    category: "ritual",
    description: "Read past midnight for 5 consecutive nights of contemplation.",
    requirement: "5 consecutive nights past midnight",
    icon: "moonFilled",
    theme: "gold",
    target: 5,
    unit: "nights",
    reward: "Nocturnal Feather Badge",
    computeUnlocked: (s) => (s.currentStreak >= 5),
    computeProgress: (s) => Math.min(100, Math.round((Math.min(s.currentStreak, 5) / 5) * 100)),
  },
];
