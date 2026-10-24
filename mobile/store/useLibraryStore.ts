/**
 * @project Reedo
 * @module useLibraryStore
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-08-27
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { secureStorage } from './secureStorage';

export interface Shelf {
  id: string;
  name: string;
  description: string;
  color: string;
  isPrivate: boolean;
  bookCount: number;
  icon?: string;
  isDefault?: boolean;
  bookIds?: string[];
}

interface LibraryState {
  shelves: Shelf[];
  addShelf: (shelf: Omit<Shelf, 'id' | 'bookCount' | 'isDefault' | 'bookIds'>, initialBookId?: string) => Shelf;
  removeShelf: (id: string) => void;
  updateShelf: (id: string, updates: Partial<Shelf>) => void;
  addBookToShelf: (shelfId: string, bookId: string) => void;
  removeBookFromShelf: (shelfId: string, bookId: string) => void;
}

export const defaultShelves: Shelf[] = [
  {
    id: 'default-currently-reading',
    name: 'Currently Reading',
    description: 'The journey you are on right now.',
    color: '#C95F44', // Warm reddish orange
    isPrivate: false,
    bookCount: 0,
    icon: 'bookOpen',
    isDefault: true,
  },
  {
    id: 'default-favorites',
    name: 'Favorites',
    description: 'Your most cherished reads.',
    color: '#212842', // Navy
    isPrivate: false,
    bookCount: 0,
    icon: 'heartFilled',
    isDefault: true,
  },
  {
    id: 'default-read-later',
    name: 'Read Later',
    description: 'Books waiting to be explored.',
    color: '#3d4035', // Forest green hue
    isPrivate: true,
    bookCount: 0,
    icon: 'bookmarkOutline',
    isDefault: true,
  },
  {
    id: 'default-already-read',
    name: 'Already Read',
    description: 'Books you have fully conquered.',
    color: '#4A7C59',
    isPrivate: false,
    bookCount: 0,
    icon: 'checkCircle',
    isDefault: true,
  }
];

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set) => ({
      shelves: defaultShelves,
      addShelf: (shelfData, initialBookId) => {
        const newShelf: Shelf = {
          ...shelfData,
          id: Date.now().toString(36) + Math.random().toString(36).substring(2, 9),
          bookCount: initialBookId ? 1 : 0,
          bookIds: initialBookId ? [initialBookId] : [],
          isDefault: false,
        };
        set((state) => ({ shelves: [...state.shelves, newShelf] }));
        return newShelf;
      },
      removeShelf: (id) => {
        set((state) => ({
          shelves: state.shelves.filter((shelf) => shelf.id !== id || shelf.isDefault),
        }));
      },
      updateShelf: (id, updates) => {
        set((state) => ({
          shelves: state.shelves.map((shelf) => 
            shelf.id === id ? { ...shelf, ...updates } : shelf
          ),
        }));
      },
      addBookToShelf: (shelfId, bookId) => {
        set((state) => ({
          shelves: state.shelves.map((shelf) => {
            if (shelf.id !== shelfId) return shelf;
            const existingIds = shelf.bookIds || [];
            if (existingIds.includes(bookId)) return shelf;
            const updatedIds = [...existingIds, bookId];
            return {
              ...shelf,
              bookIds: updatedIds,
              bookCount: updatedIds.length,
            };
          }),
        }));
      },
      removeBookFromShelf: (shelfId, bookId) => {
        set((state) => ({
          shelves: state.shelves.map((shelf) => {
            if (shelf.id !== shelfId) return shelf;
            const existingIds = shelf.bookIds || [];
            const updatedIds = existingIds.filter((id) => id !== bookId);
            return {
              ...shelf,
              bookIds: updatedIds,
              bookCount: updatedIds.length,
            };
          }),
        }));
      },
    }),
    {
      name: 'library-store',
      storage: createJSONStorage(() => secureStorage),
    }
  )
);
