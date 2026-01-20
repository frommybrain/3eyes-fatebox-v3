// store/usePurchasingStore.js
// Zustand store for global purchasing state
// Used to coordinate camera animations, box drops, and UI during box purchases

import { create } from 'zustand';

// Time to wait after last box drops before moving camera back (ms)
const SETTLE_DELAY_MS = 1500;

const usePurchasingStore = create((set, get) => ({
    // Whether purchasing flow is active (triggers camera move to purchase position)
    purchasing: false,

    // Total boxes expected in this purchase (set at start)
    totalExpected: 0,

    // Total boxes dropped so far
    totalDropped: 0,

    // Queue of boxes waiting to be dropped (increments as batches confirm)
    pendingBoxDrops: 0,

    // Timer for ending purchase after boxes settle
    _settleTimer: null,

    // Start purchasing with expected box count (moves camera to purchase position)
    startPurchasing: (expectedBoxes) => set({
        purchasing: true,
        totalExpected: expectedBoxes,
        totalDropped: 0,
        pendingBoxDrops: 0,
    }),

    // End purchasing (moves camera back to base position)
    endPurchasing: () => set({ purchasing: false }),

    // Queue boxes to drop (called when a batch confirms)
    queueBoxDrops: (count) => set((state) => ({
        pendingBoxDrops: state.pendingBoxDrops + count,
    })),

    // Consume one box from the drop queue (called by DroppingBox after spawning)
    consumeBoxDrop: () => {
        const state = get();
        const newDropped = state.totalDropped + 1;
        const newPending = Math.max(0, state.pendingBoxDrops - 1);

        set({
            pendingBoxDrops: newPending,
            totalDropped: newDropped,
        });

        // Clear any existing timer
        if (state._settleTimer) {
            clearTimeout(state._settleTimer);
        }

        // If all expected boxes have dropped, schedule camera return
        if (newDropped >= state.totalExpected && state.totalExpected > 0) {
            const timer = setTimeout(() => {
                get().endPurchasing();
            }, SETTLE_DELAY_MS);
            set({ _settleTimer: timer });
        }
    },

    // Get pending count (for silent reads)
    getPendingBoxDrops: () => get().pendingBoxDrops,
}));

export default usePurchasingStore;
