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
}

interface LibraryState {
  shelves: Shelf[];
  addShelf: (shelf: Omit<Shelf, 'id' | 'bookCount' | 'isDefault'>) => void;
  removeShelf: (id: string) => void;
  updateShelf: (id: string, updates: Partial<Shelf>) => void;
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
  }
];

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set) => ({
      shelves: defaultShelves,
      addShelf: (shelfData) => {
        set((state) => {
          const newShelf: Shelf = {
            ...shelfData,
            id: Date.now().toString(36) + Math.random().toString(36).substring(2, 9),
            bookCount: 0,
            isDefault: false,
          };
          return { shelves: [...state.shelves, newShelf] };
        });
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
    }),
    {
      name: 'library-store',
      storage: createJSONStorage(() => secureStorage),
    }
  )
);
