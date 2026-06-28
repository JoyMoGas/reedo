import { create } from "zustand";

interface SignUpState {
  full_name: string;
  username: string;
  birth_date: string;
  email: string;
  favorite_genres: string[];
  favorite_authors: string[];
  favorite_books: string[];
  setStep1: (full_name: string, username: string) => void;
  setStep2: (birth_date: string) => void;
  setFavoriteGenres: (genres: string[]) => void;
  setFavoriteAuthors: (authors: string[]) => void;
  setFavoriteBooks: (books: string[]) => void;
  setStep6: (email: string) => void;
  reset: () => void;
}

export const useSignUpStore = create<SignUpState>((set) => ({
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
}));
