import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { secureStorage } from "./secureStorage";

export interface ReadingNoteItem {
  id: string;
  bookId: string;
  userbookId?: string;
  bookTitle: string;
  bookAuthor: string;
  bookCover?: string;
  pageNumber: number;
  immersionSeconds: number;
  content: string;
  createdAt: string;
}

interface ReadingNotesState {
  notes: ReadingNoteItem[];
  addNote: (
    note: Omit<ReadingNoteItem, "id" | "createdAt">
  ) => ReadingNoteItem;
  deleteNote: (id: string) => void;
}

export function formatImmersionTimestamp(seconds: number): string {
  const safeSecs = Math.max(0, Math.floor(seconds || 0));
  const hrs = Math.floor(safeSecs / 3600);
  const mins = Math.floor((safeSecs % 3600) / 60);
  const secs = safeSecs % 60;
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
}

export function filterNotesForBook(
  notes: ReadingNoteItem[],
  bookId?: string,
  userbookId?: string,
  bookTitle?: string
): ReadingNoteItem[] {
  const normalizedTitle = bookTitle?.trim().toLowerCase();
  return notes
    .filter((n) => {
      if (bookId && n.bookId && String(n.bookId) === String(bookId)) {
        return true;
      }
      if (
        userbookId &&
        n.userbookId &&
        String(n.userbookId) === String(userbookId)
      ) {
        return true;
      }
      if (
        bookId &&
        n.userbookId &&
        String(n.userbookId) === String(bookId)
      ) {
        return true;
      }
      if (
        userbookId &&
        n.bookId &&
        String(n.bookId) === String(userbookId)
      ) {
        return true;
      }
      if (
        !bookId &&
        !userbookId &&
        normalizedTitle &&
        n.bookTitle?.trim().toLowerCase() === normalizedTitle
      ) {
        return true;
      }
      return false;
    })
    .sort((a, b) => {
      if (a.pageNumber !== b.pageNumber) {
        return a.pageNumber - b.pageNumber;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

export const useReadingNotesStore = create<ReadingNotesState>()(
  persist(
    (set) => ({
      notes: [],
      addNote: (noteData) => {
        const newNote: ReadingNoteItem = {
          ...noteData,
          id:
            Date.now().toString(36) +
            Math.random().toString(36).substring(2, 9),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          notes: [newNote, ...state.notes],
        }));
        return newNote;
      },
      deleteNote: (id) => {
        set((state) => ({
          notes: state.notes.filter((n) => n.id !== id),
        }));
      },
    }),
    {
      name: "reedo-reading-notes-storage",
      storage: createJSONStorage(() => secureStorage),
    }
  )
);

