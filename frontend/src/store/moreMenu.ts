import { create } from "zustand";

interface MoreState {
  open: boolean;
  setOpen: (o: boolean) => void;
}

export const useMoreMenu = create<MoreState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
