/**
 * @project Reedo
 * @module useSignUpStore
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-05-30
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { secureStorage } from "./secureStorage";

interface SignUpState {
  full_name: string;
  username: string;
  birth_date: string;
  email: string;
  favorite_genres: string[];
  favorite_authors: string[];
  favorite_books: any[];
  setStep1: (full_name: string, username: string) => void;
  setStep2: (birth_date: string) => void;
  setFavoriteGenres: (genres: string[]) => void;
  setFavoriteAuthors: (authors: string[]) => void;
  setFavoriteBooks: (books: any[]) => void;
  setStep6: (email: string) => void;
  reset: () => void;
}

export const useSignUpStore = create<SignUpState>()(
  persist(
    (set) => ({
      full_name: "",
      username: "",
      birth_date: "2000-01-01",
      email: "",
      favorite_genres: [],
      favorite_authors: [],
      favorite_books: [],

      setStep1: (full_name, username) => set({ full_name, username }),
      setStep2: (birth_date) => set({ birth_date }),
      setFavoriteGenres: (favorite_genres) => set({ favorite_genres }),
      setFavoriteAuthors: (favorite_authors) => set({ favorite_authors }),
      setFavoriteBooks: (favorite_books) => set({ favorite_books }),
      setStep6: (email) => set({ email }),
      reset: () => set({ 
        full_name: "", 
        username: "", 
        birth_date: "2000-01-01", 
        email: "",
        favorite_genres: [],
        favorite_authors: [],
        favorite_books: []
      }),
    }),
    {
      name: "signup-draft",
      storage: createJSONStorage(() => secureStorage),
    }
  )
);
