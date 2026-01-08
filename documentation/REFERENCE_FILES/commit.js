// backend/routes/commit.js
const express = require('express');
const router = express.Router();
const path = require('path');

// Core commit logic (runs the big Switchboard script)
const { openBoxCommit } = require(
    path.resolve(__dirname, '../../scripts/js/open-box')
);

router.post('/', async (req, res) => {
    const { boxMintAddress } = req.body;

    if (!boxMintAddress) {
        return res
            .status(400)
            .json({ success: false, error: 'Missing boxMintAddress' });
    }

    try {
        // ────────────────────────────────────────────────────────────────
        // Call the script → writes BoxState PDA, returns commit info
        // ────────────────────────────────────────────────────────────────
        const commit = await openBoxCommit(boxMintAddress);

        // Propagate any failure from the script back to the frontend
        if (!commit.success) {
            return res.status(500).json(commit);
        }

        // Nothing else to do (no metadata editing)
        return res.json(commit);
    } catch (err) {
        console.error('❌ Commit route error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
