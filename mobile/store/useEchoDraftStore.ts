/**
 * @project Reedo
 * @module useEchoDraftStore
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-08-27
 */
import { create } from 'zustand';

export interface EchoDraftState {
  content: string;
  taggedBook: any | null;
  containsSpoilers: boolean;
  setContent: (content: string) => void;
  setTaggedBook: (book: any | null) => void;
  setContainsSpoilers: (spoilers: boolean) => void;
  resetDraft: () => void;
}

export const useEchoDraftStore = create<EchoDraftState>((set) => ({
  content: "",
  taggedBook: null,
  containsSpoilers: false,
  setContent: (content) => set({ content }),
  setTaggedBook: (book) => set({ taggedBook: book }),
  setContainsSpoilers: (spoilers) => set({ containsSpoilers: spoilers }),
  resetDraft: () => set({ content: "", taggedBook: null, containsSpoilers: false }),
}));
