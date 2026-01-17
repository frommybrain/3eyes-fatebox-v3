Box 1 - straight to dashboard, no refresh
Reveal with no refresh

2026-01-15T00:05:42.937Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:06:06.260Z - POST /api/program/build-commit-box-tx

📦 Building commit box transaction for box 1 in project 11...
   Owner: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   Platform config PDA: 6zXM6GCzTKcKZGvn1w5hLBfR29xDep3wYkC6Utjuex1t
   Box instance PDA: 56Eg2WMFfG9RSTDW7Rj42XMV4SpDLhSMM44ZoJG9uhVA
   Project config PDA: 9FgfYV6NkeyoGxwNzEAKuXWtxpNbtBnXTgr9gQUG5Kj3

🎰 Setting up Switchboard VRF randomness...

[Switchboard] Creating randomness account...
   Payer: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7
   Randomness account: AKcFtKHv8wcxPcRyKGuM9MVHLwNL93q8Gi1EgR2kjxAk
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7
   Randomness account: AKcFtKHv8wcxPcRyKGuM9MVHLwNL93q8Gi1EgR2kjxAk
[Switchboard] Creating commit instruction...
   Authority: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7

📝 Building commit transaction...
   Added: Create randomness account instruction
   Added: Commit to randomness instruction
   Added: commit_box instruction

✅ Commit transaction built successfully!
   Total instructions: 3
   User has 1 HOUR to reveal after this commits
2026-01-15T00:06:12.753Z - POST /api/program/confirm-commit

✅ Confirming commit for box 1 in project 11...
   Transaction: 2Bh1A534WyQvJrnzAJCJ3nFef3bjXYge92thw3QLW2HrJupp3mmwAV9pKZfHKHyoHZq3aivAjvdGeZ3srSC6saRp
   Randomness account: AKcFtKHv8wcxPcRyKGuM9MVHLwNL93q8Gi1EgR2kjxAk
✅ Box commit recorded in database
   Committed at: 2026-01-15T00:06:12.932Z
   User has until: 2026-01-15T01:06:13.049Z to reveal
2026-01-15T00:06:13.120Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:06:27.142Z - POST /api/program/build-reveal-box-tx

🎰 Building reveal box transaction with Switchboard VRF...
   Project ID: 11
   Box ID: 1
   Owner: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   Time remaining to reveal: 3585 seconds
   Randomness account: AKcFtKHv8wcxPcRyKGuM9MVHLwNL93q8Gi1EgR2kjxAk
   Platform Config PDA: 6zXM6GCzTKcKZGvn1w5hLBfR29xDep3wYkC6Utjuex1t
   Project Config PDA: 9FgfYV6NkeyoGxwNzEAKuXWtxpNbtBnXTgr9gQUG5Kj3
   Box Instance PDA: 56Eg2WMFfG9RSTDW7Rj42XMV4SpDLhSMM44ZoJG9uhVA
   Box created at: 2026-01-14T21:21:43.410Z
   Hold time: 9883.58999991417 seconds
   Luck interval: 1 seconds
   Calculated luck: 60/60

🎰 Creating Switchboard VRF reveal instruction...
[Switchboard] Loading existing randomness account: AKcFtKHv8wcxPcRyKGuM9MVHLwNL93q8Gi1EgR2kjxAk

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7
[Switchboard] Creating reveal instruction...
   Randomness pubkey: AKcFtKHv8wcxPcRyKGuM9MVHLwNL93q8Gi1EgR2kjxAk
   Payer: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
   Network: devnet
   Attempt 1/3: Trying SDK revealIx...
   SDK revealIx succeeded!
   Replacing payer DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN with buyer DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
   Reveal instruction created successfully
   Instruction program: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Instruction keys: 12 accounts
   Required signers: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN, DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN

📝 Building combined reveal transaction...
   Added: Switchboard reveal instruction
   Added: reveal_box instruction with randomness account

✅ Reveal transaction built successfully with Switchboard VRF!
   Total instructions: 2
2026-01-15T00:06:36.832Z - POST /api/program/confirm-reveal

✅ Confirming box 1 reveal for project 11...
   Transaction: jeqabUC6XmF7ftGjPQN1hiRbaUQxfevT8kEozCtJwwRBTdvrd2br7adR8zBALG97t16eqPcm5TwBAokUuwc6VuR
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   On-chain reward: Jackpot (tier 4) - 1150000000000 (1150 CATS)
   Luck: 60/60, Random: 68.37%
✅ Box reveal recorded in database


Box 2
Refresh dashboard and open

2026-01-15T00:09:51.984Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:09:56.543Z - POST /api/program/build-commit-box-tx

📦 Building commit box transaction for box 2 in project 11...
   Owner: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   Platform config PDA: 6zXM6GCzTKcKZGvn1w5hLBfR29xDep3wYkC6Utjuex1t
   Box instance PDA: 5555vuzqeuy2rW1ngXwsUNyeBx7VQt8bS7bBsQxPNW14
   Project config PDA: 9FgfYV6NkeyoGxwNzEAKuXWtxpNbtBnXTgr9gQUG5Kj3

🎰 Setting up Switchboard VRF randomness...

[Switchboard] Creating randomness account...
   Payer: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7
   Randomness account: Fv51D5ieu6M3ddSf2jWeWkJAUmuTt78fSFpjebFogh3Y
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7
   Randomness account: Fv51D5ieu6M3ddSf2jWeWkJAUmuTt78fSFpjebFogh3Y
[Switchboard] Creating commit instruction...
   Authority: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7

📝 Building commit transaction...
   Added: Create randomness account instruction
   Added: Commit to randomness instruction
   Added: commit_box instruction

✅ Commit transaction built successfully!
   Total instructions: 3
   User has 1 HOUR to reveal after this commits
2026-01-15T00:10:02.149Z - POST /api/program/confirm-commit

✅ Confirming commit for box 2 in project 11...
   Transaction: 4y8SKL9dw1U6hCXP7d9G9isB8Fa7MR7hqLGMSmVuqkD638SdkDk5JNDcRig1NYcbXNZz1zJRc186HnUvzsg9VvnV
   Randomness account: Fv51D5ieu6M3ddSf2jWeWkJAUmuTt78fSFpjebFogh3Y
✅ Box commit recorded in database
   Committed at: 2026-01-15T00:10:02.263Z
   User has until: 2026-01-15T01:10:02.385Z to reveal
2026-01-15T00:10:02.476Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:10:15.807Z - POST /api/program/build-reveal-box-tx

🎰 Building reveal box transaction with Switchboard VRF...
   Project ID: 11
   Box ID: 2
   Owner: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   Time remaining to reveal: 3585 seconds
   Randomness account: Fv51D5ieu6M3ddSf2jWeWkJAUmuTt78fSFpjebFogh3Y
   Platform Config PDA: 6zXM6GCzTKcKZGvn1w5hLBfR29xDep3wYkC6Utjuex1t
   Project Config PDA: 9FgfYV6NkeyoGxwNzEAKuXWtxpNbtBnXTgr9gQUG5Kj3
   Box Instance PDA: 5555vuzqeuy2rW1ngXwsUNyeBx7VQt8bS7bBsQxPNW14
   Box created at: 2026-01-14T21:26:57.971Z
   Hold time: 9798.029000043869 seconds
   Luck interval: 1 seconds
   Calculated luck: 60/60

🎰 Creating Switchboard VRF reveal instruction...
[Switchboard] Loading existing randomness account: Fv51D5ieu6M3ddSf2jWeWkJAUmuTt78fSFpjebFogh3Y

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7
[Switchboard] Creating reveal instruction...
   Randomness pubkey: Fv51D5ieu6M3ddSf2jWeWkJAUmuTt78fSFpjebFogh3Y
   Payer: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
   Network: devnet
   Attempt 1/3: Trying SDK revealIx...
   SDK revealIx succeeded!
   Replacing payer DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN with buyer DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
   Reveal instruction created successfully
   Instruction program: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Instruction keys: 12 accounts
   Required signers: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN, DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN

📝 Building combined reveal transaction...
   Added: Switchboard reveal instruction
   Added: reveal_box instruction with randomness account

✅ Reveal transaction built successfully with Switchboard VRF!
   Total instructions: 2
2026-01-15T00:10:24.894Z - POST /api/program/confirm-reveal

✅ Confirming box 2 reveal for project 11...
   Transaction: 3ycKHtcuRhqmhr5ot4GpwpuFgHJejpb3jMicJP3YyJcP5cu3bCmdN9mGDaQWNEsyV2N331nm8Lc9XEqfU84yyryH
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   On-chain reward: Rebate (tier 1) - 92000000000 (92 CATS)
   Luck: 60/60, Random: 58.21%
✅ Box reveal recorded in database
2026-01-15T00:10:25.591Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN

Box 3 - refresh before open, refresh before reveal
2026-01-15T00:09:51.984Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:09:56.543Z - POST /api/program/build-commit-box-tx

📦 Building commit box transaction for box 2 in project 11...
   Owner: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   Platform config PDA: 6zXM6GCzTKcKZGvn1w5hLBfR29xDep3wYkC6Utjuex1t
   Box instance PDA: 5555vuzqeuy2rW1ngXwsUNyeBx7VQt8bS7bBsQxPNW14
   Project config PDA: 9FgfYV6NkeyoGxwNzEAKuXWtxpNbtBnXTgr9gQUG5Kj3

🎰 Setting up Switchboard VRF randomness...

[Switchboard] Creating randomness account...
   Payer: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7
   Randomness account: Fv51D5ieu6M3ddSf2jWeWkJAUmuTt78fSFpjebFogh3Y
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7
   Randomness account: Fv51D5ieu6M3ddSf2jWeWkJAUmuTt78fSFpjebFogh3Y
[Switchboard] Creating commit instruction...
   Authority: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7

📝 Building commit transaction...
   Added: Create randomness account instruction
   Added: Commit to randomness instruction
   Added: commit_box instruction

✅ Commit transaction built successfully!
   Total instructions: 3
   User has 1 HOUR to reveal after this commits
2026-01-15T00:10:02.149Z - POST /api/program/confirm-commit

✅ Confirming commit for box 2 in project 11...
   Transaction: 4y8SKL9dw1U6hCXP7d9G9isB8Fa7MR7hqLGMSmVuqkD638SdkDk5JNDcRig1NYcbXNZz1zJRc186HnUvzsg9VvnV
   Randomness account: Fv51D5ieu6M3ddSf2jWeWkJAUmuTt78fSFpjebFogh3Y
✅ Box commit recorded in database
   Committed at: 2026-01-15T00:10:02.263Z
   User has until: 2026-01-15T01:10:02.385Z to reveal
2026-01-15T00:10:02.476Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:10:15.807Z - POST /api/program/build-reveal-box-tx

🎰 Building reveal box transaction with Switchboard VRF...
   Project ID: 11
   Box ID: 2
   Owner: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   Time remaining to reveal: 3585 seconds
   Randomness account: Fv51D5ieu6M3ddSf2jWeWkJAUmuTt78fSFpjebFogh3Y
   Platform Config PDA: 6zXM6GCzTKcKZGvn1w5hLBfR29xDep3wYkC6Utjuex1t
   Project Config PDA: 9FgfYV6NkeyoGxwNzEAKuXWtxpNbtBnXTgr9gQUG5Kj3
   Box Instance PDA: 5555vuzqeuy2rW1ngXwsUNyeBx7VQt8bS7bBsQxPNW14
   Box created at: 2026-01-14T21:26:57.971Z
   Hold time: 9798.029000043869 seconds
   Luck interval: 1 seconds
   Calculated luck: 60/60

🎰 Creating Switchboard VRF reveal instruction...
[Switchboard] Loading existing randomness account: Fv51D5ieu6M3ddSf2jWeWkJAUmuTt78fSFpjebFogh3Y

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7
[Switchboard] Creating reveal instruction...
   Randomness pubkey: Fv51D5ieu6M3ddSf2jWeWkJAUmuTt78fSFpjebFogh3Y
   Payer: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
   Network: devnet
   Attempt 1/3: Trying SDK revealIx...
   SDK revealIx succeeded!
   Replacing payer DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN with buyer DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
   Reveal instruction created successfully
   Instruction program: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Instruction keys: 12 accounts
   Required signers: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN, DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN

📝 Building combined reveal transaction...
   Added: Switchboard reveal instruction
   Added: reveal_box instruction with randomness account

✅ Reveal transaction built successfully with Switchboard VRF!
   Total instructions: 2
2026-01-15T00:10:24.894Z - POST /api/program/confirm-reveal

✅ Confirming box 2 reveal for project 11...
   Transaction: 3ycKHtcuRhqmhr5ot4GpwpuFgHJejpb3jMicJP3YyJcP5cu3bCmdN9mGDaQWNEsyV2N331nm8Lc9XEqfU84yyryH
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   On-chain reward: Rebate (tier 1) - 92000000000 (92 CATS)
   Luck: 60/60, Random: 58.21%
✅ Box reveal recorded in database
2026-01-15T00:10:25.591Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:10:51.416Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:10:51.656Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:10:54.772Z - POST /api/program/build-commit-box-tx

📦 Building commit box transaction for box 3 in project 11...
   Owner: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   Platform config PDA: 6zXM6GCzTKcKZGvn1w5hLBfR29xDep3wYkC6Utjuex1t
   Box instance PDA: 4rR76UMRoA6GcfFXPujBhSjyLQZgBESgzYAXK1PS1gyZ
   Project config PDA: 9FgfYV6NkeyoGxwNzEAKuXWtxpNbtBnXTgr9gQUG5Kj3

🎰 Setting up Switchboard VRF randomness...

[Switchboard] Creating randomness account...
   Payer: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7
   Randomness account: 8PnSZ91dmgKDUnTSeBBMFi4oCc7yWaBSdDiNkMuk6QhR
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7
   Randomness account: 8PnSZ91dmgKDUnTSeBBMFi4oCc7yWaBSdDiNkMuk6QhR
[Switchboard] Creating commit instruction...
   Authority: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7

📝 Building commit transaction...
   Added: Create randomness account instruction
   Added: Commit to randomness instruction
   Added: commit_box instruction

✅ Commit transaction built successfully!
   Total instructions: 3
   User has 1 HOUR to reveal after this commits
2026-01-15T00:10:59.432Z - POST /api/program/confirm-commit

✅ Confirming commit for box 3 in project 11...
   Transaction: 3KigNrVJZPZ4PCmVxwCA9GnKeGnH7nZv6hfZWHYTpyupMEsq6NkypqrdfpGi1WcfK98aGayTqFhEiqk1UcW8v5wX
   Randomness account: 8PnSZ91dmgKDUnTSeBBMFi4oCc7yWaBSdDiNkMuk6QhR
✅ Box commit recorded in database
   Committed at: 2026-01-15T00:10:59.549Z
   User has until: 2026-01-15T01:10:59.695Z to reveal
2026-01-15T00:10:59.783Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:11:12.597Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:11:12.788Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:11:15.804Z - POST /api/program/build-reveal-box-tx

🎰 Building reveal box transaction with Switchboard VRF...
   Project ID: 11
   Box ID: 3
   Owner: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   Time remaining to reveal: 3583 seconds
   Randomness account: 8PnSZ91dmgKDUnTSeBBMFi4oCc7yWaBSdDiNkMuk6QhR
   Platform Config PDA: 6zXM6GCzTKcKZGvn1w5hLBfR29xDep3wYkC6Utjuex1t
   Project Config PDA: 9FgfYV6NkeyoGxwNzEAKuXWtxpNbtBnXTgr9gQUG5Kj3
   Box Instance PDA: 4rR76UMRoA6GcfFXPujBhSjyLQZgBESgzYAXK1PS1gyZ
   Box created at: 2026-01-14T22:36:56.906Z
   Hold time: 5659.0940001010895 seconds
   Luck interval: 1 seconds
   Calculated luck: 60/60

🎰 Creating Switchboard VRF reveal instruction...
[Switchboard] Loading existing randomness account: 8PnSZ91dmgKDUnTSeBBMFi4oCc7yWaBSdDiNkMuk6QhR

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7
[Switchboard] Creating reveal instruction...
   Randomness pubkey: 8PnSZ91dmgKDUnTSeBBMFi4oCc7yWaBSdDiNkMuk6QhR
   Payer: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
   Network: devnet
   Attempt 1/3: Trying SDK revealIx...
   SDK revealIx succeeded!
   Replacing payer DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN with buyer DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
   Reveal instruction created successfully
   Instruction program: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Instruction keys: 12 accounts
   Required signers: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN, DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN

📝 Building combined reveal transaction...
   Added: Switchboard reveal instruction
   Added: reveal_box instruction with randomness account

✅ Reveal transaction built successfully with Switchboard VRF!
   Total instructions: 2
2026-01-15T00:11:24.325Z - POST /api/program/confirm-reveal

✅ Confirming box 3 reveal for project 11...
   Transaction: 41AHpDWnfLnT7kVKguaCFpBpQfpit8AN3dUUBFZVtKXCJuNQoAWyiaPmTZRbVZcGLp8Mdu28YkY6SQnMYpCsu5t
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   On-chain reward: Rebate (tier 1) - 92000000000 (92 CATS)
   Luck: 16/60, Random: 1.44%
✅ Box reveal recorded in database
2026-01-15T00:11:25.027Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN



Bx 1, no page refresh, settle box
2026-01-15T00:11:25.027Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:12:21.093Z - POST /api/program/build-settle-box-tx

💰 Building settle box transaction...
   Project ID: 11
   Box ID: 1
   Owner: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   Project Config PDA: 9FgfYV6NkeyoGxwNzEAKuXWtxpNbtBnXTgr9gQUG5Kj3
   Box Instance PDA: 56Eg2WMFfG9RSTDW7Rj42XMV4SpDLhSMM44ZoJG9uhVA
   Vault Token Account: AieQ6gPSeq2EraG6ZJYUFYAWdC8ZuQ6zroYdwsjtedfY
   Owner Token Account: G1v9RGf4ySEXCoAS7QLxLnSWPmASHjNt5mpcEgosBjCH
✅ Settle transaction built successfully
   Reward to claim: 1150 CATS
2026-01-15T00:12:28.311Z - POST /api/program/confirm-settle

✅ Confirming box 1 settlement for project 11...
   Transaction: XiacsH5zHQj4vavWeEVHT6cqW42BturxqA6EtCKEZVQdBepfXk2MRdsqP1fjQkqrt2GZmLGuvyWf69Yh4im45uX
✅ Box settlement confirmed
2026-01-15T00:12:28.714Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgNBox 2, refresh page and settle
2026-01-15T00:11:25.027Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:12:21.093Z - POST /api/program/build-settle-box-tx

💰 Building settle box transaction...
   Project ID: 11
   Box ID: 1
   Owner: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   Project Config PDA: 9FgfYV6NkeyoGxwNzEAKuXWtxpNbtBnXTgr9gQUG5Kj3
   Box Instance PDA: 56Eg2WMFfG9RSTDW7Rj42XMV4SpDLhSMM44ZoJG9uhVA
   Vault Token Account: AieQ6gPSeq2EraG6ZJYUFYAWdC8ZuQ6zroYdwsjtedfY
   Owner Token Account: G1v9RGf4ySEXCoAS7QLxLnSWPmASHjNt5mpcEgosBjCH
✅ Settle transaction built successfully
   Reward to claim: 1150 CATS
2026-01-15T00:12:28.311Z - POST /api/program/confirm-settle

✅ Confirming box 1 settlement for project 11...
   Transaction: XiacsH5zHQj4vavWeEVHT6cqW42BturxqA6EtCKEZVQdBepfXk2MRdsqP1fjQkqrt2GZmLGuvyWf69Yh4im45uX
✅ Box settlement confirmed
2026-01-15T00:12:28.714Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:12:47.475Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:12:47.643Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:12:51.308Z - POST /api/program/build-settle-box-tx

💰 Building settle box transaction...
   Project ID: 11
   Box ID: 2
   Owner: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   Project Config PDA: 9FgfYV6NkeyoGxwNzEAKuXWtxpNbtBnXTgr9gQUG5Kj3
   Box Instance PDA: 5555vuzqeuy2rW1ngXwsUNyeBx7VQt8bS7bBsQxPNW14
   Vault Token Account: AieQ6gPSeq2EraG6ZJYUFYAWdC8ZuQ6zroYdwsjtedfY
   Owner Token Account: G1v9RGf4ySEXCoAS7QLxLnSWPmASHjNt5mpcEgosBjCH
✅ Settle transaction built successfully
   Reward to claim: 92 CATS
2026-01-15T00:12:56.478Z - POST /api/program/confirm-settle

✅ Confirming box 2 settlement for project 11...
   Transaction: 3SbZip5uB1DFhFwPS4Jo3prkLQtATv8jCVgw4auK8DwFx9ZL9h8N9AmnCNNpLaTKeF57SVkUQLBPrPLUSPVRb88a
✅ Box settlement confirmed
2026-01-15T00:12:56.874Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN

Box 3 - come from home page and hard refresh page
2026-01-15T00:11:25.027Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:12:21.093Z - POST /api/program/build-settle-box-tx

💰 Building settle box transaction...
   Project ID: 11
   Box ID: 1
   Owner: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   Project Config PDA: 9FgfYV6NkeyoGxwNzEAKuXWtxpNbtBnXTgr9gQUG5Kj3
   Box Instance PDA: 56Eg2WMFfG9RSTDW7Rj42XMV4SpDLhSMM44ZoJG9uhVA
   Vault Token Account: AieQ6gPSeq2EraG6ZJYUFYAWdC8ZuQ6zroYdwsjtedfY
   Owner Token Account: G1v9RGf4ySEXCoAS7QLxLnSWPmASHjNt5mpcEgosBjCH
✅ Settle transaction built successfully
   Reward to claim: 1150 CATS
2026-01-15T00:12:28.311Z - POST /api/program/confirm-settle

✅ Confirming box 1 settlement for project 11...
   Transaction: XiacsH5zHQj4vavWeEVHT6cqW42BturxqA6EtCKEZVQdBepfXk2MRdsqP1fjQkqrt2GZmLGuvyWf69Yh4im45uX
✅ Box settlement confirmed
2026-01-15T00:12:28.714Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:12:47.475Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:12:47.643Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:12:51.308Z - POST /api/program/build-settle-box-tx

💰 Building settle box transaction...
   Project ID: 11
   Box ID: 2
   Owner: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   Project Config PDA: 9FgfYV6NkeyoGxwNzEAKuXWtxpNbtBnXTgr9gQUG5Kj3
   Box Instance PDA: 5555vuzqeuy2rW1ngXwsUNyeBx7VQt8bS7bBsQxPNW14
   Vault Token Account: AieQ6gPSeq2EraG6ZJYUFYAWdC8ZuQ6zroYdwsjtedfY
   Owner Token Account: G1v9RGf4ySEXCoAS7QLxLnSWPmASHjNt5mpcEgosBjCH
✅ Settle transaction built successfully
   Reward to claim: 92 CATS
2026-01-15T00:12:56.478Z - POST /api/program/confirm-settle

✅ Confirming box 2 settlement for project 11...
   Transaction: 3SbZip5uB1DFhFwPS4Jo3prkLQtATv8jCVgw4auK8DwFx9ZL9h8N9AmnCNNpLaTKeF57SVkUQLBPrPLUSPVRb88a
✅ Box settlement confirmed
2026-01-15T00:12:56.874Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:13:32.536Z - GET /api/projects/boxes/by-owner/EBTBZAMbacjommLBDKYhfNGwnKK7Fise5gvwmqDZFsGh
2026-01-15T00:13:34.619Z - GET /api/vault/balance/11

💰 Fetching vault balance for project 11...
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
✅ Vault balance: 9100.200000000 CATS
2026-01-15T00:13:34.992Z - GET /api/vault/balance/11

💰 Fetching vault balance for project 11...
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
✅ Vault balance: 9100.200000000 CATS
2026-01-15T00:13:37.446Z - GET /api/projects/boxes/by-owner/EBTBZAMbacjommLBDKYhfNGwnKK7Fise5gvwmqDZFsGh
2026-01-15T00:13:37.541Z - GET /api/projects/boxes/by-owner/EBTBZAMbacjommLBDKYhfNGwnKK7Fise5gvwmqDZFsGh
2026-01-15T00:13:43.346Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:13:53.411Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:13:53.561Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:13:57.197Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:13:57.278Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:14:17.059Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:14:17.202Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:14:19.641Z - POST /api/program/build-settle-box-tx

💰 Building settle box transaction...
   Project ID: 11
   Box ID: 3
   Owner: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   Project Config PDA: 9FgfYV6NkeyoGxwNzEAKuXWtxpNbtBnXTgr9gQUG5Kj3
   Box Instance PDA: 4rR76UMRoA6GcfFXPujBhSjyLQZgBESgzYAXK1PS1gyZ
   Vault Token Account: AieQ6gPSeq2EraG6ZJYUFYAWdC8ZuQ6zroYdwsjtedfY
   Owner Token Account: G1v9RGf4ySEXCoAS7QLxLnSWPmASHjNt5mpcEgosBjCH
✅ Settle transaction built successfully
   Reward to claim: 92 CATS
2026-01-15T00:14:25.428Z - POST /api/program/confirm-settle

✅ Confirming box 3 settlement for project 11...
   Transaction: YGnr88THjxofUKFfLVtbtuGwtWsvZM8HVfBqztSTs4zHp1BrH92tYBpuZSvqwucApCHEeqHVHEottHH23U2BNCL
✅ Box settlement confirmed
2026-01-15T00:14:25.849Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN


Buy box 4, open straight away, reveal and claim, no refreshes

2026-01-15T00:14:25.849Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:16:41.533Z - POST /api/program/build-create-box-tx

🎲 Building create box transaction for project 11...
   Buyer: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   Project: cats
   Box price: 115 CATS
   Current boxes created: 3
   Next box ID (counter + 1): 4
   Platform config PDA: 6zXM6GCzTKcKZGvn1w5hLBfR29xDep3wYkC6Utjuex1t
   Box instance PDA: H5XReBeDmVtNbQ16vDNvcYg8na8nwjMKie7LhWrmFyWn
   Vault token account: AieQ6gPSeq2EraG6ZJYUFYAWdC8ZuQ6zroYdwsjtedfY
   Treasury PDA: 3mmY9LXhBuNyH7pZDXEBU24QoBwkYT9NWHgHD6PweoPZ
   Treasury token account: 4NjUf1aFYHkR63DUcRHnnuQZTLitfkL3YS2VB2obifxB
   Buyer token account: G1v9RGf4ySEXCoAS7QLxLnSWPmASHjNt5mpcEgosBjCH

💰 Fee split (4% platform commission):
   Total box price: 115 CATS
   → Platform treasury: 4.6 CATS (4%)
   → Creator vault: 110.4 CATS (96%)

📝 Building purchase transaction...
   Added: Create box instruction (pending state, with commission split)

✅ Transaction built successfully!
   Total instructions: 1
   Box will be created in PENDING state (no randomness yet)
2026-01-15T00:16:48.403Z - POST /api/program/confirm-box-creation

✅ Confirming box 4 creation for project 11...
   Transaction: 5WsRQ9u3qfSS8YPXFGKdp5x8C9ebNPdA7F3r2vY9meXByryaLP4yXdTfydUB97yyHqqFsR7PgD63TW5Q1CNf9Q2R
✅ Box recorded in database
2026-01-15T00:17:00.755Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:17:00.919Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:17:03.442Z - POST /api/program/build-commit-box-tx

📦 Building commit box transaction for box 4 in project 11...
   Owner: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   Platform config PDA: 6zXM6GCzTKcKZGvn1w5hLBfR29xDep3wYkC6Utjuex1t
   Box instance PDA: H5XReBeDmVtNbQ16vDNvcYg8na8nwjMKie7LhWrmFyWn
   Project config PDA: 9FgfYV6NkeyoGxwNzEAKuXWtxpNbtBnXTgr9gQUG5Kj3

🎰 Setting up Switchboard VRF randomness...

[Switchboard] Creating randomness account...
   Payer: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7
   Randomness account: CbsLFFr9x4VDtnoiEdkAn9t5BbqNKJJkhJVvD4uhe9Lx
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7
   Randomness account: CbsLFFr9x4VDtnoiEdkAn9t5BbqNKJJkhJVvD4uhe9Lx
[Switchboard] Creating commit instruction...
   Authority: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7

📝 Building commit transaction...
   Added: Create randomness account instruction
   Added: Commit to randomness instruction
   Added: commit_box instruction

✅ Commit transaction built successfully!
   Total instructions: 3
   User has 1 HOUR to reveal after this commits
2026-01-15T00:17:07.949Z - POST /api/program/confirm-commit

✅ Confirming commit for box 4 in project 11...
   Transaction: 7CbPRs954y7WCkERFNHG9Wta2BMdABb9aAVa85g9H2bFoWzovYYhYkR34qiackNTfevncEvtoPsi4Wh1zrpeEf8
   Randomness account: CbsLFFr9x4VDtnoiEdkAn9t5BbqNKJJkhJVvD4uhe9Lx
✅ Box commit recorded in database
   Committed at: 2026-01-15T00:17:08.069Z
   User has until: 2026-01-15T01:17:08.200Z to reveal
2026-01-15T00:17:08.288Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:17:19.808Z - POST /api/program/build-reveal-box-tx

🎰 Building reveal box transaction with Switchboard VRF...
   Project ID: 11
   Box ID: 4
   Owner: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   Time remaining to reveal: 3587 seconds
   Randomness account: CbsLFFr9x4VDtnoiEdkAn9t5BbqNKJJkhJVvD4uhe9Lx
   Platform Config PDA: 6zXM6GCzTKcKZGvn1w5hLBfR29xDep3wYkC6Utjuex1t
   Project Config PDA: 9FgfYV6NkeyoGxwNzEAKuXWtxpNbtBnXTgr9gQUG5Kj3
   Box Instance PDA: H5XReBeDmVtNbQ16vDNvcYg8na8nwjMKie7LhWrmFyWn
   Box created at: 2026-01-15T00:16:48.515Z
   Hold time: 31.484999895095825 seconds
   Luck interval: 1 seconds
   Calculated luck: 36/60

🎰 Creating Switchboard VRF reveal instruction...
[Switchboard] Loading existing randomness account: CbsLFFr9x4VDtnoiEdkAn9t5BbqNKJJkhJVvD4uhe9Lx

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7
[Switchboard] Creating reveal instruction...
   Randomness pubkey: CbsLFFr9x4VDtnoiEdkAn9t5BbqNKJJkhJVvD4uhe9Lx
   Payer: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
   Network: devnet
   Attempt 1/3: Trying SDK revealIx...
fetchRandomnessReveal error AxiosError: read ECONNRESET
    at AxiosError.from (/Users/samskirrow/Dropbox/From My Brain/GIT/3eyes-fatebox-v3/backend/node_modules/axios/dist/node/axios.cjs:914:14)
    at RedirectableRequest.handleRequestError (/Users/samskirrow/Dropbox/From My Brain/GIT/3eyes-fatebox-v3/backend/node_modules/axios/dist/node/axios.cjs:3515:25)
    at RedirectableRequest.emit (node:events:507:28)
    at eventHandlers.<computed> (/Users/samskirrow/Dropbox/From My Brain/GIT/3eyes-fatebox-v3/backend/node_modules/follow-redirects/index.js:49:24)
    at ClientRequest.emit (node:events:507:28)
    at emitErrorEvent (node:_http_client:104:11)
    at TLSSocket.socketErrorListener (node:_http_client:518:5)
    at TLSSocket.emit (node:events:507:28)
    at emitErrorNT (node:internal/streams/destroy:170:8)
    at emitErrorCloseNT (node:internal/streams/destroy:129:3)
    at Axios.request (/Users/samskirrow/Dropbox/From My Brain/GIT/3eyes-fatebox-v3/backend/node_modules/axios/dist/node/axios.cjs:4731:41)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async Gateway.fetchRandomnessReveal (/Users/samskirrow/Dropbox/From My Brain/GIT/3eyes-fatebox-v3/backend/node_modules/@switchboard-xyz/common/dist/esm/gateway.cjs:395:33) {
  syscall: 'read',
  code: 'ECONNRESET',
  errno: -54,
  config: {
    transitional: {
      silentJSONParsing: true,
      forcedJSONParsing: true,
      clarifyTimeoutError: false
    },
    adapter: [ 'xhr', 'http', 'fetch' ],
    transformRequest: [ [Function: transformRequest] ],
    transformResponse: [ [Function: transformResponse] ],
    timeout: 0,
    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'X-XSRF-TOKEN',
    maxContentLength: -1,
    maxBodyLength: -1,
    env: { FormData: [Function], Blob: [class Blob] },
    validateStatus: [Function: validateStatus],
    headers: Object [AxiosHeaders] {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'User-Agent': 'axios/1.13.2',
      'Content-Length': '314',
      'Accept-Encoding': 'gzip, compress, deflate, br'
    },
    method: 'post',
    data: '{"slothash":[200,91,191,223,69,120,83,172,223,38,227,136,47,30,65,229,36,217,114,93,116,246,186,186,236,117,192,58,5,186,17,218],"randomness_key":"ac5f36cd8197dde8dbc3139e9daa7d92e1308d079de868d3d9baa0c05697562d","slot":435208095,"rpc":"https://devnet.helius-rpc.com/?api-key=003c76b9-402b-4cf1-9d84-a71cbabbe5d6"}',
    responseType: 'text',
    url: 'https://162.19.171.93.xip.switchboard-oracles.xyz/devnet/gateway/api/v1/randomness_reveal',
    allowAbsoluteUrls: true
  },
  request: <ref *1> Writable {
    _events: {
      close: undefined,
      error: [Function: handleRequestError],
      prefinish: undefined,
      finish: undefined,
      drain: undefined,
      response: [Function: handleResponse],
      socket: [Array],
      abort: undefined
    },
    _writableState: WritableState {
      highWaterMark: 65536,
      length: 0,
      corked: 0,
      onwrite: [Function: bound onwrite],
      writelen: 0,
      bufferedIndex: 0,
      pendingcb: 0,
      Symbol(kState): 17580812,
      Symbol(kBufferedValue): null
    },
    _maxListeners: undefined,
    _options: {
      maxRedirects: 21,
      maxBodyLength: Infinity,
      protocol: 'https:',
      path: '/devnet/gateway/api/v1/randomness_reveal',
      method: 'POST',
      headers: [Object: null prototype],
      agents: [Object],
      auth: undefined,
      family: undefined,
      beforeRedirect: [Function: dispatchBeforeRedirect],
      beforeRedirects: [Object],
      http2Options: undefined,
      hostname: '162.19.171.93.xip.switchboard-oracles.xyz',
      port: '',
      agent: undefined,
      nativeProtocols: [Object],
      pathname: '/devnet/gateway/api/v1/randomness_reveal'
    },
    _ended: true,
    _ending: true,
    _redirectCount: 0,
    _redirects: [],
    _requestBodyLength: 314,
    _requestBodyBuffers: [ [Object] ],
    _eventsCount: 3,
    _onNativeResponse: [Function (anonymous)],
    _currentRequest: ClientRequest {
      _events: [Object: null prototype],
      _eventsCount: 7,
      _maxListeners: undefined,
      outputData: [],
      outputSize: 0,
      writable: true,
      destroyed: false,
      _last: false,
      chunkedEncoding: false,
      shouldKeepAlive: true,
      maxRequestsOnConnectionReached: false,
      _defaultKeepAlive: true,
      useChunkedEncodingByDefault: true,
      sendDate: false,
      _removedConnection: false,
      _removedContLen: false,
      _removedTE: false,
      strictContentLength: false,
      _contentLength: 314,
      _hasBody: true,
      _trailer: '',
      finished: true,
      _headerSent: true,
      _closed: false,
      _header: 'POST /devnet/gateway/api/v1/randomness_reveal HTTP/1.1\r\n' +
        'Accept: application/json, text/plain, */*\r\n' +
        'Content-Type: application/json\r\n' +
        'User-Agent: axios/1.13.2\r\n' +
        'Content-Length: 314\r\n' +
        'Accept-Encoding: gzip, compress, deflate, br\r\n' +
        'Host: 162.19.171.93.xip.switchboard-oracles.xyz\r\n' +
        'Connection: keep-alive\r\n' +
        '\r\n',
      _keepAliveTimeout: 0,
      _onPendingData: [Function: nop],
      agent: [Agent],
      socketPath: undefined,
      method: 'POST',
      maxHeaderSize: undefined,
      insecureHTTPParser: undefined,
      joinDuplicateHeaders: undefined,
      path: '/devnet/gateway/api/v1/randomness_reveal',
      _ended: false,
      res: null,
      aborted: false,
      timeoutCb: [Function: emitRequestTimeout],
      upgradeOrConnect: false,
      parser: null,
      maxHeadersCount: null,
      reusedSocket: false,
      host: '162.19.171.93.xip.switchboard-oracles.xyz',
      protocol: 'https:',
      _redirectable: [Circular *1],
      Symbol(shapeMode): false,
      Symbol(kCapture): false,
      Symbol(kBytesWritten): 0,
      Symbol(kNeedDrain): false,
      Symbol(corked): 0,
      Symbol(kChunkedBuffer): [],
      Symbol(kChunkedLength): 0,
      Symbol(kSocket): [TLSSocket],
      Symbol(kOutHeaders): [Object: null prototype],
      Symbol(errored): null,
      Symbol(kHighWaterMark): 65536,
      Symbol(kRejectNonStandardBodyWrites): false,
      Symbol(kUniqueHeaders): null
    },
    _currentUrl: 'https://162.19.171.93.xip.switchboard-oracles.xyz/devnet/gateway/api/v1/randomness_reveal',
    _timeout: null,
    Symbol(shapeMode): true,
    Symbol(kCapture): false
  },
  [cause]: Error: read ECONNRESET
      at TLSWrap.onStreamRead (node:internal/stream_base_commons:216:20) {
    errno: -54,
    code: 'ECONNRESET',
    syscall: 'read'
  }
}
   SDK failed: read ECONNRESET
[Switchboard] Error creating reveal instruction: read ECONNRESET
❌ Error building reveal box transaction: AxiosError: read ECONNRESET
    at AxiosError.from (/Users/samskirrow/Dropbox/From My Brain/GIT/3eyes-fatebox-v3/backend/node_modules/axios/dist/node/axios.cjs:914:14)
    at RedirectableRequest.handleRequestError (/Users/samskirrow/Dropbox/From My Brain/GIT/3eyes-fatebox-v3/backend/node_modules/axios/dist/node/axios.cjs:3515:25)
    at RedirectableRequest.emit (node:events:507:28)
    at eventHandlers.<computed> (/Users/samskirrow/Dropbox/From My Brain/GIT/3eyes-fatebox-v3/backend/node_modules/follow-redirects/index.js:49:24)
    at ClientRequest.emit (node:events:507:28)
    at emitErrorEvent (node:_http_client:104:11)
    at TLSSocket.socketErrorListener (node:_http_client:518:5)
    at TLSSocket.emit (node:events:507:28)
    at emitErrorNT (node:internal/streams/destroy:170:8)
    at emitErrorCloseNT (node:internal/streams/destroy:129:3)
    at Axios.request (/Users/samskirrow/Dropbox/From My Brain/GIT/3eyes-fatebox-v3/backend/node_modules/axios/dist/node/axios.cjs:4731:41)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async Gateway.fetchRandomnessReveal (/Users/samskirrow/Dropbox/From My Brain/GIT/3eyes-fatebox-v3/backend/node_modules/@switchboard-xyz/common/dist/esm/gateway.cjs:395:33) {
  syscall: 'read',
  code: 'ECONNRESET',
  errno: -54,
  config: {
    transitional: {
      silentJSONParsing: true,
      forcedJSONParsing: true,
      clarifyTimeoutError: false
    },
    adapter: [ 'xhr', 'http', 'fetch' ],
    transformRequest: [ [Function: transformRequest] ],
    transformResponse: [ [Function: transformResponse] ],
    timeout: 0,
    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'X-XSRF-TOKEN',
    maxContentLength: -1,
    maxBodyLength: -1,
    env: { FormData: [Function], Blob: [class Blob] },
    validateStatus: [Function: validateStatus],
    headers: Object [AxiosHeaders] {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'User-Agent': 'axios/1.13.2',
      'Content-Length': '314',
      'Accept-Encoding': 'gzip, compress, deflate, br'
    },
    method: 'post',
    data: '{"slothash":[200,91,191,223,69,120,83,172,223,38,227,136,47,30,65,229,36,217,114,93,116,246,186,186,236,117,192,58,5,186,17,218],"randomness_key":"ac5f36cd8197dde8dbc3139e9daa7d92e1308d079de868d3d9baa0c05697562d","slot":435208095,"rpc":"https://devnet.helius-rpc.com/?api-key=003c76b9-402b-4cf1-9d84-a71cbabbe5d6"}',
    responseType: 'text',
    url: 'https://162.19.171.93.xip.switchboard-oracles.xyz/devnet/gateway/api/v1/randomness_reveal',
    allowAbsoluteUrls: true
  },
  request: <ref *1> Writable {
    _events: {
      close: undefined,
      error: [Function: handleRequestError],
      prefinish: undefined,
      finish: undefined,
      drain: undefined,
      response: [Function: handleResponse],
      socket: [Array],
      abort: undefined
    },
    _writableState: WritableState {
      highWaterMark: 65536,
      length: 0,
      corked: 0,
      onwrite: [Function: bound onwrite],
      writelen: 0,
      bufferedIndex: 0,
      pendingcb: 0,
      Symbol(kState): 17580812,
      Symbol(kBufferedValue): null
    },
    _maxListeners: undefined,
    _options: {
      maxRedirects: 21,
      maxBodyLength: Infinity,
      protocol: 'https:',
      path: '/devnet/gateway/api/v1/randomness_reveal',
      method: 'POST',
      headers: [Object: null prototype],
      agents: [Object],
      auth: undefined,
      family: undefined,
      beforeRedirect: [Function: dispatchBeforeRedirect],
      beforeRedirects: [Object],
      http2Options: undefined,
      hostname: '162.19.171.93.xip.switchboard-oracles.xyz',
      port: '',
      agent: undefined,
      nativeProtocols: [Object],
      pathname: '/devnet/gateway/api/v1/randomness_reveal'
    },
    _ended: true,
    _ending: true,
    _redirectCount: 0,
    _redirects: [],
    _requestBodyLength: 314,
    _requestBodyBuffers: [ [Object] ],
    _eventsCount: 3,
    _onNativeResponse: [Function (anonymous)],
    _currentRequest: ClientRequest {
      _events: [Object: null prototype],
      _eventsCount: 7,
      _maxListeners: undefined,
      outputData: [],
      outputSize: 0,
      writable: true,
      destroyed: false,
      _last: false,
      chunkedEncoding: false,
      shouldKeepAlive: true,
      maxRequestsOnConnectionReached: false,
      _defaultKeepAlive: true,
      useChunkedEncodingByDefault: true,
      sendDate: false,
      _removedConnection: false,
      _removedContLen: false,
      _removedTE: false,
      strictContentLength: false,
      _contentLength: 314,
      _hasBody: true,
      _trailer: '',
      finished: true,
      _headerSent: true,
      _closed: false,
      _header: 'POST /devnet/gateway/api/v1/randomness_reveal HTTP/1.1\r\n' +
        'Accept: application/json, text/plain, */*\r\n' +
        'Content-Type: application/json\r\n' +
        'User-Agent: axios/1.13.2\r\n' +
        'Content-Length: 314\r\n' +
        'Accept-Encoding: gzip, compress, deflate, br\r\n' +
        'Host: 162.19.171.93.xip.switchboard-oracles.xyz\r\n' +
        'Connection: keep-alive\r\n' +
        '\r\n',
      _keepAliveTimeout: 0,
      _onPendingData: [Function: nop],
      agent: [Agent],
      socketPath: undefined,
      method: 'POST',
      maxHeaderSize: undefined,
      insecureHTTPParser: undefined,
      joinDuplicateHeaders: undefined,
      path: '/devnet/gateway/api/v1/randomness_reveal',
      _ended: false,
      res: null,
      aborted: false,
      timeoutCb: [Function: emitRequestTimeout],
      upgradeOrConnect: false,
      parser: null,
      maxHeadersCount: null,
      reusedSocket: false,
      host: '162.19.171.93.xip.switchboard-oracles.xyz',
      protocol: 'https:',
      _redirectable: [Circular *1],
      Symbol(shapeMode): false,
      Symbol(kCapture): false,
      Symbol(kBytesWritten): 0,
      Symbol(kNeedDrain): false,
      Symbol(corked): 0,
      Symbol(kChunkedBuffer): [],
      Symbol(kChunkedLength): 0,
      Symbol(kSocket): [TLSSocket],
      Symbol(kOutHeaders): [Object: null prototype],
      Symbol(errored): null,
      Symbol(kHighWaterMark): 65536,
      Symbol(kRejectNonStandardBodyWrites): false,
      Symbol(kUniqueHeaders): null
    },
    _currentUrl: 'https://162.19.171.93.xip.switchboard-oracles.xyz/devnet/gateway/api/v1/randomness_reveal',
    _timeout: null,
    Symbol(shapeMode): true,
    Symbol(kCapture): false
  },
  [cause]: Error: read ECONNRESET
      at TLSWrap.onStreamRead (node:internal/stream_base_commons:216:20) {
    errno: -54,
    code: 'ECONNRESET',
    syscall: 'read'
  }
}
…didn’t seem to like it being opened straight away maybe?

Box 5, purchase, waitt around 1 minute, open, reveal

2026-01-15T00:14:25.849Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:16:41.533Z - POST /api/program/build-create-box-tx

🎲 Building create box transaction for project 11...
   Buyer: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   Project: cats
   Box price: 115 CATS
   Current boxes created: 3
   Next box ID (counter + 1): 4
   Platform config PDA: 6zXM6GCzTKcKZGvn1w5hLBfR29xDep3wYkC6Utjuex1t
   Box instance PDA: H5XReBeDmVtNbQ16vDNvcYg8na8nwjMKie7LhWrmFyWn
   Vault token account: AieQ6gPSeq2EraG6ZJYUFYAWdC8ZuQ6zroYdwsjtedfY
   Treasury PDA: 3mmY9LXhBuNyH7pZDXEBU24QoBwkYT9NWHgHD6PweoPZ
   Treasury token account: 4NjUf1aFYHkR63DUcRHnnuQZTLitfkL3YS2VB2obifxB
   Buyer token account: G1v9RGf4ySEXCoAS7QLxLnSWPmASHjNt5mpcEgosBjCH

💰 Fee split (4% platform commission):
   Total box price: 115 CATS
   → Platform treasury: 4.6 CATS (4%)
   → Creator vault: 110.4 CATS (96%)

📝 Building purchase transaction...
   Added: Create box instruction (pending state, with commission split)

✅ Transaction built successfully!
   Total instructions: 1
   Box will be created in PENDING state (no randomness yet)
2026-01-15T00:16:48.403Z - POST /api/program/confirm-box-creation

✅ Confirming box 4 creation for project 11...
   Transaction: 5WsRQ9u3qfSS8YPXFGKdp5x8C9ebNPdA7F3r2vY9meXByryaLP4yXdTfydUB97yyHqqFsR7PgD63TW5Q1CNf9Q2R
✅ Box recorded in database
2026-01-15T00:17:00.755Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:17:00.919Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:17:03.442Z - POST /api/program/build-commit-box-tx

📦 Building commit box transaction for box 4 in project 11...
   Owner: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   Platform config PDA: 6zXM6GCzTKcKZGvn1w5hLBfR29xDep3wYkC6Utjuex1t
   Box instance PDA: H5XReBeDmVtNbQ16vDNvcYg8na8nwjMKie7LhWrmFyWn
   Project config PDA: 9FgfYV6NkeyoGxwNzEAKuXWtxpNbtBnXTgr9gQUG5Kj3

🎰 Setting up Switchboard VRF randomness...

[Switchboard] Creating randomness account...
   Payer: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7
   Randomness account: CbsLFFr9x4VDtnoiEdkAn9t5BbqNKJJkhJVvD4uhe9Lx
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7
   Randomness account: CbsLFFr9x4VDtnoiEdkAn9t5BbqNKJJkhJVvD4uhe9Lx
[Switchboard] Creating commit instruction...
   Authority: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7

📝 Building commit transaction...
   Added: Create randomness account instruction
   Added: Commit to randomness instruction
   Added: commit_box instruction

✅ Commit transaction built successfully!
   Total instructions: 3
   User has 1 HOUR to reveal after this commits
2026-01-15T00:17:07.949Z - POST /api/program/confirm-commit

✅ Confirming commit for box 4 in project 11...
   Transaction: 7CbPRs954y7WCkERFNHG9Wta2BMdABb9aAVa85g9H2bFoWzovYYhYkR34qiackNTfevncEvtoPsi4Wh1zrpeEf8
   Randomness account: CbsLFFr9x4VDtnoiEdkAn9t5BbqNKJJkhJVvD4uhe9Lx
✅ Box commit recorded in database
   Committed at: 2026-01-15T00:17:08.069Z
   User has until: 2026-01-15T01:17:08.200Z to reveal
2026-01-15T00:17:08.288Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:17:19.808Z - POST /api/program/build-reveal-box-tx

🎰 Building reveal box transaction with Switchboard VRF...
   Project ID: 11
   Box ID: 4
   Owner: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   Time remaining to reveal: 3587 seconds
   Randomness account: CbsLFFr9x4VDtnoiEdkAn9t5BbqNKJJkhJVvD4uhe9Lx
   Platform Config PDA: 6zXM6GCzTKcKZGvn1w5hLBfR29xDep3wYkC6Utjuex1t
   Project Config PDA: 9FgfYV6NkeyoGxwNzEAKuXWtxpNbtBnXTgr9gQUG5Kj3
   Box Instance PDA: H5XReBeDmVtNbQ16vDNvcYg8na8nwjMKie7LhWrmFyWn
   Box created at: 2026-01-15T00:16:48.515Z
   Hold time: 31.484999895095825 seconds
   Luck interval: 1 seconds
   Calculated luck: 36/60

🎰 Creating Switchboard VRF reveal instruction...
[Switchboard] Loading existing randomness account: CbsLFFr9x4VDtnoiEdkAn9t5BbqNKJJkhJVvD4uhe9Lx

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7
[Switchboard] Creating reveal instruction...
   Randomness pubkey: CbsLFFr9x4VDtnoiEdkAn9t5BbqNKJJkhJVvD4uhe9Lx
   Payer: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
   Network: devnet
   Attempt 1/3: Trying SDK revealIx...
fetchRandomnessReveal error AxiosError: read ECONNRESET
    at AxiosError.from (/Users/samskirrow/Dropbox/From My Brain/GIT/3eyes-fatebox-v3/backend/node_modules/axios/dist/node/axios.cjs:914:14)
    at RedirectableRequest.handleRequestError (/Users/samskirrow/Dropbox/From My Brain/GIT/3eyes-fatebox-v3/backend/node_modules/axios/dist/node/axios.cjs:3515:25)
    at RedirectableRequest.emit (node:events:507:28)
    at eventHandlers.<computed> (/Users/samskirrow/Dropbox/From My Brain/GIT/3eyes-fatebox-v3/backend/node_modules/follow-redirects/index.js:49:24)
    at ClientRequest.emit (node:events:507:28)
    at emitErrorEvent (node:_http_client:104:11)
    at TLSSocket.socketErrorListener (node:_http_client:518:5)
    at TLSSocket.emit (node:events:507:28)
    at emitErrorNT (node:internal/streams/destroy:170:8)
    at emitErrorCloseNT (node:internal/streams/destroy:129:3)
    at Axios.request (/Users/samskirrow/Dropbox/From My Brain/GIT/3eyes-fatebox-v3/backend/node_modules/axios/dist/node/axios.cjs:4731:41)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async Gateway.fetchRandomnessReveal (/Users/samskirrow/Dropbox/From My Brain/GIT/3eyes-fatebox-v3/backend/node_modules/@switchboard-xyz/common/dist/esm/gateway.cjs:395:33) {
  syscall: 'read',
  code: 'ECONNRESET',
  errno: -54,
  config: {
    transitional: {
      silentJSONParsing: true,
      forcedJSONParsing: true,
      clarifyTimeoutError: false
    },
    adapter: [ 'xhr', 'http', 'fetch' ],
    transformRequest: [ [Function: transformRequest] ],
    transformResponse: [ [Function: transformResponse] ],
    timeout: 0,
    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'X-XSRF-TOKEN',
    maxContentLength: -1,
    maxBodyLength: -1,
    env: { FormData: [Function], Blob: [class Blob] },
    validateStatus: [Function: validateStatus],
    headers: Object [AxiosHeaders] {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'User-Agent': 'axios/1.13.2',
      'Content-Length': '314',
      'Accept-Encoding': 'gzip, compress, deflate, br'
    },
    method: 'post',
    data: '{"slothash":[200,91,191,223,69,120,83,172,223,38,227,136,47,30,65,229,36,217,114,93,116,246,186,186,236,117,192,58,5,186,17,218],"randomness_key":"ac5f36cd8197dde8dbc3139e9daa7d92e1308d079de868d3d9baa0c05697562d","slot":435208095,"rpc":"https://devnet.helius-rpc.com/?api-key=003c76b9-402b-4cf1-9d84-a71cbabbe5d6"}',
    responseType: 'text',
    url: 'https://162.19.171.93.xip.switchboard-oracles.xyz/devnet/gateway/api/v1/randomness_reveal',
    allowAbsoluteUrls: true
  },
  request: <ref *1> Writable {
    _events: {
      close: undefined,
      error: [Function: handleRequestError],
      prefinish: undefined,
      finish: undefined,
      drain: undefined,
      response: [Function: handleResponse],
      socket: [Array],
      abort: undefined
    },
    _writableState: WritableState {
      highWaterMark: 65536,
      length: 0,
      corked: 0,
      onwrite: [Function: bound onwrite],
      writelen: 0,
      bufferedIndex: 0,
      pendingcb: 0,
      Symbol(kState): 17580812,
      Symbol(kBufferedValue): null
    },
    _maxListeners: undefined,
    _options: {
      maxRedirects: 21,
      maxBodyLength: Infinity,
      protocol: 'https:',
      path: '/devnet/gateway/api/v1/randomness_reveal',
      method: 'POST',
      headers: [Object: null prototype],
      agents: [Object],
      auth: undefined,
      family: undefined,
      beforeRedirect: [Function: dispatchBeforeRedirect],
      beforeRedirects: [Object],
      http2Options: undefined,
      hostname: '162.19.171.93.xip.switchboard-oracles.xyz',
      port: '',
      agent: undefined,
      nativeProtocols: [Object],
      pathname: '/devnet/gateway/api/v1/randomness_reveal'
    },
    _ended: true,
    _ending: true,
    _redirectCount: 0,
    _redirects: [],
    _requestBodyLength: 314,
    _requestBodyBuffers: [ [Object] ],
    _eventsCount: 3,
    _onNativeResponse: [Function (anonymous)],
    _currentRequest: ClientRequest {
      _events: [Object: null prototype],
      _eventsCount: 7,
      _maxListeners: undefined,
      outputData: [],
      outputSize: 0,
      writable: true,
      destroyed: false,
      _last: false,
      chunkedEncoding: false,
      shouldKeepAlive: true,
      maxRequestsOnConnectionReached: false,
      _defaultKeepAlive: true,
      useChunkedEncodingByDefault: true,
      sendDate: false,
      _removedConnection: false,
      _removedContLen: false,
      _removedTE: false,
      strictContentLength: false,
      _contentLength: 314,
      _hasBody: true,
      _trailer: '',
      finished: true,
      _headerSent: true,
      _closed: false,
      _header: 'POST /devnet/gateway/api/v1/randomness_reveal HTTP/1.1\r\n' +
        'Accept: application/json, text/plain, */*\r\n' +
        'Content-Type: application/json\r\n' +
        'User-Agent: axios/1.13.2\r\n' +
        'Content-Length: 314\r\n' +
        'Accept-Encoding: gzip, compress, deflate, br\r\n' +
        'Host: 162.19.171.93.xip.switchboard-oracles.xyz\r\n' +
        'Connection: keep-alive\r\n' +
        '\r\n',
      _keepAliveTimeout: 0,
      _onPendingData: [Function: nop],
      agent: [Agent],
      socketPath: undefined,
      method: 'POST',
      maxHeaderSize: undefined,
      insecureHTTPParser: undefined,
      joinDuplicateHeaders: undefined,
      path: '/devnet/gateway/api/v1/randomness_reveal',
      _ended: false,
      res: null,
      aborted: false,
      timeoutCb: [Function: emitRequestTimeout],
      upgradeOrConnect: false,
      parser: null,
      maxHeadersCount: null,
      reusedSocket: false,
      host: '162.19.171.93.xip.switchboard-oracles.xyz',
      protocol: 'https:',
      _redirectable: [Circular *1],
      Symbol(shapeMode): false,
      Symbol(kCapture): false,
      Symbol(kBytesWritten): 0,
      Symbol(kNeedDrain): false,
      Symbol(corked): 0,
      Symbol(kChunkedBuffer): [],
      Symbol(kChunkedLength): 0,
      Symbol(kSocket): [TLSSocket],
      Symbol(kOutHeaders): [Object: null prototype],
      Symbol(errored): null,
      Symbol(kHighWaterMark): 65536,
      Symbol(kRejectNonStandardBodyWrites): false,
      Symbol(kUniqueHeaders): null
    },
    _currentUrl: 'https://162.19.171.93.xip.switchboard-oracles.xyz/devnet/gateway/api/v1/randomness_reveal',
    _timeout: null,
    Symbol(shapeMode): true,
    Symbol(kCapture): false
  },
  [cause]: Error: read ECONNRESET
      at TLSWrap.onStreamRead (node:internal/stream_base_commons:216:20) {
    errno: -54,
    code: 'ECONNRESET',
    syscall: 'read'
  }
}
   SDK failed: read ECONNRESET
[Switchboard] Error creating reveal instruction: read ECONNRESET
❌ Error building reveal box transaction: AxiosError: read ECONNRESET
    at AxiosError.from (/Users/samskirrow/Dropbox/From My Brain/GIT/3eyes-fatebox-v3/backend/node_modules/axios/dist/node/axios.cjs:914:14)
    at RedirectableRequest.handleRequestError (/Users/samskirrow/Dropbox/From My Brain/GIT/3eyes-fatebox-v3/backend/node_modules/axios/dist/node/axios.cjs:3515:25)
    at RedirectableRequest.emit (node:events:507:28)
    at eventHandlers.<computed> (/Users/samskirrow/Dropbox/From My Brain/GIT/3eyes-fatebox-v3/backend/node_modules/follow-redirects/index.js:49:24)
    at ClientRequest.emit (node:events:507:28)
    at emitErrorEvent (node:_http_client:104:11)
    at TLSSocket.socketErrorListener (node:_http_client:518:5)
    at TLSSocket.emit (node:events:507:28)
    at emitErrorNT (node:internal/streams/destroy:170:8)
    at emitErrorCloseNT (node:internal/streams/destroy:129:3)
    at Axios.request (/Users/samskirrow/Dropbox/From My Brain/GIT/3eyes-fatebox-v3/backend/node_modules/axios/dist/node/axios.cjs:4731:41)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async Gateway.fetchRandomnessReveal (/Users/samskirrow/Dropbox/From My Brain/GIT/3eyes-fatebox-v3/backend/node_modules/@switchboard-xyz/common/dist/esm/gateway.cjs:395:33) {
  syscall: 'read',
  code: 'ECONNRESET',
  errno: -54,
  config: {
    transitional: {
      silentJSONParsing: true,
      forcedJSONParsing: true,
      clarifyTimeoutError: false
    },
    adapter: [ 'xhr', 'http', 'fetch' ],
    transformRequest: [ [Function: transformRequest] ],
    transformResponse: [ [Function: transformResponse] ],
    timeout: 0,
    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'X-XSRF-TOKEN',
    maxContentLength: -1,
    maxBodyLength: -1,
    env: { FormData: [Function], Blob: [class Blob] },
    validateStatus: [Function: validateStatus],
    headers: Object [AxiosHeaders] {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'User-Agent': 'axios/1.13.2',
      'Content-Length': '314',
      'Accept-Encoding': 'gzip, compress, deflate, br'
    },
    method: 'post',
    data: '{"slothash":[200,91,191,223,69,120,83,172,223,38,227,136,47,30,65,229,36,217,114,93,116,246,186,186,236,117,192,58,5,186,17,218],"randomness_key":"ac5f36cd8197dde8dbc3139e9daa7d92e1308d079de868d3d9baa0c05697562d","slot":435208095,"rpc":"https://devnet.helius-rpc.com/?api-key=003c76b9-402b-4cf1-9d84-a71cbabbe5d6"}',
    responseType: 'text',
    url: 'https://162.19.171.93.xip.switchboard-oracles.xyz/devnet/gateway/api/v1/randomness_reveal',
    allowAbsoluteUrls: true
  },
  request: <ref *1> Writable {
    _events: {
      close: undefined,
      error: [Function: handleRequestError],
      prefinish: undefined,
      finish: undefined,
      drain: undefined,
      response: [Function: handleResponse],
      socket: [Array],
      abort: undefined
    },
    _writableState: WritableState {
      highWaterMark: 65536,
      length: 0,
      corked: 0,
      onwrite: [Function: bound onwrite],
      writelen: 0,
      bufferedIndex: 0,
      pendingcb: 0,
      Symbol(kState): 17580812,
      Symbol(kBufferedValue): null
    },
    _maxListeners: undefined,
    _options: {
      maxRedirects: 21,
      maxBodyLength: Infinity,
      protocol: 'https:',
      path: '/devnet/gateway/api/v1/randomness_reveal',
      method: 'POST',
      headers: [Object: null prototype],
      agents: [Object],
      auth: undefined,
      family: undefined,
      beforeRedirect: [Function: dispatchBeforeRedirect],
      beforeRedirects: [Object],
      http2Options: undefined,
      hostname: '162.19.171.93.xip.switchboard-oracles.xyz',
      port: '',
      agent: undefined,
      nativeProtocols: [Object],
      pathname: '/devnet/gateway/api/v1/randomness_reveal'
    },
    _ended: true,
    _ending: true,
    _redirectCount: 0,
    _redirects: [],
    _requestBodyLength: 314,
    _requestBodyBuffers: [ [Object] ],
    _eventsCount: 3,
    _onNativeResponse: [Function (anonymous)],
    _currentRequest: ClientRequest {
      _events: [Object: null prototype],
      _eventsCount: 7,
      _maxListeners: undefined,
      outputData: [],
      outputSize: 0,
      writable: true,
      destroyed: false,
      _last: false,
      chunkedEncoding: false,
      shouldKeepAlive: true,
      maxRequestsOnConnectionReached: false,
      _defaultKeepAlive: true,
      useChunkedEncodingByDefault: true,
      sendDate: false,
      _removedConnection: false,
      _removedContLen: false,
      _removedTE: false,
      strictContentLength: false,
      _contentLength: 314,
      _hasBody: true,
      _trailer: '',
      finished: true,
      _headerSent: true,
      _closed: false,
      _header: 'POST /devnet/gateway/api/v1/randomness_reveal HTTP/1.1\r\n' +
        'Accept: application/json, text/plain, */*\r\n' +
        'Content-Type: application/json\r\n' +
        'User-Agent: axios/1.13.2\r\n' +
        'Content-Length: 314\r\n' +
        'Accept-Encoding: gzip, compress, deflate, br\r\n' +
        'Host: 162.19.171.93.xip.switchboard-oracles.xyz\r\n' +
        'Connection: keep-alive\r\n' +
        '\r\n',
      _keepAliveTimeout: 0,
      _onPendingData: [Function: nop],
      agent: [Agent],
      socketPath: undefined,
      method: 'POST',
      maxHeaderSize: undefined,
      insecureHTTPParser: undefined,
      joinDuplicateHeaders: undefined,
      path: '/devnet/gateway/api/v1/randomness_reveal',
      _ended: false,
      res: null,
      aborted: false,
      timeoutCb: [Function: emitRequestTimeout],
      upgradeOrConnect: false,
      parser: null,
      maxHeadersCount: null,
      reusedSocket: false,
      host: '162.19.171.93.xip.switchboard-oracles.xyz',
      protocol: 'https:',
      _redirectable: [Circular *1],
      Symbol(shapeMode): false,
      Symbol(kCapture): false,
      Symbol(kBytesWritten): 0,
      Symbol(kNeedDrain): false,
      Symbol(corked): 0,
      Symbol(kChunkedBuffer): [],
      Symbol(kChunkedLength): 0,
      Symbol(kSocket): [TLSSocket],
      Symbol(kOutHeaders): [Object: null prototype],
      Symbol(errored): null,
      Symbol(kHighWaterMark): 65536,
      Symbol(kRejectNonStandardBodyWrites): false,
      Symbol(kUniqueHeaders): null
    },
    _currentUrl: 'https://162.19.171.93.xip.switchboard-oracles.xyz/devnet/gateway/api/v1/randomness_reveal',
    _timeout: null,
    Symbol(shapeMode): true,
    Symbol(kCapture): false
  },
  [cause]: Error: read ECONNRESET
      at TLSWrap.onStreamRead (node:internal/stream_base_commons:216:20) {
    errno: -54,
    code: 'ECONNRESET',
    syscall: 'read'
  }
}
2026-01-15T00:18:46.359Z - GET /api/admin/platform-config
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
2026-01-15T00:19:00.326Z - POST /api/admin/update-platform-config

========================================
  Update Platform Config
========================================
Admin wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
Platform Config PDA: 6zXM6GCzTKcKZGvn1w5hLBfR29xDep3wYkC6Utjuex1t
Update params: {
  baseLuck: 'unchanged',
  maxLuck: 'unchanged',
  luckTimeInterval: 3,
  payoutDud: 'unchanged',
  payoutRebate: 'unchanged',
  payoutBreakeven: 'unchanged',
  payoutProfit: 'unchanged',
  payoutJackpot: 'unchanged'
}
Sending transaction...
Transaction sent: 4Kf9fCTB6JEJM7aizxVxVW1r3erBJJyX5tpwqk9CT2QjSgKKMHqS97rPSiZsir3kE2iUbn3dzx8wuAcL4bkayDxp
Platform config updated successfully!
2026-01-15T00:19:01.547Z - GET /api/admin/platform-config
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
2026-01-15T00:19:38.636Z - POST /api/program/build-create-box-tx

🎲 Building create box transaction for project 11...
   Buyer: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   Project: cats
   Box price: 115 CATS
   Current boxes created: 4
   Next box ID (counter + 1): 5
   Platform config PDA: 6zXM6GCzTKcKZGvn1w5hLBfR29xDep3wYkC6Utjuex1t
   Box instance PDA: FzLwu1cAC7ZixtWBtV29E4t9o4GftGzgmnhZzY5uR7mF
   Vault token account: AieQ6gPSeq2EraG6ZJYUFYAWdC8ZuQ6zroYdwsjtedfY
   Treasury PDA: 3mmY9LXhBuNyH7pZDXEBU24QoBwkYT9NWHgHD6PweoPZ
   Treasury token account: 4NjUf1aFYHkR63DUcRHnnuQZTLitfkL3YS2VB2obifxB
   Buyer token account: G1v9RGf4ySEXCoAS7QLxLnSWPmASHjNt5mpcEgosBjCH

💰 Fee split (4% platform commission):
   Total box price: 115 CATS
   → Platform treasury: 4.6 CATS (4%)
   → Creator vault: 110.4 CATS (96%)

📝 Building purchase transaction...
   Added: Create box instruction (pending state, with commission split)

✅ Transaction built successfully!
   Total instructions: 1
   Box will be created in PENDING state (no randomness yet)
2026-01-15T00:19:44.261Z - POST /api/program/confirm-box-creation

✅ Confirming box 5 creation for project 11...
   Transaction: 263cmZy12oZp1KN3JX8UDmuytGXwNcQb8zScKTunVupYCNELPDigBuzKCBhavNd6e7pGe1k5VRjCBWEH8KTzkjMA
✅ Box recorded in database
2026-01-15T00:19:49.506Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:19:49.713Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:20:51.678Z - POST /api/program/build-commit-box-tx

📦 Building commit box transaction for box 5 in project 11...
   Owner: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   Platform config PDA: 6zXM6GCzTKcKZGvn1w5hLBfR29xDep3wYkC6Utjuex1t
   Box instance PDA: FzLwu1cAC7ZixtWBtV29E4t9o4GftGzgmnhZzY5uR7mF
   Project config PDA: 9FgfYV6NkeyoGxwNzEAKuXWtxpNbtBnXTgr9gQUG5Kj3

🎰 Setting up Switchboard VRF randomness...

[Switchboard] Creating randomness account...
   Payer: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7
   Randomness account: 3CkLFp9PfwSoXpVBL7LGavX8Vy78XS9THJuoTEk97RBN
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7
   Randomness account: 3CkLFp9PfwSoXpVBL7LGavX8Vy78XS9THJuoTEk97RBN
[Switchboard] Creating commit instruction...
   Authority: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7

📝 Building commit transaction...
   Added: Create randomness account instruction
   Added: Commit to randomness instruction
   Added: commit_box instruction

✅ Commit transaction built successfully!
   Total instructions: 3
   User has 1 HOUR to reveal after this commits
2026-01-15T00:20:56.078Z - POST /api/program/confirm-commit

✅ Confirming commit for box 5 in project 11...
   Transaction: TiJz1aA5PDa5nafaDAo43xxamGkCB3QjG137dos1A9DrXb63wwZqWSGzfMLv4WXmjPPs1vJdxchZHxvGeBqq7p7
   Randomness account: 3CkLFp9PfwSoXpVBL7LGavX8Vy78XS9THJuoTEk97RBN
✅ Box commit recorded in database
   Committed at: 2026-01-15T00:20:56.207Z
   User has until: 2026-01-15T01:20:56.328Z to reveal
2026-01-15T00:20:56.416Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:21:08.125Z - POST /api/program/build-reveal-box-tx

🎰 Building reveal box transaction with Switchboard VRF...
   Project ID: 11
   Box ID: 5
   Owner: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   Time remaining to reveal: 3587 seconds
   Randomness account: 3CkLFp9PfwSoXpVBL7LGavX8Vy78XS9THJuoTEk97RBN
   Platform Config PDA: 6zXM6GCzTKcKZGvn1w5hLBfR29xDep3wYkC6Utjuex1t
   Project Config PDA: 9FgfYV6NkeyoGxwNzEAKuXWtxpNbtBnXTgr9gQUG5Kj3
   Box Instance PDA: FzLwu1cAC7ZixtWBtV29E4t9o4GftGzgmnhZzY5uR7mF
   Box created at: 2026-01-15T00:19:44.369Z
   Hold time: 83.63100004196167 seconds
   Luck interval: 1 seconds
   Calculated luck: 60/60

🎰 Creating Switchboard VRF reveal instruction...
[Switchboard] Loading existing randomness account: 3CkLFp9PfwSoXpVBL7LGavX8Vy78XS9THJuoTEk97RBN

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7
[Switchboard] Creating reveal instruction...
   Randomness pubkey: 3CkLFp9PfwSoXpVBL7LGavX8Vy78XS9THJuoTEk97RBN
   Payer: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
   Network: devnet
   Attempt 1/3: Trying SDK revealIx...
   SDK revealIx succeeded!
   Replacing payer DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN with buyer DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
   Reveal instruction created successfully
   Instruction program: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Instruction keys: 12 accounts
   Required signers: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN, DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN

📝 Building combined reveal transaction...
   Added: Switchboard reveal instruction
   Added: reveal_box instruction with randomness account

✅ Reveal transaction built successfully with Switchboard VRF!
   Total instructions: 2
2026-01-15T00:21:17.614Z - POST /api/program/confirm-reveal

✅ Confirming box 5 reveal for project 11...
   Transaction: 49V7a8xj2q9PZBrAWC7HGLaUxPoxmnMb12T9YyUUus9dQAxNpewReL9YZQrRvMuXUZFnjcK4sXwvyzWSUtMhCbQK
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   On-chain reward: Rebate (tier 1) - 92000000000 (92 CATS)
   Luck: 29/60, Random: 48.40%
✅ Box reveal recorded in database
2026-01-15T00:21:18.226Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN

Worked!! Perhaps there is an issue with opening a box too quickly? Let me try again, opening straight away after buying - box 62026-01-15T00:14:25.849Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:16:41.533Z - POST /api/program/build-create-box-tx

🎲 Building create box transaction for project 11...
   Buyer: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   Project: cats
   Box price: 115 CATS
   Current boxes created: 3
   Next box ID (counter + 1): 4
   Platform config PDA: 6zXM6GCzTKcKZGvn1w5hLBfR29xDep3wYkC6Utjuex1t
   Box instance PDA: H5XReBeDmVtNbQ16vDNvcYg8na8nwjMKie7LhWrmFyWn
   Vault token account: AieQ6gPSeq2EraG6ZJYUFYAWdC8ZuQ6zroYdwsjtedfY
   Treasury PDA: 3mmY9LXhBuNyH7pZDXEBU24QoBwkYT9NWHgHD6PweoPZ
   Treasury token account: 4NjUf1aFYHkR63DUcRHnnuQZTLitfkL3YS2VB2obifxB
   Buyer token account: G1v9RGf4ySEXCoAS7QLxLnSWPmASHjNt5mpcEgosBjCH

💰 Fee split (4% platform commission):
   Total box price: 115 CATS
   → Platform treasury: 4.6 CATS (4%)
   → Creator vault: 110.4 CATS (96%)

📝 Building purchase transaction...
   Added: Create box instruction (pending state, with commission split)

✅ Transaction built successfully!
   Total instructions: 1
   Box will be created in PENDING state (no randomness yet)
2026-01-15T00:16:48.403Z - POST /api/program/confirm-box-creation

✅ Confirming box 4 creation for project 11...
   Transaction: 5WsRQ9u3qfSS8YPXFGKdp5x8C9ebNPdA7F3r2vY9meXByryaLP4yXdTfydUB97yyHqqFsR7PgD63TW5Q1CNf9Q2R
✅ Box recorded in database
2026-01-15T00:17:00.755Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:17:00.919Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:17:03.442Z - POST /api/program/build-commit-box-tx

📦 Building commit box transaction for box 4 in project 11...
   Owner: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   Platform config PDA: 6zXM6GCzTKcKZGvn1w5hLBfR29xDep3wYkC6Utjuex1t
   Box instance PDA: H5XReBeDmVtNbQ16vDNvcYg8na8nwjMKie7LhWrmFyWn
   Project config PDA: 9FgfYV6NkeyoGxwNzEAKuXWtxpNbtBnXTgr9gQUG5Kj3

🎰 Setting up Switchboard VRF randomness...

[Switchboard] Creating randomness account...
   Payer: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7
   Randomness account: CbsLFFr9x4VDtnoiEdkAn9t5BbqNKJJkhJVvD4uhe9Lx
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7
   Randomness account: CbsLFFr9x4VDtnoiEdkAn9t5BbqNKJJkhJVvD4uhe9Lx
[Switchboard] Creating commit instruction...
   Authority: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7

📝 Building commit transaction...
   Added: Create randomness account instruction
   Added: Commit to randomness instruction
   Added: commit_box instruction

✅ Commit transaction built successfully!
   Total instructions: 3
   User has 1 HOUR to reveal after this commits
2026-01-15T00:17:07.949Z - POST /api/program/confirm-commit

✅ Confirming commit for box 4 in project 11...
   Transaction: 7CbPRs954y7WCkERFNHG9Wta2BMdABb9aAVa85g9H2bFoWzovYYhYkR34qiackNTfevncEvtoPsi4Wh1zrpeEf8
   Randomness account: CbsLFFr9x4VDtnoiEdkAn9t5BbqNKJJkhJVvD4uhe9Lx
✅ Box commit recorded in database
   Committed at: 2026-01-15T00:17:08.069Z
   User has until: 2026-01-15T01:17:08.200Z to reveal
2026-01-15T00:17:08.288Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:17:19.808Z - POST /api/program/build-reveal-box-tx

🎰 Building reveal box transaction with Switchboard VRF...
   Project ID: 11
   Box ID: 4
   Owner: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   Time remaining to reveal: 3587 seconds
   Randomness account: CbsLFFr9x4VDtnoiEdkAn9t5BbqNKJJkhJVvD4uhe9Lx
   Platform Config PDA: 6zXM6GCzTKcKZGvn1w5hLBfR29xDep3wYkC6Utjuex1t
   Project Config PDA: 9FgfYV6NkeyoGxwNzEAKuXWtxpNbtBnXTgr9gQUG5Kj3
   Box Instance PDA: H5XReBeDmVtNbQ16vDNvcYg8na8nwjMKie7LhWrmFyWn
   Box created at: 2026-01-15T00:16:48.515Z
   Hold time: 31.484999895095825 seconds
   Luck interval: 1 seconds
   Calculated luck: 36/60

🎰 Creating Switchboard VRF reveal instruction...
[Switchboard] Loading existing randomness account: CbsLFFr9x4VDtnoiEdkAn9t5BbqNKJJkhJVvD4uhe9Lx

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7
[Switchboard] Creating reveal instruction...
   Randomness pubkey: CbsLFFr9x4VDtnoiEdkAn9t5BbqNKJJkhJVvD4uhe9Lx
   Payer: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
   Network: devnet
   Attempt 1/3: Trying SDK revealIx...
fetchRandomnessReveal error AxiosError: read ECONNRESET
    at AxiosError.from (/Users/samskirrow/Dropbox/From My Brain/GIT/3eyes-fatebox-v3/backend/node_modules/axios/dist/node/axios.cjs:914:14)
    at RedirectableRequest.handleRequestError (/Users/samskirrow/Dropbox/From My Brain/GIT/3eyes-fatebox-v3/backend/node_modules/axios/dist/node/axios.cjs:3515:25)
    at RedirectableRequest.emit (node:events:507:28)
    at eventHandlers.<computed> (/Users/samskirrow/Dropbox/From My Brain/GIT/3eyes-fatebox-v3/backend/node_modules/follow-redirects/index.js:49:24)
    at ClientRequest.emit (node:events:507:28)
    at emitErrorEvent (node:_http_client:104:11)
    at TLSSocket.socketErrorListener (node:_http_client:518:5)
    at TLSSocket.emit (node:events:507:28)
    at emitErrorNT (node:internal/streams/destroy:170:8)
    at emitErrorCloseNT (node:internal/streams/destroy:129:3)
    at Axios.request (/Users/samskirrow/Dropbox/From My Brain/GIT/3eyes-fatebox-v3/backend/node_modules/axios/dist/node/axios.cjs:4731:41)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async Gateway.fetchRandomnessReveal (/Users/samskirrow/Dropbox/From My Brain/GIT/3eyes-fatebox-v3/backend/node_modules/@switchboard-xyz/common/dist/esm/gateway.cjs:395:33) {
  syscall: 'read',
  code: 'ECONNRESET',
  errno: -54,
  config: {
    transitional: {
      silentJSONParsing: true,
      forcedJSONParsing: true,
      clarifyTimeoutError: false
    },
    adapter: [ 'xhr', 'http', 'fetch' ],
    transformRequest: [ [Function: transformRequest] ],
    transformResponse: [ [Function: transformResponse] ],
    timeout: 0,
    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'X-XSRF-TOKEN',
    maxContentLength: -1,
    maxBodyLength: -1,
    env: { FormData: [Function], Blob: [class Blob] },
    validateStatus: [Function: validateStatus],
    headers: Object [AxiosHeaders] {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'User-Agent': 'axios/1.13.2',
      'Content-Length': '314',
      'Accept-Encoding': 'gzip, compress, deflate, br'
    },
    method: 'post',
    data: '{"slothash":[200,91,191,223,69,120,83,172,223,38,227,136,47,30,65,229,36,217,114,93,116,246,186,186,236,117,192,58,5,186,17,218],"randomness_key":"ac5f36cd8197dde8dbc3139e9daa7d92e1308d079de868d3d9baa0c05697562d","slot":435208095,"rpc":"https://devnet.helius-rpc.com/?api-key=003c76b9-402b-4cf1-9d84-a71cbabbe5d6"}',
    responseType: 'text',
    url: 'https://162.19.171.93.xip.switchboard-oracles.xyz/devnet/gateway/api/v1/randomness_reveal',
    allowAbsoluteUrls: true
  },
  request: <ref *1> Writable {
    _events: {
      close: undefined,
      error: [Function: handleRequestError],
      prefinish: undefined,
      finish: undefined,
      drain: undefined,
      response: [Function: handleResponse],
      socket: [Array],
      abort: undefined
    },
    _writableState: WritableState {
      highWaterMark: 65536,
      length: 0,
      corked: 0,
      onwrite: [Function: bound onwrite],
      writelen: 0,
      bufferedIndex: 0,
      pendingcb: 0,
      Symbol(kState): 17580812,
      Symbol(kBufferedValue): null
    },
    _maxListeners: undefined,
    _options: {
      maxRedirects: 21,
      maxBodyLength: Infinity,
      protocol: 'https:',
      path: '/devnet/gateway/api/v1/randomness_reveal',
      method: 'POST',
      headers: [Object: null prototype],
      agents: [Object],
      auth: undefined,
      family: undefined,
      beforeRedirect: [Function: dispatchBeforeRedirect],
      beforeRedirects: [Object],
      http2Options: undefined,
      hostname: '162.19.171.93.xip.switchboard-oracles.xyz',
      port: '',
      agent: undefined,
      nativeProtocols: [Object],
      pathname: '/devnet/gateway/api/v1/randomness_reveal'
    },
    _ended: true,
    _ending: true,
    _redirectCount: 0,
    _redirects: [],
    _requestBodyLength: 314,
    _requestBodyBuffers: [ [Object] ],
    _eventsCount: 3,
    _onNativeResponse: [Function (anonymous)],
    _currentRequest: ClientRequest {
      _events: [Object: null prototype],
      _eventsCount: 7,
      _maxListeners: undefined,
      outputData: [],
      outputSize: 0,
      writable: true,
      destroyed: false,
      _last: false,
      chunkedEncoding: false,
      shouldKeepAlive: true,
      maxRequestsOnConnectionReached: false,
      _defaultKeepAlive: true,
      useChunkedEncodingByDefault: true,
      sendDate: false,
      _removedConnection: false,
      _removedContLen: false,
      _removedTE: false,
      strictContentLength: false,
      _contentLength: 314,
      _hasBody: true,
      _trailer: '',
      finished: true,
      _headerSent: true,
      _closed: false,
      _header: 'POST /devnet/gateway/api/v1/randomness_reveal HTTP/1.1\r\n' +
        'Accept: application/json, text/plain, */*\r\n' +
        'Content-Type: application/json\r\n' +
        'User-Agent: axios/1.13.2\r\n' +
        'Content-Length: 314\r\n' +
        'Accept-Encoding: gzip, compress, deflate, br\r\n' +
        'Host: 162.19.171.93.xip.switchboard-oracles.xyz\r\n' +
        'Connection: keep-alive\r\n' +
        '\r\n',
      _keepAliveTimeout: 0,
      _onPendingData: [Function: nop],
      agent: [Agent],
      socketPath: undefined,
      method: 'POST',
      maxHeaderSize: undefined,
      insecureHTTPParser: undefined,
      joinDuplicateHeaders: undefined,
      path: '/devnet/gateway/api/v1/randomness_reveal',
      _ended: false,
      res: null,
      aborted: false,
      timeoutCb: [Function: emitRequestTimeout],
      upgradeOrConnect: false,
      parser: null,
      maxHeadersCount: null,
      reusedSocket: false,
      host: '162.19.171.93.xip.switchboard-oracles.xyz',
      protocol: 'https:',
      _redirectable: [Circular *1],
      Symbol(shapeMode): false,
      Symbol(kCapture): false,
      Symbol(kBytesWritten): 0,
      Symbol(kNeedDrain): false,
      Symbol(corked): 0,
      Symbol(kChunkedBuffer): [],
      Symbol(kChunkedLength): 0,
      Symbol(kSocket): [TLSSocket],
      Symbol(kOutHeaders): [Object: null prototype],
      Symbol(errored): null,
      Symbol(kHighWaterMark): 65536,
      Symbol(kRejectNonStandardBodyWrites): false,
      Symbol(kUniqueHeaders): null
    },
    _currentUrl: 'https://162.19.171.93.xip.switchboard-oracles.xyz/devnet/gateway/api/v1/randomness_reveal',
    _timeout: null,
    Symbol(shapeMode): true,
    Symbol(kCapture): false
  },
  [cause]: Error: read ECONNRESET
      at TLSWrap.onStreamRead (node:internal/stream_base_commons:216:20) {
    errno: -54,
    code: 'ECONNRESET',
    syscall: 'read'
  }
}
   SDK failed: read ECONNRESET
[Switchboard] Error creating reveal instruction: read ECONNRESET
❌ Error building reveal box transaction: AxiosError: read ECONNRESET
    at AxiosError.from (/Users/samskirrow/Dropbox/From My Brain/GIT/3eyes-fatebox-v3/backend/node_modules/axios/dist/node/axios.cjs:914:14)
    at RedirectableRequest.handleRequestError (/Users/samskirrow/Dropbox/From My Brain/GIT/3eyes-fatebox-v3/backend/node_modules/axios/dist/node/axios.cjs:3515:25)
    at RedirectableRequest.emit (node:events:507:28)
    at eventHandlers.<computed> (/Users/samskirrow/Dropbox/From My Brain/GIT/3eyes-fatebox-v3/backend/node_modules/follow-redirects/index.js:49:24)
    at ClientRequest.emit (node:events:507:28)
    at emitErrorEvent (node:_http_client:104:11)
    at TLSSocket.socketErrorListener (node:_http_client:518:5)
    at TLSSocket.emit (node:events:507:28)
    at emitErrorNT (node:internal/streams/destroy:170:8)
    at emitErrorCloseNT (node:internal/streams/destroy:129:3)
    at Axios.request (/Users/samskirrow/Dropbox/From My Brain/GIT/3eyes-fatebox-v3/backend/node_modules/axios/dist/node/axios.cjs:4731:41)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async Gateway.fetchRandomnessReveal (/Users/samskirrow/Dropbox/From My Brain/GIT/3eyes-fatebox-v3/backend/node_modules/@switchboard-xyz/common/dist/esm/gateway.cjs:395:33) {
  syscall: 'read',
  code: 'ECONNRESET',
  errno: -54,
  config: {
    transitional: {
      silentJSONParsing: true,
      forcedJSONParsing: true,
      clarifyTimeoutError: false
    },
    adapter: [ 'xhr', 'http', 'fetch' ],
    transformRequest: [ [Function: transformRequest] ],
    transformResponse: [ [Function: transformResponse] ],
    timeout: 0,
    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'X-XSRF-TOKEN',
    maxContentLength: -1,
    maxBodyLength: -1,
    env: { FormData: [Function], Blob: [class Blob] },
    validateStatus: [Function: validateStatus],
    headers: Object [AxiosHeaders] {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'User-Agent': 'axios/1.13.2',
      'Content-Length': '314',
      'Accept-Encoding': 'gzip, compress, deflate, br'
    },
    method: 'post',
    data: '{"slothash":[200,91,191,223,69,120,83,172,223,38,227,136,47,30,65,229,36,217,114,93,116,246,186,186,236,117,192,58,5,186,17,218],"randomness_key":"ac5f36cd8197dde8dbc3139e9daa7d92e1308d079de868d3d9baa0c05697562d","slot":435208095,"rpc":"https://devnet.helius-rpc.com/?api-key=003c76b9-402b-4cf1-9d84-a71cbabbe5d6"}',
    responseType: 'text',
    url: 'https://162.19.171.93.xip.switchboard-oracles.xyz/devnet/gateway/api/v1/randomness_reveal',
    allowAbsoluteUrls: true
  },
  request: <ref *1> Writable {
    _events: {
      close: undefined,
      error: [Function: handleRequestError],
      prefinish: undefined,
      finish: undefined,
      drain: undefined,
      response: [Function: handleResponse],
      socket: [Array],
      abort: undefined
    },
    _writableState: WritableState {
      highWaterMark: 65536,
      length: 0,
      corked: 0,
      onwrite: [Function: bound onwrite],
      writelen: 0,
      bufferedIndex: 0,
      pendingcb: 0,
      Symbol(kState): 17580812,
      Symbol(kBufferedValue): null
    },
    _maxListeners: undefined,
    _options: {
      maxRedirects: 21,
      maxBodyLength: Infinity,
      protocol: 'https:',
      path: '/devnet/gateway/api/v1/randomness_reveal',
      method: 'POST',
      headers: [Object: null prototype],
      agents: [Object],
      auth: undefined,
      family: undefined,
      beforeRedirect: [Function: dispatchBeforeRedirect],
      beforeRedirects: [Object],
      http2Options: undefined,
      hostname: '162.19.171.93.xip.switchboard-oracles.xyz',
      port: '',
      agent: undefined,
      nativeProtocols: [Object],
      pathname: '/devnet/gateway/api/v1/randomness_reveal'
    },
    _ended: true,
    _ending: true,
    _redirectCount: 0,
    _redirects: [],
    _requestBodyLength: 314,
    _requestBodyBuffers: [ [Object] ],
    _eventsCount: 3,
    _onNativeResponse: [Function (anonymous)],
    _currentRequest: ClientRequest {
      _events: [Object: null prototype],
      _eventsCount: 7,
      _maxListeners: undefined,
      outputData: [],
      outputSize: 0,
      writable: true,
      destroyed: false,
      _last: false,
      chunkedEncoding: false,
      shouldKeepAlive: true,
      maxRequestsOnConnectionReached: false,
      _defaultKeepAlive: true,
      useChunkedEncodingByDefault: true,
      sendDate: false,
      _removedConnection: false,
      _removedContLen: false,
      _removedTE: false,
      strictContentLength: false,
      _contentLength: 314,
      _hasBody: true,
      _trailer: '',
      finished: true,
      _headerSent: true,
      _closed: false,
      _header: 'POST /devnet/gateway/api/v1/randomness_reveal HTTP/1.1\r\n' +
        'Accept: application/json, text/plain, */*\r\n' +
        'Content-Type: application/json\r\n' +
        'User-Agent: axios/1.13.2\r\n' +
        'Content-Length: 314\r\n' +
        'Accept-Encoding: gzip, compress, deflate, br\r\n' +
        'Host: 162.19.171.93.xip.switchboard-oracles.xyz\r\n' +
        'Connection: keep-alive\r\n' +
        '\r\n',
      _keepAliveTimeout: 0,
      _onPendingData: [Function: nop],
      agent: [Agent],
      socketPath: undefined,
      method: 'POST',
      maxHeaderSize: undefined,
      insecureHTTPParser: undefined,
      joinDuplicateHeaders: undefined,
      path: '/devnet/gateway/api/v1/randomness_reveal',
      _ended: false,
      res: null,
      aborted: false,
      timeoutCb: [Function: emitRequestTimeout],
      upgradeOrConnect: false,
      parser: null,
      maxHeadersCount: null,
      reusedSocket: false,
      host: '162.19.171.93.xip.switchboard-oracles.xyz',
      protocol: 'https:',
      _redirectable: [Circular *1],
      Symbol(shapeMode): false,
      Symbol(kCapture): false,
      Symbol(kBytesWritten): 0,
      Symbol(kNeedDrain): false,
      Symbol(corked): 0,
      Symbol(kChunkedBuffer): [],
      Symbol(kChunkedLength): 0,
      Symbol(kSocket): [TLSSocket],
      Symbol(kOutHeaders): [Object: null prototype],
      Symbol(errored): null,
      Symbol(kHighWaterMark): 65536,
      Symbol(kRejectNonStandardBodyWrites): false,
      Symbol(kUniqueHeaders): null
    },
    _currentUrl: 'https://162.19.171.93.xip.switchboard-oracles.xyz/devnet/gateway/api/v1/randomness_reveal',
    _timeout: null,
    Symbol(shapeMode): true,
    Symbol(kCapture): false
  },
  [cause]: Error: read ECONNRESET
      at TLSWrap.onStreamRead (node:internal/stream_base_commons:216:20) {
    errno: -54,
    code: 'ECONNRESET',
    syscall: 'read'
  }
}
2026-01-15T00:18:46.359Z - GET /api/admin/platform-config
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
2026-01-15T00:19:00.326Z - POST /api/admin/update-platform-config

========================================
  Update Platform Config
========================================
Admin wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
Platform Config PDA: 6zXM6GCzTKcKZGvn1w5hLBfR29xDep3wYkC6Utjuex1t
Update params: {
  baseLuck: 'unchanged',
  maxLuck: 'unchanged',
  luckTimeInterval: 3,
  payoutDud: 'unchanged',
  payoutRebate: 'unchanged',
  payoutBreakeven: 'unchanged',
  payoutProfit: 'unchanged',
  payoutJackpot: 'unchanged'
}
Sending transaction...
Transaction sent: 4Kf9fCTB6JEJM7aizxVxVW1r3erBJJyX5tpwqk9CT2QjSgKKMHqS97rPSiZsir3kE2iUbn3dzx8wuAcL4bkayDxp
Platform config updated successfully!
2026-01-15T00:19:01.547Z - GET /api/admin/platform-config
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
2026-01-15T00:19:38.636Z - POST /api/program/build-create-box-tx

🎲 Building create box transaction for project 11...
   Buyer: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   Project: cats
   Box price: 115 CATS
   Current boxes created: 4
   Next box ID (counter + 1): 5
   Platform config PDA: 6zXM6GCzTKcKZGvn1w5hLBfR29xDep3wYkC6Utjuex1t
   Box instance PDA: FzLwu1cAC7ZixtWBtV29E4t9o4GftGzgmnhZzY5uR7mF
   Vault token account: AieQ6gPSeq2EraG6ZJYUFYAWdC8ZuQ6zroYdwsjtedfY
   Treasury PDA: 3mmY9LXhBuNyH7pZDXEBU24QoBwkYT9NWHgHD6PweoPZ
   Treasury token account: 4NjUf1aFYHkR63DUcRHnnuQZTLitfkL3YS2VB2obifxB
   Buyer token account: G1v9RGf4ySEXCoAS7QLxLnSWPmASHjNt5mpcEgosBjCH

💰 Fee split (4% platform commission):
   Total box price: 115 CATS
   → Platform treasury: 4.6 CATS (4%)
   → Creator vault: 110.4 CATS (96%)

📝 Building purchase transaction...
   Added: Create box instruction (pending state, with commission split)

✅ Transaction built successfully!
   Total instructions: 1
   Box will be created in PENDING state (no randomness yet)
2026-01-15T00:19:44.261Z - POST /api/program/confirm-box-creation

✅ Confirming box 5 creation for project 11...
   Transaction: 263cmZy12oZp1KN3JX8UDmuytGXwNcQb8zScKTunVupYCNELPDigBuzKCBhavNd6e7pGe1k5VRjCBWEH8KTzkjMA
✅ Box recorded in database
2026-01-15T00:19:49.506Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:19:49.713Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:20:51.678Z - POST /api/program/build-commit-box-tx

📦 Building commit box transaction for box 5 in project 11...
   Owner: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   Platform config PDA: 6zXM6GCzTKcKZGvn1w5hLBfR29xDep3wYkC6Utjuex1t
   Box instance PDA: FzLwu1cAC7ZixtWBtV29E4t9o4GftGzgmnhZzY5uR7mF
   Project config PDA: 9FgfYV6NkeyoGxwNzEAKuXWtxpNbtBnXTgr9gQUG5Kj3

🎰 Setting up Switchboard VRF randomness...

[Switchboard] Creating randomness account...
   Payer: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7
   Randomness account: 3CkLFp9PfwSoXpVBL7LGavX8Vy78XS9THJuoTEk97RBN
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7
   Randomness account: 3CkLFp9PfwSoXpVBL7LGavX8Vy78XS9THJuoTEk97RBN
[Switchboard] Creating commit instruction...
   Authority: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7

📝 Building commit transaction...
   Added: Create randomness account instruction
   Added: Commit to randomness instruction
   Added: commit_box instruction

✅ Commit transaction built successfully!
   Total instructions: 3
   User has 1 HOUR to reveal after this commits
2026-01-15T00:20:56.078Z - POST /api/program/confirm-commit

✅ Confirming commit for box 5 in project 11...
   Transaction: TiJz1aA5PDa5nafaDAo43xxamGkCB3QjG137dos1A9DrXb63wwZqWSGzfMLv4WXmjPPs1vJdxchZHxvGeBqq7p7
   Randomness account: 3CkLFp9PfwSoXpVBL7LGavX8Vy78XS9THJuoTEk97RBN
✅ Box commit recorded in database
   Committed at: 2026-01-15T00:20:56.207Z
   User has until: 2026-01-15T01:20:56.328Z to reveal
2026-01-15T00:20:56.416Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:21:08.125Z - POST /api/program/build-reveal-box-tx

🎰 Building reveal box transaction with Switchboard VRF...
   Project ID: 11
   Box ID: 5
   Owner: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   Time remaining to reveal: 3587 seconds
   Randomness account: 3CkLFp9PfwSoXpVBL7LGavX8Vy78XS9THJuoTEk97RBN
   Platform Config PDA: 6zXM6GCzTKcKZGvn1w5hLBfR29xDep3wYkC6Utjuex1t
   Project Config PDA: 9FgfYV6NkeyoGxwNzEAKuXWtxpNbtBnXTgr9gQUG5Kj3
   Box Instance PDA: FzLwu1cAC7ZixtWBtV29E4t9o4GftGzgmnhZzY5uR7mF
   Box created at: 2026-01-15T00:19:44.369Z
   Hold time: 83.63100004196167 seconds
   Luck interval: 1 seconds
   Calculated luck: 60/60

🎰 Creating Switchboard VRF reveal instruction...
[Switchboard] Loading existing randomness account: 3CkLFp9PfwSoXpVBL7LGavX8Vy78XS9THJuoTEk97RBN

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7
[Switchboard] Creating reveal instruction...
   Randomness pubkey: 3CkLFp9PfwSoXpVBL7LGavX8Vy78XS9THJuoTEk97RBN
   Payer: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
   Network: devnet
   Attempt 1/3: Trying SDK revealIx...
   SDK revealIx succeeded!
   Replacing payer DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN with buyer DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
   Reveal instruction created successfully
   Instruction program: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Instruction keys: 12 accounts
   Required signers: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN, DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN

📝 Building combined reveal transaction...
   Added: Switchboard reveal instruction
   Added: reveal_box instruction with randomness account

✅ Reveal transaction built successfully with Switchboard VRF!
   Total instructions: 2
2026-01-15T00:21:17.614Z - POST /api/program/confirm-reveal

✅ Confirming box 5 reveal for project 11...
   Transaction: 49V7a8xj2q9PZBrAWC7HGLaUxPoxmnMb12T9YyUUus9dQAxNpewReL9YZQrRvMuXUZFnjcK4sXwvyzWSUtMhCbQK
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   On-chain reward: Rebate (tier 1) - 92000000000 (92 CATS)
   Luck: 29/60, Random: 48.40%
✅ Box reveal recorded in database
2026-01-15T00:21:18.226Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:22:12.851Z - POST /api/program/build-create-box-tx

🎲 Building create box transaction for project 11...
   Buyer: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   Project: cats
   Box price: 115 CATS
   Current boxes created: 5
   Next box ID (counter + 1): 6
   Platform config PDA: 6zXM6GCzTKcKZGvn1w5hLBfR29xDep3wYkC6Utjuex1t
   Box instance PDA: Gdh6WRF13xJhqbuWUafEsziuGMeyEmsWj1FTtyUhyCCn
   Vault token account: AieQ6gPSeq2EraG6ZJYUFYAWdC8ZuQ6zroYdwsjtedfY
   Treasury PDA: 3mmY9LXhBuNyH7pZDXEBU24QoBwkYT9NWHgHD6PweoPZ
   Treasury token account: 4NjUf1aFYHkR63DUcRHnnuQZTLitfkL3YS2VB2obifxB
   Buyer token account: G1v9RGf4ySEXCoAS7QLxLnSWPmASHjNt5mpcEgosBjCH

💰 Fee split (4% platform commission):
   Total box price: 115 CATS
   → Platform treasury: 4.6 CATS (4%)
   → Creator vault: 110.4 CATS (96%)

📝 Building purchase transaction...
   Added: Create box instruction (pending state, with commission split)

✅ Transaction built successfully!
   Total instructions: 1
   Box will be created in PENDING state (no randomness yet)
2026-01-15T00:22:19.759Z - POST /api/program/confirm-box-creation

✅ Confirming box 6 creation for project 11...
   Transaction: 5W6sZKQRnrgqUPSVtE2JkbjMNqYTnCzzLYyWHzFJugFsoZ1pYNGhrEYwPWMn3XsT6gSTkeDs59KEW5Dz75xCt2uQ
✅ Box recorded in database
2026-01-15T00:22:24.404Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:22:24.573Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:22:26.874Z - POST /api/program/build-commit-box-tx

📦 Building commit box transaction for box 6 in project 11...
   Owner: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   Platform config PDA: 6zXM6GCzTKcKZGvn1w5hLBfR29xDep3wYkC6Utjuex1t
   Box instance PDA: Gdh6WRF13xJhqbuWUafEsziuGMeyEmsWj1FTtyUhyCCn
   Project config PDA: 9FgfYV6NkeyoGxwNzEAKuXWtxpNbtBnXTgr9gQUG5Kj3

🎰 Setting up Switchboard VRF randomness...

[Switchboard] Creating randomness account...
   Payer: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7
   Randomness account: DfDpvuM4NN3rA6UqN7gAArboZC9XqjTDhQWxrXBg2Vpv
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7
   Randomness account: DfDpvuM4NN3rA6UqN7gAArboZC9XqjTDhQWxrXBg2Vpv
[Switchboard] Creating commit instruction...
   Authority: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7

📝 Building commit transaction...
   Added: Create randomness account instruction
   Added: Commit to randomness instruction
   Added: commit_box instruction

✅ Commit transaction built successfully!
   Total instructions: 3
   User has 1 HOUR to reveal after this commits
2026-01-15T00:22:32.834Z - POST /api/program/confirm-commit

✅ Confirming commit for box 6 in project 11...
   Transaction: 2vALphzHomRhvnC7twJLDhhodUfcxP5JAn6AmHF7xPpbP7hrPbSjAxCifAFGfK98Ba6LZifZX7gtHFZkMLLuJdVX
   Randomness account: DfDpvuM4NN3rA6UqN7gAArboZC9XqjTDhQWxrXBg2Vpv
✅ Box commit recorded in database
   Committed at: 2026-01-15T00:22:32.976Z
   User has until: 2026-01-15T01:22:33.113Z to reveal
2026-01-15T00:22:33.204Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:22:44.762Z - POST /api/program/build-reveal-box-tx

🎰 Building reveal box transaction with Switchboard VRF...
   Project ID: 11
   Box ID: 6
   Owner: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   Time remaining to reveal: 3587 seconds
   Randomness account: DfDpvuM4NN3rA6UqN7gAArboZC9XqjTDhQWxrXBg2Vpv
   Platform Config PDA: 6zXM6GCzTKcKZGvn1w5hLBfR29xDep3wYkC6Utjuex1t
   Project Config PDA: 9FgfYV6NkeyoGxwNzEAKuXWtxpNbtBnXTgr9gQUG5Kj3
   Box Instance PDA: Gdh6WRF13xJhqbuWUafEsziuGMeyEmsWj1FTtyUhyCCn
   Box created at: 2026-01-15T00:22:19.899Z
   Hold time: 25.1010000705719 seconds
   Luck interval: 1 seconds
   Calculated luck: 30/60

🎰 Creating Switchboard VRF reveal instruction...
[Switchboard] Loading existing randomness account: DfDpvuM4NN3rA6UqN7gAArboZC9XqjTDhQWxrXBg2Vpv

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7
[Switchboard] Creating reveal instruction...
   Randomness pubkey: DfDpvuM4NN3rA6UqN7gAArboZC9XqjTDhQWxrXBg2Vpv
   Payer: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
   Network: devnet
   Attempt 1/3: Trying SDK revealIx...
   SDK revealIx succeeded!
   Replacing payer DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN with buyer DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
   Reveal instruction created successfully
   Instruction program: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Instruction keys: 12 accounts
   Required signers: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN, DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN

📝 Building combined reveal transaction...
   Added: Switchboard reveal instruction
   Added: reveal_box instruction with randomness account

✅ Reveal transaction built successfully with Switchboard VRF!
   Total instructions: 2
2026-01-15T00:22:54.991Z - POST /api/program/confirm-reveal

✅ Confirming box 6 reveal for project 11...
   Transaction: 4vehA97hFye1oqfJzVa5D1jHeWmPRKETsbRNxA9eZBoYLzmnuU83bsA1afqAgTjBb3DzkghNFUJaNTcFsJ7S4hZc
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   On-chain reward: Rebate (tier 1) - 92000000000 (92 CATS)
   Luck: 9/60, Random: 70.09%
✅ Box reveal recorded in database
2026-01-15T00:22:55.582Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgNThat worked too!! So weird!

Let me try another quick one!
      reusedSocket: false,
      host: '162.19.171.93.xip.switchboard-oracles.xyz',
      protocol: 'https:',
      _redirectable: [Circular *1],
      Symbol(shapeMode): false,
      Symbol(kCapture): false,
      Symbol(kBytesWritten): 0,
      Symbol(kNeedDrain): false,
      Symbol(corked): 0,
      Symbol(kChunkedBuffer): [],
      Symbol(kChunkedLength): 0,
      Symbol(kSocket): [TLSSocket],
      Symbol(kOutHeaders): [Object: null prototype],
      Symbol(errored): null,
      Symbol(kHighWaterMark): 65536,
      Symbol(kRejectNonStandardBodyWrites): false,
      Symbol(kUniqueHeaders): null
    },
    _currentUrl: 'https://162.19.171.93.xip.switchboard-oracles.xyz/devnet/gateway/api/v1/randomness_reveal',
    _timeout: null,
    Symbol(shapeMode): true,
    Symbol(kCapture): false
  },
  [cause]: Error: read ECONNRESET
      at TLSWrap.onStreamRead (node:internal/stream_base_commons:216:20) {
    errno: -54,
    code: 'ECONNRESET',
    syscall: 'read'
  }
}
   SDK failed: read ECONNRESET
[Switchboard] Error creating reveal instruction: read ECONNRESET
❌ Error building reveal box transaction: AxiosError: read ECONNRESET
    at AxiosError.from (/Users/samskirrow/Dropbox/From My Brain/GIT/3eyes-fatebox-v3/backend/node_modules/axios/dist/node/axios.cjs:914:14)
    at RedirectableRequest.handleRequestError (/Users/samskirrow/Dropbox/From My Brain/GIT/3eyes-fatebox-v3/backend/node_modules/axios/dist/node/axios.cjs:3515:25)
    at RedirectableRequest.emit (node:events:507:28)
    at eventHandlers.<computed> (/Users/samskirrow/Dropbox/From My Brain/GIT/3eyes-fatebox-v3/backend/node_modules/follow-redirects/index.js:49:24)
    at ClientRequest.emit (node:events:507:28)
    at emitErrorEvent (node:_http_client:104:11)
    at TLSSocket.socketErrorListener (node:_http_client:518:5)
    at TLSSocket.emit (node:events:507:28)
    at emitErrorNT (node:internal/streams/destroy:170:8)
    at emitErrorCloseNT (node:internal/streams/destroy:129:3)
    at Axios.request (/Users/samskirrow/Dropbox/From My Brain/GIT/3eyes-fatebox-v3/backend/node_modules/axios/dist/node/axios.cjs:4731:41)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async Gateway.fetchRandomnessReveal (/Users/samskirrow/Dropbox/From My Brain/GIT/3eyes-fatebox-v3/backend/node_modules/@switchboard-xyz/common/dist/esm/gateway.cjs:395:33) {
  syscall: 'read',
  code: 'ECONNRESET',
  errno: -54,
  config: {
    transitional: {
      silentJSONParsing: true,
      forcedJSONParsing: true,
      clarifyTimeoutError: false
    },
    adapter: [ 'xhr', 'http', 'fetch' ],
    transformRequest: [ [Function: transformRequest] ],
    transformResponse: [ [Function: transformResponse] ],
    timeout: 0,
    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'X-XSRF-TOKEN',
    maxContentLength: -1,
    maxBodyLength: -1,
    env: { FormData: [Function], Blob: [class Blob] },
    validateStatus: [Function: validateStatus],
    headers: Object [AxiosHeaders] {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'User-Agent': 'axios/1.13.2',
      'Content-Length': '314',
      'Accept-Encoding': 'gzip, compress, deflate, br'
    },
    method: 'post',
    data: '{"slothash":[200,91,191,223,69,120,83,172,223,38,227,136,47,30,65,229,36,217,114,93,116,246,186,186,236,117,192,58,5,186,17,218],"randomness_key":"ac5f36cd8197dde8dbc3139e9daa7d92e1308d079de868d3d9baa0c05697562d","slot":435208095,"rpc":"https://devnet.helius-rpc.com/?api-key=003c76b9-402b-4cf1-9d84-a71cbabbe5d6"}',
    responseType: 'text',
    url: 'https://162.19.171.93.xip.switchboard-oracles.xyz/devnet/gateway/api/v1/randomness_reveal',
    allowAbsoluteUrls: true
  },
  request: <ref *1> Writable {
    _events: {
      close: undefined,
      error: [Function: handleRequestError],
      prefinish: undefined,
      finish: undefined,
      drain: undefined,
      response: [Function: handleResponse],
      socket: [Array],
      abort: undefined
    },
    _writableState: WritableState {
      highWaterMark: 65536,
      length: 0,
      corked: 0,
      onwrite: [Function: bound onwrite],
      writelen: 0,
      bufferedIndex: 0,
      pendingcb: 0,
      Symbol(kState): 17580812,
      Symbol(kBufferedValue): null
    },
    _maxListeners: undefined,
    _options: {
      maxRedirects: 21,
      maxBodyLength: Infinity,
      protocol: 'https:',
      path: '/devnet/gateway/api/v1/randomness_reveal',
      method: 'POST',
      headers: [Object: null prototype],
      agents: [Object],
      auth: undefined,
      family: undefined,
      beforeRedirect: [Function: dispatchBeforeRedirect],
      beforeRedirects: [Object],
      http2Options: undefined,
      hostname: '162.19.171.93.xip.switchboard-oracles.xyz',
      port: '',
      agent: undefined,
      nativeProtocols: [Object],
      pathname: '/devnet/gateway/api/v1/randomness_reveal'
    },
    _ended: true,
    _ending: true,
    _redirectCount: 0,
    _redirects: [],
    _requestBodyLength: 314,
    _requestBodyBuffers: [ [Object] ],
    _eventsCount: 3,
    _onNativeResponse: [Function (anonymous)],
    _currentRequest: ClientRequest {
      _events: [Object: null prototype],
      _eventsCount: 7,
      _maxListeners: undefined,
      outputData: [],
      outputSize: 0,
      writable: true,
      destroyed: false,
      _last: false,
      chunkedEncoding: false,
      shouldKeepAlive: true,
      maxRequestsOnConnectionReached: false,
      _defaultKeepAlive: true,
      useChunkedEncodingByDefault: true,
      sendDate: false,
      _removedConnection: false,
      _removedContLen: false,
      _removedTE: false,
      strictContentLength: false,
      _contentLength: 314,
      _hasBody: true,
      _trailer: '',
      finished: true,
      _headerSent: true,
      _closed: false,
      _header: 'POST /devnet/gateway/api/v1/randomness_reveal HTTP/1.1\r\n' +
        'Accept: application/json, text/plain, */*\r\n' +
        'Content-Type: application/json\r\n' +
        'User-Agent: axios/1.13.2\r\n' +
        'Content-Length: 314\r\n' +
        'Accept-Encoding: gzip, compress, deflate, br\r\n' +
        'Host: 162.19.171.93.xip.switchboard-oracles.xyz\r\n' +
        'Connection: keep-alive\r\n' +
        '\r\n',
      _keepAliveTimeout: 0,
      _onPendingData: [Function: nop],
      agent: [Agent],
      socketPath: undefined,
      method: 'POST',
      maxHeaderSize: undefined,
      insecureHTTPParser: undefined,
      joinDuplicateHeaders: undefined,
      path: '/devnet/gateway/api/v1/randomness_reveal',
      _ended: false,
      res: null,
      aborted: false,
      timeoutCb: [Function: emitRequestTimeout],
      upgradeOrConnect: false,
      parser: null,
      maxHeadersCount: null,
      reusedSocket: false,
      host: '162.19.171.93.xip.switchboard-oracles.xyz',
      protocol: 'https:',
      _redirectable: [Circular *1],
      Symbol(shapeMode): false,
      Symbol(kCapture): false,
      Symbol(kBytesWritten): 0,
      Symbol(kNeedDrain): false,
      Symbol(corked): 0,
      Symbol(kChunkedBuffer): [],
      Symbol(kChunkedLength): 0,
      Symbol(kSocket): [TLSSocket],
      Symbol(kOutHeaders): [Object: null prototype],
      Symbol(errored): null,
      Symbol(kHighWaterMark): 65536,
      Symbol(kRejectNonStandardBodyWrites): false,
      Symbol(kUniqueHeaders): null
    },
    _currentUrl: 'https://162.19.171.93.xip.switchboard-oracles.xyz/devnet/gateway/api/v1/randomness_reveal',
    _timeout: null,
    Symbol(shapeMode): true,
    Symbol(kCapture): false
  },
  [cause]: Error: read ECONNRESET
      at TLSWrap.onStreamRead (node:internal/stream_base_commons:216:20) {
    errno: -54,
    code: 'ECONNRESET',
    syscall: 'read'
  }
}
2026-01-15T00:18:46.359Z - GET /api/admin/platform-config
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
2026-01-15T00:19:00.326Z - POST /api/admin/update-platform-config

========================================
  Update Platform Config
========================================
Admin wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
Platform Config PDA: 6zXM6GCzTKcKZGvn1w5hLBfR29xDep3wYkC6Utjuex1t
Update params: {
  baseLuck: 'unchanged',
  maxLuck: 'unchanged',
  luckTimeInterval: 3,
  payoutDud: 'unchanged',
  payoutRebate: 'unchanged',
  payoutBreakeven: 'unchanged',
  payoutProfit: 'unchanged',
  payoutJackpot: 'unchanged'
}
Sending transaction...
Transaction sent: 4Kf9fCTB6JEJM7aizxVxVW1r3erBJJyX5tpwqk9CT2QjSgKKMHqS97rPSiZsir3kE2iUbn3dzx8wuAcL4bkayDxp
Platform config updated successfully!
2026-01-15T00:19:01.547Z - GET /api/admin/platform-config
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
2026-01-15T00:19:38.636Z - POST /api/program/build-create-box-tx

🎲 Building create box transaction for project 11...
   Buyer: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   Project: cats
   Box price: 115 CATS
   Current boxes created: 4
   Next box ID (counter + 1): 5
   Platform config PDA: 6zXM6GCzTKcKZGvn1w5hLBfR29xDep3wYkC6Utjuex1t
   Box instance PDA: FzLwu1cAC7ZixtWBtV29E4t9o4GftGzgmnhZzY5uR7mF
   Vault token account: AieQ6gPSeq2EraG6ZJYUFYAWdC8ZuQ6zroYdwsjtedfY
   Treasury PDA: 3mmY9LXhBuNyH7pZDXEBU24QoBwkYT9NWHgHD6PweoPZ
   Treasury token account: 4NjUf1aFYHkR63DUcRHnnuQZTLitfkL3YS2VB2obifxB
   Buyer token account: G1v9RGf4ySEXCoAS7QLxLnSWPmASHjNt5mpcEgosBjCH

💰 Fee split (4% platform commission):
   Total box price: 115 CATS
   → Platform treasury: 4.6 CATS (4%)
   → Creator vault: 110.4 CATS (96%)

📝 Building purchase transaction...
   Added: Create box instruction (pending state, with commission split)

✅ Transaction built successfully!
   Total instructions: 1
   Box will be created in PENDING state (no randomness yet)
2026-01-15T00:19:44.261Z - POST /api/program/confirm-box-creation

✅ Confirming box 5 creation for project 11...
   Transaction: 263cmZy12oZp1KN3JX8UDmuytGXwNcQb8zScKTunVupYCNELPDigBuzKCBhavNd6e7pGe1k5VRjCBWEH8KTzkjMA
✅ Box recorded in database
2026-01-15T00:19:49.506Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:19:49.713Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:20:51.678Z - POST /api/program/build-commit-box-tx

📦 Building commit box transaction for box 5 in project 11...
   Owner: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   Platform config PDA: 6zXM6GCzTKcKZGvn1w5hLBfR29xDep3wYkC6Utjuex1t
   Box instance PDA: FzLwu1cAC7ZixtWBtV29E4t9o4GftGzgmnhZzY5uR7mF
   Project config PDA: 9FgfYV6NkeyoGxwNzEAKuXWtxpNbtBnXTgr9gQUG5Kj3

🎰 Setting up Switchboard VRF randomness...

[Switchboard] Creating randomness account...
   Payer: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7
   Randomness account: 3CkLFp9PfwSoXpVBL7LGavX8Vy78XS9THJuoTEk97RBN
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7
   Randomness account: 3CkLFp9PfwSoXpVBL7LGavX8Vy78XS9THJuoTEk97RBN
[Switchboard] Creating commit instruction...
   Authority: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7

📝 Building commit transaction...
   Added: Create randomness account instruction
   Added: Commit to randomness instruction
   Added: commit_box instruction

✅ Commit transaction built successfully!
   Total instructions: 3
   User has 1 HOUR to reveal after this commits
2026-01-15T00:20:56.078Z - POST /api/program/confirm-commit

✅ Confirming commit for box 5 in project 11...
   Transaction: TiJz1aA5PDa5nafaDAo43xxamGkCB3QjG137dos1A9DrXb63wwZqWSGzfMLv4WXmjPPs1vJdxchZHxvGeBqq7p7
   Randomness account: 3CkLFp9PfwSoXpVBL7LGavX8Vy78XS9THJuoTEk97RBN
✅ Box commit recorded in database
   Committed at: 2026-01-15T00:20:56.207Z
   User has until: 2026-01-15T01:20:56.328Z to reveal
2026-01-15T00:20:56.416Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:21:08.125Z - POST /api/program/build-reveal-box-tx

🎰 Building reveal box transaction with Switchboard VRF...
   Project ID: 11
   Box ID: 5
   Owner: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   Time remaining to reveal: 3587 seconds
   Randomness account: 3CkLFp9PfwSoXpVBL7LGavX8Vy78XS9THJuoTEk97RBN
   Platform Config PDA: 6zXM6GCzTKcKZGvn1w5hLBfR29xDep3wYkC6Utjuex1t
   Project Config PDA: 9FgfYV6NkeyoGxwNzEAKuXWtxpNbtBnXTgr9gQUG5Kj3
   Box Instance PDA: FzLwu1cAC7ZixtWBtV29E4t9o4GftGzgmnhZzY5uR7mF
   Box created at: 2026-01-15T00:19:44.369Z
   Hold time: 83.63100004196167 seconds
   Luck interval: 1 seconds
   Calculated luck: 60/60

🎰 Creating Switchboard VRF reveal instruction...
[Switchboard] Loading existing randomness account: 3CkLFp9PfwSoXpVBL7LGavX8Vy78XS9THJuoTEk97RBN

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7
[Switchboard] Creating reveal instruction...
   Randomness pubkey: 3CkLFp9PfwSoXpVBL7LGavX8Vy78XS9THJuoTEk97RBN
   Payer: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
   Network: devnet
   Attempt 1/3: Trying SDK revealIx...
   SDK revealIx succeeded!
   Replacing payer DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN with buyer DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
   Reveal instruction created successfully
   Instruction program: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Instruction keys: 12 accounts
   Required signers: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN, DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN

📝 Building combined reveal transaction...
   Added: Switchboard reveal instruction
   Added: reveal_box instruction with randomness account

✅ Reveal transaction built successfully with Switchboard VRF!
   Total instructions: 2
2026-01-15T00:21:17.614Z - POST /api/program/confirm-reveal

✅ Confirming box 5 reveal for project 11...
   Transaction: 49V7a8xj2q9PZBrAWC7HGLaUxPoxmnMb12T9YyUUus9dQAxNpewReL9YZQrRvMuXUZFnjcK4sXwvyzWSUtMhCbQK
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   On-chain reward: Rebate (tier 1) - 92000000000 (92 CATS)
   Luck: 29/60, Random: 48.40%
✅ Box reveal recorded in database
2026-01-15T00:21:18.226Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:22:12.851Z - POST /api/program/build-create-box-tx

🎲 Building create box transaction for project 11...
   Buyer: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   Project: cats
   Box price: 115 CATS
   Current boxes created: 5
   Next box ID (counter + 1): 6
   Platform config PDA: 6zXM6GCzTKcKZGvn1w5hLBfR29xDep3wYkC6Utjuex1t
   Box instance PDA: Gdh6WRF13xJhqbuWUafEsziuGMeyEmsWj1FTtyUhyCCn
   Vault token account: AieQ6gPSeq2EraG6ZJYUFYAWdC8ZuQ6zroYdwsjtedfY
   Treasury PDA: 3mmY9LXhBuNyH7pZDXEBU24QoBwkYT9NWHgHD6PweoPZ
   Treasury token account: 4NjUf1aFYHkR63DUcRHnnuQZTLitfkL3YS2VB2obifxB
   Buyer token account: G1v9RGf4ySEXCoAS7QLxLnSWPmASHjNt5mpcEgosBjCH

💰 Fee split (4% platform commission):
   Total box price: 115 CATS
   → Platform treasury: 4.6 CATS (4%)
   → Creator vault: 110.4 CATS (96%)

📝 Building purchase transaction...
   Added: Create box instruction (pending state, with commission split)

✅ Transaction built successfully!
   Total instructions: 1
   Box will be created in PENDING state (no randomness yet)
2026-01-15T00:22:19.759Z - POST /api/program/confirm-box-creation

✅ Confirming box 6 creation for project 11...
   Transaction: 5W6sZKQRnrgqUPSVtE2JkbjMNqYTnCzzLYyWHzFJugFsoZ1pYNGhrEYwPWMn3XsT6gSTkeDs59KEW5Dz75xCt2uQ
✅ Box recorded in database
2026-01-15T00:22:24.404Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:22:24.573Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:22:26.874Z - POST /api/program/build-commit-box-tx

📦 Building commit box transaction for box 6 in project 11...
   Owner: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   Platform config PDA: 6zXM6GCzTKcKZGvn1w5hLBfR29xDep3wYkC6Utjuex1t
   Box instance PDA: Gdh6WRF13xJhqbuWUafEsziuGMeyEmsWj1FTtyUhyCCn
   Project config PDA: 9FgfYV6NkeyoGxwNzEAKuXWtxpNbtBnXTgr9gQUG5Kj3

🎰 Setting up Switchboard VRF randomness...

[Switchboard] Creating randomness account...
   Payer: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7
   Randomness account: DfDpvuM4NN3rA6UqN7gAArboZC9XqjTDhQWxrXBg2Vpv
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7
   Randomness account: DfDpvuM4NN3rA6UqN7gAArboZC9XqjTDhQWxrXBg2Vpv
[Switchboard] Creating commit instruction...
   Authority: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7

📝 Building commit transaction...
   Added: Create randomness account instruction
   Added: Commit to randomness instruction
   Added: commit_box instruction

✅ Commit transaction built successfully!
   Total instructions: 3
   User has 1 HOUR to reveal after this commits
2026-01-15T00:22:32.834Z - POST /api/program/confirm-commit

✅ Confirming commit for box 6 in project 11...
   Transaction: 2vALphzHomRhvnC7twJLDhhodUfcxP5JAn6AmHF7xPpbP7hrPbSjAxCifAFGfK98Ba6LZifZX7gtHFZkMLLuJdVX
   Randomness account: DfDpvuM4NN3rA6UqN7gAArboZC9XqjTDhQWxrXBg2Vpv
✅ Box commit recorded in database
   Committed at: 2026-01-15T00:22:32.976Z
   User has until: 2026-01-15T01:22:33.113Z to reveal
2026-01-15T00:22:33.204Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:22:44.762Z - POST /api/program/build-reveal-box-tx

🎰 Building reveal box transaction with Switchboard VRF...
   Project ID: 11
   Box ID: 6
   Owner: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   Time remaining to reveal: 3587 seconds
   Randomness account: DfDpvuM4NN3rA6UqN7gAArboZC9XqjTDhQWxrXBg2Vpv
   Platform Config PDA: 6zXM6GCzTKcKZGvn1w5hLBfR29xDep3wYkC6Utjuex1t
   Project Config PDA: 9FgfYV6NkeyoGxwNzEAKuXWtxpNbtBnXTgr9gQUG5Kj3
   Box Instance PDA: Gdh6WRF13xJhqbuWUafEsziuGMeyEmsWj1FTtyUhyCCn
   Box created at: 2026-01-15T00:22:19.899Z
   Hold time: 25.1010000705719 seconds
   Luck interval: 1 seconds
   Calculated luck: 30/60

🎰 Creating Switchboard VRF reveal instruction...
[Switchboard] Loading existing randomness account: DfDpvuM4NN3rA6UqN7gAArboZC9XqjTDhQWxrXBg2Vpv

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7
[Switchboard] Creating reveal instruction...
   Randomness pubkey: DfDpvuM4NN3rA6UqN7gAArboZC9XqjTDhQWxrXBg2Vpv
   Payer: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
   Network: devnet
   Attempt 1/3: Trying SDK revealIx...
   SDK revealIx succeeded!
   Replacing payer DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN with buyer DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
   Reveal instruction created successfully
   Instruction program: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Instruction keys: 12 accounts
   Required signers: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN, DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN

📝 Building combined reveal transaction...
   Added: Switchboard reveal instruction
   Added: reveal_box instruction with randomness account

✅ Reveal transaction built successfully with Switchboard VRF!
   Total instructions: 2
2026-01-15T00:22:54.991Z - POST /api/program/confirm-reveal

✅ Confirming box 6 reveal for project 11...
   Transaction: 4vehA97hFye1oqfJzVa5D1jHeWmPRKETsbRNxA9eZBoYLzmnuU83bsA1afqAgTjBb3DzkghNFUJaNTcFsJ7S4hZc
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   On-chain reward: Rebate (tier 1) - 92000000000 (92 CATS)
   Luck: 9/60, Random: 70.09%
✅ Box reveal recorded in database
2026-01-15T00:22:55.582Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:24:08.716Z - POST /api/program/build-create-box-tx

🎲 Building create box transaction for project 11...
   Buyer: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   Project: cats
   Box price: 115 CATS
   Current boxes created: 6
   Next box ID (counter + 1): 7
   Platform config PDA: 6zXM6GCzTKcKZGvn1w5hLBfR29xDep3wYkC6Utjuex1t
   Box instance PDA: C7dSVYS9c68uPQLHVzbM1sTRADsxZB58j9ZSLjFKvkv1
   Vault token account: AieQ6gPSeq2EraG6ZJYUFYAWdC8ZuQ6zroYdwsjtedfY
   Treasury PDA: 3mmY9LXhBuNyH7pZDXEBU24QoBwkYT9NWHgHD6PweoPZ
   Treasury token account: 4NjUf1aFYHkR63DUcRHnnuQZTLitfkL3YS2VB2obifxB
   Buyer token account: G1v9RGf4ySEXCoAS7QLxLnSWPmASHjNt5mpcEgosBjCH

💰 Fee split (4% platform commission):
   Total box price: 115 CATS
   → Platform treasury: 4.6 CATS (4%)
   → Creator vault: 110.4 CATS (96%)

📝 Building purchase transaction...
   Added: Create box instruction (pending state, with commission split)

✅ Transaction built successfully!
   Total instructions: 1
   Box will be created in PENDING state (no randomness yet)
2026-01-15T00:24:13.727Z - POST /api/program/confirm-box-creation

✅ Confirming box 7 creation for project 11...
   Transaction: 3ACeN8LbvdKa4ch2eTayQ5qzT8Etmp89vRGbdHX6SpFbLHCGrp6St7TZA1u78e55SAXURty54QUGqCLYBCkF9K8k
✅ Box recorded in database
2026-01-15T00:24:15.646Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:24:15.752Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:24:17.458Z - POST /api/program/build-commit-box-tx

📦 Building commit box transaction for box 7 in project 11...
   Owner: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   Platform config PDA: 6zXM6GCzTKcKZGvn1w5hLBfR29xDep3wYkC6Utjuex1t
   Box instance PDA: C7dSVYS9c68uPQLHVzbM1sTRADsxZB58j9ZSLjFKvkv1
   Project config PDA: 9FgfYV6NkeyoGxwNzEAKuXWtxpNbtBnXTgr9gQUG5Kj3

🎰 Setting up Switchboard VRF randomness...

[Switchboard] Creating randomness account...
   Payer: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7
   Randomness account: ZNiECUUcEQ5NbGKauJ3xFvfDoJLh4HS6C8htmbkw7wT
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7
   Randomness account: ZNiECUUcEQ5NbGKauJ3xFvfDoJLh4HS6C8htmbkw7wT
[Switchboard] Creating commit instruction...
   Authority: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7

📝 Building commit transaction...
   Added: Create randomness account instruction
   Added: Commit to randomness instruction
   Added: commit_box instruction

✅ Commit transaction built successfully!
   Total instructions: 3
   User has 1 HOUR to reveal after this commits
2026-01-15T00:24:20.964Z - POST /api/program/confirm-commit

✅ Confirming commit for box 7 in project 11...
   Transaction: 65VGQr5AJx1QhLJf2rchJZyg8NtW8jZ3Xb1mUTwZ1mXCjFYVZ9isDJKgijh2YkTVmUx5nKKSk36WvnnTJ7pejxAA
   Randomness account: ZNiECUUcEQ5NbGKauJ3xFvfDoJLh4HS6C8htmbkw7wT
✅ Box commit recorded in database
   Committed at: 2026-01-15T00:24:21.027Z
   User has until: 2026-01-15T01:24:21.142Z to reveal
2026-01-15T00:24:21.241Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:24:32.663Z - POST /api/program/build-reveal-box-tx

🎰 Building reveal box transaction with Switchboard VRF...
   Project ID: 11
   Box ID: 7
   Owner: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   Time remaining to reveal: 3587 seconds
   Randomness account: ZNiECUUcEQ5NbGKauJ3xFvfDoJLh4HS6C8htmbkw7wT
   Platform Config PDA: 6zXM6GCzTKcKZGvn1w5hLBfR29xDep3wYkC6Utjuex1t
   Project Config PDA: 9FgfYV6NkeyoGxwNzEAKuXWtxpNbtBnXTgr9gQUG5Kj3
   Box Instance PDA: C7dSVYS9c68uPQLHVzbM1sTRADsxZB58j9ZSLjFKvkv1
   Box created at: 2026-01-15T00:24:13.899Z
   Hold time: 19.1010000705719 seconds
   Luck interval: 1 seconds
   Calculated luck: 24/60

🎰 Creating Switchboard VRF reveal instruction...
[Switchboard] Loading existing randomness account: ZNiECUUcEQ5NbGKauJ3xFvfDoJLh4HS6C8htmbkw7wT

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7
[Switchboard] Creating reveal instruction...
   Randomness pubkey: ZNiECUUcEQ5NbGKauJ3xFvfDoJLh4HS6C8htmbkw7wT
   Payer: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
   Network: devnet
   Attempt 1/3: Trying SDK revealIx...
fetchRandomnessReveal error AxiosError: read ECONNRESET
    at AxiosError.from (/Users/samskirrow/Dropbox/From My Brain/GIT/3eyes-fatebox-v3/backend/node_modules/axios/dist/node/axios.cjs:914:14)
    at RedirectableRequest.handleRequestError (/Users/samskirrow/Dropbox/From My Brain/GIT/3eyes-fatebox-v3/backend/node_modules/axios/dist/node/axios.cjs:3515:25)
    at RedirectableRequest.emit (node:events:507:28)
    at eventHandlers.<computed> (/Users/samskirrow/Dropbox/From My Brain/GIT/3eyes-fatebox-v3/backend/node_modules/follow-redirects/index.js:49:24)
    at ClientRequest.emit (node:events:507:28)
    at emitErrorEvent (node:_http_client:104:11)
    at TLSSocket.socketErrorListener (node:_http_client:518:5)
    at TLSSocket.emit (node:events:507:28)
    at emitErrorNT (node:internal/streams/destroy:170:8)
    at emitErrorCloseNT (node:internal/streams/destroy:129:3)
    at Axios.request (/Users/samskirrow/Dropbox/From My Brain/GIT/3eyes-fatebox-v3/backend/node_modules/axios/dist/node/axios.cjs:4731:41)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async Gateway.fetchRandomnessReveal (/Users/samskirrow/Dropbox/From My Brain/GIT/3eyes-fatebox-v3/backend/node_modules/@switchboard-xyz/common/dist/esm/gateway.cjs:395:33) {
  syscall: 'read',
  code: 'ECONNRESET',
  errno: -54,
  config: {
    transitional: {
      silentJSONParsing: true,
      forcedJSONParsing: true,
      clarifyTimeoutError: false
    },
    adapter: [ 'xhr', 'http', 'fetch' ],
    transformRequest: [ [Function: transformRequest] ],
    transformResponse: [ [Function: transformResponse] ],
    timeout: 0,
    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'X-XSRF-TOKEN',
    maxContentLength: -1,
    maxBodyLength: -1,
    env: { FormData: [Function], Blob: [class Blob] },
    validateStatus: [Function: validateStatus],
    headers: Object [AxiosHeaders] {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'User-Agent': 'axios/1.13.2',
      'Content-Length': '310',
      'Accept-Encoding': 'gzip, compress, deflate, br'
    },
    method: 'post',
    data: '{"slothash":[98,205,195,193,156,98,176,179,108,28,86,135,240,231,31,74,192,184,51,167,234,7,155,7,10,19,46,65,20,52,181,100],"randomness_key":"084b22678df3f5403c88106995c80f9edfddbb2e27f7ed586ceafe2cab667d0e","slot":435209209,"rpc":"https://devnet.helius-rpc.com/?api-key=003c76b9-402b-4cf1-9d84-a71cbabbe5d6"}',
    responseType: 'text',
    url: 'https://162.19.171.93.xip.switchboard-oracles.xyz/devnet/gateway/api/v1/randomness_reveal',
    allowAbsoluteUrls: true
  },
  request: <ref *1> Writable {
    _events: {
      close: undefined,
      error: [Function: handleRequestError],
      prefinish: undefined,
      finish: undefined,
      drain: undefined,
      response: [Function: handleResponse],
      socket: [Array],
      abort: undefined
    },
    _writableState: WritableState {
      highWaterMark: 65536,
      length: 0,
      corked: 0,
      onwrite: [Function: bound onwrite],
      writelen: 0,
      bufferedIndex: 0,
      pendingcb: 0,
      Symbol(kState): 17580812,
      Symbol(kBufferedValue): null
    },
    _maxListeners: undefined,
    _options: {
      maxRedirects: 21,
      maxBodyLength: Infinity,
      protocol: 'https:',
      path: '/devnet/gateway/api/v1/randomness_reveal',
      method: 'POST',
      headers: [Object: null prototype],
      agents: [Object],
      auth: undefined,
      family: undefined,
      beforeRedirect: [Function: dispatchBeforeRedirect],
      beforeRedirects: [Object],
      http2Options: undefined,
      hostname: '162.19.171.93.xip.switchboard-oracles.xyz',
      port: '',
      agent: undefined,
      nativeProtocols: [Object],
      pathname: '/devnet/gateway/api/v1/randomness_reveal'
    },
    _ended: true,
    _ending: true,
    _redirectCount: 0,
    _redirects: [],
    _requestBodyLength: 310,
    _requestBodyBuffers: [ [Object] ],
    _eventsCount: 3,
    _onNativeResponse: [Function (anonymous)],
    _currentRequest: ClientRequest {
      _events: [Object: null prototype],
      _eventsCount: 7,
      _maxListeners: undefined,
      outputData: [],
      outputSize: 0,
      writable: true,
      destroyed: false,
      _last: false,
      chunkedEncoding: false,
      shouldKeepAlive: true,
      maxRequestsOnConnectionReached: false,
      _defaultKeepAlive: true,
      useChunkedEncodingByDefault: true,
      sendDate: false,
      _removedConnection: false,
      _removedContLen: false,
      _removedTE: false,
      strictContentLength: false,
      _contentLength: 310,
      _hasBody: true,
      _trailer: '',
      finished: true,
      _headerSent: true,
      _closed: false,
      _header: 'POST /devnet/gateway/api/v1/randomness_reveal HTTP/1.1\r\n' +
        'Accept: application/json, text/plain, */*\r\n' +
        'Content-Type: application/json\r\n' +
        'User-Agent: axios/1.13.2\r\n' +
        'Content-Length: 310\r\n' +
        'Accept-Encoding: gzip, compress, deflate, br\r\n' +
        'Host: 162.19.171.93.xip.switchboard-oracles.xyz\r\n' +
        'Connection: keep-alive\r\n' +
        '\r\n',
      _keepAliveTimeout: 0,
      _onPendingData: [Function: nop],
      agent: [Agent],
      socketPath: undefined,
      method: 'POST',
      maxHeaderSize: undefined,
      insecureHTTPParser: undefined,
      joinDuplicateHeaders: undefined,
      path: '/devnet/gateway/api/v1/randomness_reveal',
      _ended: false,
      res: null,
      aborted: false,
      timeoutCb: [Function: emitRequestTimeout],
      upgradeOrConnect: false,
      parser: null,
      maxHeadersCount: null,
      reusedSocket: false,
      host: '162.19.171.93.xip.switchboard-oracles.xyz',
      protocol: 'https:',
      _redirectable: [Circular *1],
      Symbol(shapeMode): false,
      Symbol(kCapture): false,
      Symbol(kBytesWritten): 0,
      Symbol(kNeedDrain): false,
      Symbol(corked): 0,
      Symbol(kChunkedBuffer): [],
      Symbol(kChunkedLength): 0,
      Symbol(kSocket): [TLSSocket],
      Symbol(kOutHeaders): [Object: null prototype],
      Symbol(errored): null,
      Symbol(kHighWaterMark): 65536,
      Symbol(kRejectNonStandardBodyWrites): false,
      Symbol(kUniqueHeaders): null
    },
    _currentUrl: 'https://162.19.171.93.xip.switchboard-oracles.xyz/devnet/gateway/api/v1/randomness_reveal',
    _timeout: null,
    Symbol(shapeMode): true,
    Symbol(kCapture): false
  },
  [cause]: Error: read ECONNRESET
      at TLSWrap.onStreamRead (node:internal/stream_base_commons:216:20) {
    errno: -54,
    code: 'ECONNRESET',
    syscall: 'read'
  }
}
   SDK failed: read ECONNRESET
[Switchboard] Error creating reveal instruction: read ECONNRESET
❌ Error building reveal box transaction: AxiosError: read ECONNRESET
    at AxiosError.from (/Users/samskirrow/Dropbox/From My Brain/GIT/3eyes-fatebox-v3/backend/node_modules/axios/dist/node/axios.cjs:914:14)
    at RedirectableRequest.handleRequestError (/Users/samskirrow/Dropbox/From My Brain/GIT/3eyes-fatebox-v3/backend/node_modules/axios/dist/node/axios.cjs:3515:25)
    at RedirectableRequest.emit (node:events:507:28)
    at eventHandlers.<computed> (/Users/samskirrow/Dropbox/From My Brain/GIT/3eyes-fatebox-v3/backend/node_modules/follow-redirects/index.js:49:24)
    at ClientRequest.emit (node:events:507:28)
    at emitErrorEvent (node:_http_client:104:11)
    at TLSSocket.socketErrorListener (node:_http_client:518:5)
    at TLSSocket.emit (node:events:507:28)
    at emitErrorNT (node:internal/streams/destroy:170:8)
    at emitErrorCloseNT (node:internal/streams/destroy:129:3)
    at Axios.request (/Users/samskirrow/Dropbox/From My Brain/GIT/3eyes-fatebox-v3/backend/node_modules/axios/dist/node/axios.cjs:4731:41)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async Gateway.fetchRandomnessReveal (/Users/samskirrow/Dropbox/From My Brain/GIT/3eyes-fatebox-v3/backend/node_modules/@switchboard-xyz/common/dist/esm/gateway.cjs:395:33) {
  syscall: 'read',
  code: 'ECONNRESET',
  errno: -54,
  config: {
    transitional: {
      silentJSONParsing: true,
      forcedJSONParsing: true,
      clarifyTimeoutError: false
    },
    adapter: [ 'xhr', 'http', 'fetch' ],
    transformRequest: [ [Function: transformRequest] ],
    transformResponse: [ [Function: transformResponse] ],
    timeout: 0,
    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'X-XSRF-TOKEN',
    maxContentLength: -1,
    maxBodyLength: -1,
    env: { FormData: [Function], Blob: [class Blob] },
    validateStatus: [Function: validateStatus],
    headers: Object [AxiosHeaders] {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'User-Agent': 'axios/1.13.2',
      'Content-Length': '310',
      'Accept-Encoding': 'gzip, compress, deflate, br'
    },
    method: 'post',
    data: '{"slothash":[98,205,195,193,156,98,176,179,108,28,86,135,240,231,31,74,192,184,51,167,234,7,155,7,10,19,46,65,20,52,181,100],"randomness_key":"084b22678df3f5403c88106995c80f9edfddbb2e27f7ed586ceafe2cab667d0e","slot":435209209,"rpc":"https://devnet.helius-rpc.com/?api-key=003c76b9-402b-4cf1-9d84-a71cbabbe5d6"}',
    responseType: 'text',
    url: 'https://162.19.171.93.xip.switchboard-oracles.xyz/devnet/gateway/api/v1/randomness_reveal',
    allowAbsoluteUrls: true
  },
  request: <ref *1> Writable {
    _events: {
      close: undefined,
      error: [Function: handleRequestError],
      prefinish: undefined,
      finish: undefined,
      drain: undefined,
      response: [Function: handleResponse],
      socket: [Array],
      abort: undefined
    },
    _writableState: WritableState {
      highWaterMark: 65536,
      length: 0,
      corked: 0,
      onwrite: [Function: bound onwrite],
      writelen: 0,
      bufferedIndex: 0,
      pendingcb: 0,
      Symbol(kState): 17580812,
      Symbol(kBufferedValue): null
    },
    _maxListeners: undefined,
    _options: {
      maxRedirects: 21,
      maxBodyLength: Infinity,
      protocol: 'https:',
      path: '/devnet/gateway/api/v1/randomness_reveal',
      method: 'POST',
      headers: [Object: null prototype],
      agents: [Object],
      auth: undefined,
      family: undefined,
      beforeRedirect: [Function: dispatchBeforeRedirect],
      beforeRedirects: [Object],
      http2Options: undefined,
      hostname: '162.19.171.93.xip.switchboard-oracles.xyz',
      port: '',
      agent: undefined,
      nativeProtocols: [Object],
      pathname: '/devnet/gateway/api/v1/randomness_reveal'
    },
    _ended: true,
    _ending: true,
    _redirectCount: 0,
    _redirects: [],
    _requestBodyLength: 310,
    _requestBodyBuffers: [ [Object] ],
    _eventsCount: 3,
    _onNativeResponse: [Function (anonymous)],
    _currentRequest: ClientRequest {
      _events: [Object: null prototype],
      _eventsCount: 7,
      _maxListeners: undefined,
      outputData: [],
      outputSize: 0,
      writable: true,
      destroyed: false,
      _last: false,
      chunkedEncoding: false,
      shouldKeepAlive: true,
      maxRequestsOnConnectionReached: false,
      _defaultKeepAlive: true,
      useChunkedEncodingByDefault: true,
      sendDate: false,
      _removedConnection: false,
      _removedContLen: false,
      _removedTE: false,
      strictContentLength: false,
      _contentLength: 310,
      _hasBody: true,
      _trailer: '',
      finished: true,
      _headerSent: true,
      _closed: false,
      _header: 'POST /devnet/gateway/api/v1/randomness_reveal HTTP/1.1\r\n' +
        'Accept: application/json, text/plain, */*\r\n' +
        'Content-Type: application/json\r\n' +
        'User-Agent: axios/1.13.2\r\n' +
        'Content-Length: 310\r\n' +
        'Accept-Encoding: gzip, compress, deflate, br\r\n' +
        'Host: 162.19.171.93.xip.switchboard-oracles.xyz\r\n' +
        'Connection: keep-alive\r\n' +
        '\r\n',
      _keepAliveTimeout: 0,
      _onPendingData: [Function: nop],
      agent: [Agent],
      socketPath: undefined,
      method: 'POST',
      maxHeaderSize: undefined,
      insecureHTTPParser: undefined,
      joinDuplicateHeaders: undefined,
      path: '/devnet/gateway/api/v1/randomness_reveal',
      _ended: false,
      res: null,
      aborted: false,
      timeoutCb: [Function: emitRequestTimeout],
      upgradeOrConnect: false,
      parser: null,
      maxHeadersCount: null,
      reusedSocket: false,
      host: '162.19.171.93.xip.switchboard-oracles.xyz',
      protocol: 'https:',
      _redirectable: [Circular *1],
      Symbol(shapeMode): false,
      Symbol(kCapture): false,
      Symbol(kBytesWritten): 0,
      Symbol(kNeedDrain): false,
      Symbol(corked): 0,
      Symbol(kChunkedBuffer): [],
      Symbol(kChunkedLength): 0,
      Symbol(kSocket): [TLSSocket],
      Symbol(kOutHeaders): [Object: null prototype],
      Symbol(errored): null,
      Symbol(kHighWaterMark): 65536,
      Symbol(kRejectNonStandardBodyWrites): false,
      Symbol(kUniqueHeaders): null
    },
    _currentUrl: 'https://162.19.171.93.xip.switchboard-oracles.xyz/devnet/gateway/api/v1/randomness_reveal',
    _timeout: null,
    Symbol(shapeMode): true,
    Symbol(kCapture): false
  },
  [cause]: Error: read ECONNRESET
      at TLSWrap.onStreamRead (node:internal/stream_base_commons:216:20) {
    errno: -54,
    code: 'ECONNRESET',
    syscall: 'read'
  }
}Failed…didn’t like it!
Now let me try one with a 30 second wait after buying
2026-01-15T00:25:27.536Z - POST /api/program/build-create-box-tx

🎲 Building create box transaction for project 11...
   Buyer: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   Project: cats
   Box price: 115 CATS
   Current boxes created: 7
   Next box ID (counter + 1): 8
   Platform config PDA: 6zXM6GCzTKcKZGvn1w5hLBfR29xDep3wYkC6Utjuex1t
   Box instance PDA: 652EBQY22pRXnbGQ3TGpe5QR5rsmAxdR5uBCatb3oPW8
   Vault token account: AieQ6gPSeq2EraG6ZJYUFYAWdC8ZuQ6zroYdwsjtedfY
   Treasury PDA: 3mmY9LXhBuNyH7pZDXEBU24QoBwkYT9NWHgHD6PweoPZ
   Treasury token account: 4NjUf1aFYHkR63DUcRHnnuQZTLitfkL3YS2VB2obifxB
   Buyer token account: G1v9RGf4ySEXCoAS7QLxLnSWPmASHjNt5mpcEgosBjCH

💰 Fee split (4% platform commission):
   Total box price: 115 CATS
   → Platform treasury: 4.6 CATS (4%)
   → Creator vault: 110.4 CATS (96%)

📝 Building purchase transaction...
   Added: Create box instruction (pending state, with commission split)

✅ Transaction built successfully!
   Total instructions: 1
   Box will be created in PENDING state (no randomness yet)
2026-01-15T00:25:32.985Z - POST /api/program/confirm-box-creation

✅ Confirming box 8 creation for project 11...
   Transaction: 3DCsYh2EomdkKA7X26dwui5Ckac3nRmieddUFL8vpMEwhU3gXPA7W65By4xtzxqPmQWAj87iyNE8cyxqSdvwbS6R
✅ Box recorded in database
2026-01-15T00:25:37.388Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:25:37.549Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:26:05.998Z - POST /api/program/build-commit-box-tx

📦 Building commit box transaction for box 8 in project 11...
   Owner: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   Platform config PDA: 6zXM6GCzTKcKZGvn1w5hLBfR29xDep3wYkC6Utjuex1t
   Box instance PDA: 652EBQY22pRXnbGQ3TGpe5QR5rsmAxdR5uBCatb3oPW8
   Project config PDA: 9FgfYV6NkeyoGxwNzEAKuXWtxpNbtBnXTgr9gQUG5Kj3

🎰 Setting up Switchboard VRF randomness...

[Switchboard] Creating randomness account...
   Payer: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7
   Randomness account: FWAM7bgRTpx1prKoJzyom7JhrhQa6f4298ci3vdPyJSE
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7
   Randomness account: FWAM7bgRTpx1prKoJzyom7JhrhQa6f4298ci3vdPyJSE
[Switchboard] Creating commit instruction...
   Authority: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7

📝 Building commit transaction...
   Added: Create randomness account instruction
   Added: Commit to randomness instruction
   Added: commit_box instruction

✅ Commit transaction built successfully!
   Total instructions: 3
   User has 1 HOUR to reveal after this commits
2026-01-15T00:26:10.803Z - POST /api/program/confirm-commit

✅ Confirming commit for box 8 in project 11...
   Transaction: 2aVQPxLRbQ5gtCWV4WmxY3LUKZgwTUke1ozEmqe6dVkDQimtUCazwQn4EUaUFfTN78Mv6wSt8grusd9mXsJL5bFi
   Randomness account: FWAM7bgRTpx1prKoJzyom7JhrhQa6f4298ci3vdPyJSE
✅ Box commit recorded in database
   Committed at: 2026-01-15T00:26:10.941Z
   User has until: 2026-01-15T01:26:11.055Z to reveal
2026-01-15T00:26:11.154Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
2026-01-15T00:26:22.665Z - POST /api/program/build-reveal-box-tx

🎰 Building reveal box transaction with Switchboard VRF...
   Project ID: 11
   Box ID: 8
   Owner: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   Time remaining to reveal: 3587 seconds
   Randomness account: FWAM7bgRTpx1prKoJzyom7JhrhQa6f4298ci3vdPyJSE
   Platform Config PDA: 6zXM6GCzTKcKZGvn1w5hLBfR29xDep3wYkC6Utjuex1t
   Project Config PDA: 9FgfYV6NkeyoGxwNzEAKuXWtxpNbtBnXTgr9gQUG5Kj3
   Box Instance PDA: 652EBQY22pRXnbGQ3TGpe5QR5rsmAxdR5uBCatb3oPW8
   Box created at: 2026-01-15T00:25:33.092Z
   Hold time: 49.907999992370605 seconds
   Luck interval: 1 seconds
   Calculated luck: 54/60

🎰 Creating Switchboard VRF reveal instruction...
[Switchboard] Loading existing randomness account: FWAM7bgRTpx1prKoJzyom7JhrhQa6f4298ci3vdPyJSE

[Switchboard] Using devnet constants:
   Program ID: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Queue: EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7
[Switchboard] Creating reveal instruction...
   Randomness pubkey: FWAM7bgRTpx1prKoJzyom7JhrhQa6f4298ci3vdPyJSE
   Payer: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
   Network: devnet
   Attempt 1/3: Trying SDK revealIx...
   SDK revealIx succeeded!
   Replacing payer DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN with buyer DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN
   Reveal instruction created successfully
   Instruction program: Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2
   Instruction keys: 12 accounts
   Required signers: DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN, DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN

📝 Building combined reveal transaction...
   Added: Switchboard reveal instruction
   Added: reveal_box instruction with randomness account

✅ Reveal transaction built successfully with Switchboard VRF!
   Total instructions: 2
2026-01-15T00:26:32.071Z - POST /api/program/confirm-reveal

✅ Confirming box 8 reveal for project 11...
   Transaction: 2y5Bj3kSRS5hVAN4Knii49nL5ZPXSDgdvnq8Y3yzQP7acCTvqJPxhZbtDxMojdjD4q2ui9h48nLPE5YPzDodUF6x
✅ Anchor program initialized: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
   Network: devnet
   Deploy wallet: Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6
   On-chain reward: Rebate (tier 1) - 92000000000 (92 CATS)
   Luck: 17/60, Random: 59.20%
✅ Box reveal recorded in database
2026-01-15T00:26:32.690Z - GET /api/projects/boxes/by-owner/DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgNThat worked!!

One more thing, I’m going to go home page, refresh, buy and open after 10s
Failed again.

Let me refresh, buy and wait 20s
That worked!Last test, lets try NOT rehfreshing the page, just going home, buying, waiting 20s and opening
That worked.