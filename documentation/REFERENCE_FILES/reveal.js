// backend/routes/reveal.js
const express = require('express');
const router  = express.Router();
const path    = require('path');

const { openBoxReveal } = require(
  path.resolve(__dirname, '../../scripts/js/open-box')
);

// (optional) if you later want to write “Revealed / Reward” back into
// metadata you can import updateMetadata here exactly like the commit route.

router.post('/', async (req, res) => {
  const { boxMintAddress } = req.body;
  if (!boxMintAddress)
    return res.status(400).json({ success:false, error:'Missing boxMintAddress' });

  try {
    /* STEP A — run the heavy-lifting script */
    const reveal = await openBoxReveal(boxMintAddress);
    if (!reveal.success) return res.status(500).json(reveal);

    /* STEP B —  (optional) update metadata the same way you plan to later */

    return res.json(reveal);
  } catch (err) {
    console.error('❌ Reveal route error:', err);
    res.status(500).json({ success:false, error:err.message });
  }
});

module.exports = router;
