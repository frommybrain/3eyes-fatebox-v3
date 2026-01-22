// store/useViewStore.js
// Zustand store for managing the current view/camera position on the homepage
// Used to coordinate camera transitions when clicking menu items

import { create } from 'zustand';

// =============================================================================
// CAMERA TRANSITION SETTINGS
// =============================================================================

// Transition speed (lower = faster, higher = slower)
export const CAMERA_SMOOTH_TIME = 0.2;

// Home camera position
export const HOME_CONFIG = {
    position: [-2.19, 1.13, 3.03],
    target: [0.01, 1.23, -0.09],
};

// About carousel positions (4 different views)
// position: [x, y, z] - where the camera is located
// target: [x, y, z] - where the camera is looking at
export const ABOUT_POSITIONS = [
    {
        position: [1.5, 1.7, 0.5],
        target: [0, 1.5, 0],
    },
    {
        position: [1.5, 1.2, 0.5],
        target: [0, 1, 0],
    },
    {
        position: [1.5, 1.0, 0.5],
        target: [0, 1, 0],
    },
    {
        position: [1.5, 0.5, 0.5],
        target: [0, 0.5, 0],
    },
];

// =============================================================================

const useViewStore = create((set, get) => ({
    // Current view: 'home' or 'about'
    currentView: 'home',

    // Current about position index (0-3)
    aboutIndex: 0,

    // Whether camera is currently transitioning
    isTransitioning: false,

    // Set the current view (triggers camera transition)
    setView: (view) => {
        if (view === 'about' && get().currentView !== 'about') {
            set({ currentView: 'about', aboutIndex: 0, isTransitioning: true });
        } else if (view === 'home' && get().currentView !== 'home') {
            set({ currentView: 'home', isTransitioning: true });
        }
    },

    // Called when camera transition completes
    onTransitionComplete: () => set({ isTransitioning: false }),

    // Go back to home view
    goHome: () => {
        if (get().currentView !== 'home') {
            set({ currentView: 'home', aboutIndex: 0, isTransitioning: true });
        }
    },

    // Navigate to next about position
    nextAbout: () => {
        const { aboutIndex } = get();
        const nextIndex = (aboutIndex + 1) % ABOUT_POSITIONS.length;
        set({ aboutIndex: nextIndex, isTransitioning: true });
    },

    // Navigate to previous about position
    prevAbout: () => {
        const { aboutIndex } = get();
        const prevIndex = (aboutIndex - 1 + ABOUT_POSITIONS.length) % ABOUT_POSITIONS.length;
        set({ aboutIndex: prevIndex, isTransitioning: true });
    },

    // Get current camera config based on view and index
    getCurrentConfig: () => {
        const { currentView, aboutIndex } = get();
        if (currentView === 'about') {
            return ABOUT_POSITIONS[aboutIndex] || ABOUT_POSITIONS[0];
        }
        return HOME_CONFIG;
    },
}));

export default useViewStore;
