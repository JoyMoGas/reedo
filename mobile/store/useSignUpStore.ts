import { create } from "zustand";

interface SignUpState {
  full_name: string;
  username: string;
  birth_date: string;
  email: string;
  setStep1: (full_name: string, username: string) => void;
  setStep2: (birth_date: string) => void;
  setStep6: (email: string) => void;
  reset: () => void;
}

export const useSignUpStore = create<SignUpState>((set) => ({
  full_name: "",
  username: "",
  birth_date: "2000-01-01",
  email: "",

  setStep1: (full_name, username) => set({ full_name, username }),
  setStep2: (birth_date) => set({ birth_date }),
  setStep6: (email) => set({ email }),
  reset: () => set({ full_name: "", username: "", birth_date: "2000-01-01", email: "" }),
}));
