// store/useOpeningStore.js
// Zustand store for global box opening state (from ProjectPage)
// Used to coordinate camera animations and UI during box opening flow

import { create } from 'zustand';

const useOpeningStore = create((set, get) => ({
    // Whether opening flow is active (triggers camera/UI changes)
    opening: false,

    // Current step in the opening process
    // 'committing' | 'waiting' | 'revealing' | 'settling' | null
    openingStep: null,

    // Message to display during opening
    openingMessage: null,

    // Box being opened (for reference)
    openingBox: null,

    // Start opening flow (moves camera to open position)
    startOpening: (box) => set({
        opening: true,
        openingBox: box,
        openingStep: 'committing',
        openingMessage: 'Committing randomness...',
    }),

    // Update the current step
    setOpeningStep: (step, message) => set({
        openingStep: step,
        openingMessage: message || get().openingMessage,
    }),

    // End opening flow (resets state)
    endOpening: () => set({
        opening: false,
        openingStep: null,
        openingMessage: null,
        openingBox: null,
    }),

    // Check if opening is active
    isOpening: () => get().opening,
}));

export default useOpeningStore;
