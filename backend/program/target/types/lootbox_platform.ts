/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/lootbox_platform.json`.
 */
export type LootboxPlatform = {
  "address": "GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat",
  "metadata": {
    "name": "lootboxPlatform",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "3Eyes Multi-Tenant Lootbox Platform"
  },
  "instructions": [
    {
      "name": "closePlatformConfig",
      "docs": [
        "Close platform config (admin only) - used for migrations/reinitialization",
        "WARNING: This will delete all platform config data. Use with caution."
      ],
      "discriminator": [
        142,
        2,
        40,
        195,
        82,
        25,
        32,
        52
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "platformConfig",
          "docs": [
            "Using UncheckedAccount to handle migration from old struct format."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  116,
                  102,
                  111,
                  114,
                  109,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "closeProject",
      "docs": [
        "Close a project and reclaim rent (only if no pending boxes)"
      ],
      "discriminator": [
        117,
        209,
        53,
        106,
        93,
        55,
        112,
        49
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "projectConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "projectId"
              }
            ]
          }
        },
        {
          "name": "vaultTokenAccount",
          "docs": [
            "Vault must be empty to close"
          ]
        }
      ],
      "args": [
        {
          "name": "projectId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "commitBox",
      "docs": [
        "Commit randomness for a box (user opens box)",
        "Called when user decides to open their box",
        "Freezes luck at commit time and stores Switchboard randomness account"
      ],
      "discriminator": [
        95,
        86,
        24,
        152,
        175,
        101,
        147,
        191
      ],
      "accounts": [
        {
          "name": "owner",
          "signer": true
        },
        {
          "name": "platformConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  116,
                  102,
                  111,
                  114,
                  109,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "projectConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "projectId"
              }
            ]
          }
        },
        {
          "name": "boxInstance",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  120
                ]
              },
              {
                "kind": "arg",
                "path": "projectId"
              },
              {
                "kind": "arg",
                "path": "boxId"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "projectId",
          "type": "u64"
        },
        {
          "name": "boxId",
          "type": "u64"
        },
        {
          "name": "randomnessAccount",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "createBox",
      "docs": [
        "Create a new box (user purchases box)",
        "Transfers payment from buyer to vault",
        "Box is created in \"pending\" state - randomness committed later when user opens"
      ],
      "discriminator": [
        108,
        200,
        91,
        3,
        44,
        99,
        31,
        27
      ],
      "accounts": [
        {
          "name": "buyer",
          "writable": true,
          "signer": true
        },
        {
          "name": "platformConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  116,
                  102,
                  111,
                  114,
                  109,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "projectConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "projectId"
              }
            ]
          }
        },
        {
          "name": "boxInstance",
          "writable": true
        },
        {
          "name": "buyerTokenAccount",
          "writable": true
        },
        {
          "name": "vaultTokenAccount",
          "writable": true
        },
        {
          "name": "treasuryTokenAccount",
          "docs": [
            "Treasury token account for receiving platform commission",
            "This is the ATA of the treasury PDA for this project's token"
          ],
          "writable": true
        },
        {
          "name": "treasury",
          "docs": [
            "Treasury PDA (for verification)"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "projectId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initializePlatformConfig",
      "docs": [
        "Initialize the platform configuration (one-time setup by admin)",
        "This creates a global config PDA that stores all tunable parameters"
      ],
      "discriminator": [
        23,
        52,
        237,
        53,
        176,
        235,
        3,
        187
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "platformConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  116,
                  102,
                  111,
                  114,
                  109,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "treasury",
          "docs": [
            "Global treasury PDA - holds platform commission fees from all projects"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "luckTimeInterval",
          "type": "i64"
        }
      ]
    },
    {
      "name": "initializeProject",
      "docs": [
        "Initialize a new project with vault",
        "Creator pays launch fee in t3EYES1 to create project"
      ],
      "discriminator": [
        69,
        126,
        215,
        37,
        20,
        60,
        73,
        235
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "platformConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  116,
                  102,
                  111,
                  114,
                  109,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "projectConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "projectId"
              }
            ]
          }
        },
        {
          "name": "vaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "projectId"
              },
              {
                "kind": "account",
                "path": "paymentTokenMint"
              }
            ]
          }
        },
        {
          "name": "paymentTokenMint"
        },
        {
          "name": "ownerFeeTokenAccount",
          "docs": [
            "Owner's t3EYES1 token account (pays launch fee)"
          ],
          "writable": true
        },
        {
          "name": "platformFeeTokenAccount",
          "docs": [
            "Platform fee collection account (receives launch fee)"
          ],
          "writable": true
        },
        {
          "name": "feeTokenMint",
          "docs": [
            "t3EYES1 mint (fee token)"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "projectId",
          "type": "u64"
        },
        {
          "name": "boxPrice",
          "type": "u64"
        },
        {
          "name": "launchFeeAmount",
          "type": "u64"
        },
        {
          "name": "luckTimeInterval",
          "type": "i64"
        }
      ]
    },
    {
      "name": "revealBox",
      "docs": [
        "Reveal box with Switchboard VRF randomness",
        "Reads randomness from Switchboard on-demand account",
        "Uses luck that was frozen at commit time"
      ],
      "discriminator": [
        73,
        39,
        85,
        185,
        41,
        110,
        108,
        108
      ],
      "accounts": [
        {
          "name": "owner",
          "signer": true
        },
        {
          "name": "platformConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  116,
                  102,
                  111,
                  114,
                  109,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "projectConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "projectId"
              }
            ]
          }
        },
        {
          "name": "boxInstance",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  120
                ]
              },
              {
                "kind": "arg",
                "path": "projectId"
              },
              {
                "kind": "arg",
                "path": "boxId"
              }
            ]
          }
        },
        {
          "name": "vaultTokenAccount"
        },
        {
          "name": "randomnessAccount"
        }
      ],
      "args": [
        {
          "name": "projectId",
          "type": "u64"
        },
        {
          "name": "boxId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "settleBox",
      "docs": [
        "Settle box and transfer reward to owner",
        "Uses vault authority PDA as signer"
      ],
      "discriminator": [
        25,
        249,
        247,
        141,
        214,
        84,
        154,
        100
      ],
      "accounts": [
        {
          "name": "owner",
          "signer": true
        },
        {
          "name": "projectConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "projectId"
              }
            ]
          }
        },
        {
          "name": "boxInstance",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  120
                ]
              },
              {
                "kind": "arg",
                "path": "projectId"
              },
              {
                "kind": "arg",
                "path": "boxId"
              }
            ]
          }
        },
        {
          "name": "vaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "projectId"
              },
              {
                "kind": "account",
                "path": "paymentTokenMint"
              }
            ]
          }
        },
        {
          "name": "paymentTokenMint"
        },
        {
          "name": "vaultTokenAccount",
          "writable": true
        },
        {
          "name": "ownerTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "projectId",
          "type": "u64"
        },
        {
          "name": "boxId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "transferPlatformAdmin",
      "docs": [
        "Transfer platform admin to new wallet (safety feature)"
      ],
      "discriminator": [
        202,
        249,
        158,
        13,
        232,
        161,
        17,
        72
      ],
      "accounts": [
        {
          "name": "admin",
          "signer": true
        },
        {
          "name": "platformConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  116,
                  102,
                  111,
                  114,
                  109,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "newAdmin",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "updatePlatformConfig",
      "docs": [
        "Update platform configuration (admin only)",
        "Allows adjusting probabilities and payouts without redeploying"
      ],
      "discriminator": [
        195,
        60,
        76,
        129,
        146,
        45,
        67,
        143
      ],
      "accounts": [
        {
          "name": "admin",
          "signer": true
        },
        {
          "name": "platformConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  116,
                  102,
                  111,
                  114,
                  109,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "baseLuck",
          "type": {
            "option": "u8"
          }
        },
        {
          "name": "maxLuck",
          "type": {
            "option": "u8"
          }
        },
        {
          "name": "luckTimeInterval",
          "type": {
            "option": "i64"
          }
        },
        {
          "name": "payoutDud",
          "type": {
            "option": "u32"
          }
        },
        {
          "name": "payoutRebate",
          "type": {
            "option": "u32"
          }
        },
        {
          "name": "payoutBreakeven",
          "type": {
            "option": "u32"
          }
        },
        {
          "name": "payoutProfit",
          "type": {
            "option": "u32"
          }
        },
        {
          "name": "payoutJackpot",
          "type": {
            "option": "u32"
          }
        },
        {
          "name": "tier1MaxLuck",
          "type": {
            "option": "u8"
          }
        },
        {
          "name": "tier1Dud",
          "type": {
            "option": "u16"
          }
        },
        {
          "name": "tier1Rebate",
          "type": {
            "option": "u16"
          }
        },
        {
          "name": "tier1Breakeven",
          "type": {
            "option": "u16"
          }
        },
        {
          "name": "tier1Profit",
          "type": {
            "option": "u16"
          }
        },
        {
          "name": "tier2MaxLuck",
          "type": {
            "option": "u8"
          }
        },
        {
          "name": "tier2Dud",
          "type": {
            "option": "u16"
          }
        },
        {
          "name": "tier2Rebate",
          "type": {
            "option": "u16"
          }
        },
        {
          "name": "tier2Breakeven",
          "type": {
            "option": "u16"
          }
        },
        {
          "name": "tier2Profit",
          "type": {
            "option": "u16"
          }
        },
        {
          "name": "tier3Dud",
          "type": {
            "option": "u16"
          }
        },
        {
          "name": "tier3Rebate",
          "type": {
            "option": "u16"
          }
        },
        {
          "name": "tier3Breakeven",
          "type": {
            "option": "u16"
          }
        },
        {
          "name": "tier3Profit",
          "type": {
            "option": "u16"
          }
        },
        {
          "name": "paused",
          "type": {
            "option": "bool"
          }
        },
        {
          "name": "platformCommissionBps",
          "type": {
            "option": "u16"
          }
        }
      ]
    },
    {
      "name": "updateProject",
      "docs": [
        "Update project settings (pause/resume, change box price)"
      ],
      "discriminator": [
        2,
        196,
        131,
        92,
        28,
        139,
        179,
        94
      ],
      "accounts": [
        {
          "name": "owner",
          "signer": true
        },
        {
          "name": "projectConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "projectId"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "projectId",
          "type": "u64"
        },
        {
          "name": "newBoxPrice",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "newActive",
          "type": {
            "option": "bool"
          }
        },
        {
          "name": "newLuckTimeInterval",
          "type": {
            "option": "i64"
          }
        }
      ]
    },
    {
      "name": "withdrawEarnings",
      "docs": [
        "Project owner withdraws earnings from vault",
        "Available balance is calculated off-chain (vault balance minus reserved for unopened boxes)"
      ],
      "discriminator": [
        6,
        132,
        233,
        254,
        241,
        87,
        247,
        185
      ],
      "accounts": [
        {
          "name": "owner",
          "signer": true
        },
        {
          "name": "projectConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "projectId"
              }
            ]
          }
        },
        {
          "name": "vaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "projectId"
              },
              {
                "kind": "account",
                "path": "paymentTokenMint"
              }
            ]
          }
        },
        {
          "name": "paymentTokenMint"
        },
        {
          "name": "vaultTokenAccount",
          "writable": true
        },
        {
          "name": "ownerTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "projectId",
          "type": "u64"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "withdrawTreasury",
      "docs": [
        "Withdraw accumulated fees from treasury (admin only)",
        "Used by admin to collect platform commission for batch processing (swap to SOL, buyback, etc.)"
      ],
      "discriminator": [
        40,
        63,
        122,
        158,
        144,
        216,
        83,
        96
      ],
      "accounts": [
        {
          "name": "admin",
          "signer": true
        },
        {
          "name": "platformConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  116,
                  102,
                  111,
                  114,
                  109,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "treasury",
          "docs": [
            "Treasury PDA that holds accumulated fees"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "tokenMint",
          "docs": [
            "The token mint being withdrawn"
          ]
        },
        {
          "name": "treasuryTokenAccount",
          "docs": [
            "Treasury's token account for this mint (source)"
          ],
          "writable": true
        },
        {
          "name": "adminTokenAccount",
          "docs": [
            "Admin's token account (destination)"
          ],
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "boxInstance",
      "discriminator": [
        2,
        179,
        177,
        12,
        182,
        251,
        57,
        127
      ]
    },
    {
      "name": "platformConfig",
      "discriminator": [
        160,
        78,
        128,
        0,
        248,
        83,
        230,
        160
      ]
    },
    {
      "name": "projectConfig",
      "discriminator": [
        187,
        239,
        0,
        110,
        5,
        15,
        245,
        65
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "insufficientLaunchFee",
      "msg": "Insufficient funds for launch fee"
    },
    {
      "code": 6001,
      "name": "projectInactive",
      "msg": "Project is not active"
    },
    {
      "code": 6002,
      "name": "boxAlreadyRevealed",
      "msg": "Box already revealed"
    },
    {
      "code": 6003,
      "name": "boxNotRevealed",
      "msg": "Box not revealed yet"
    },
    {
      "code": 6004,
      "name": "boxAlreadySettled",
      "msg": "Box already settled"
    },
    {
      "code": 6005,
      "name": "notBoxOwner",
      "msg": "Not box owner"
    },
    {
      "code": 6006,
      "name": "notProjectOwner",
      "msg": "Not project owner"
    },
    {
      "code": 6007,
      "name": "notPlatformAdmin",
      "msg": "Not platform admin"
    },
    {
      "code": 6008,
      "name": "insufficientVaultBalance",
      "msg": "Insufficient vault balance"
    },
    {
      "code": 6009,
      "name": "insufficientFeeBalance",
      "msg": "Insufficient platform token balance for withdrawal fee"
    },
    {
      "code": 6010,
      "name": "invalidBoxPrice",
      "msg": "Invalid box price (must be > 0)"
    },
    {
      "code": 6011,
      "name": "arithmeticOverflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6012,
      "name": "randomnessNotReady",
      "msg": "Randomness not ready"
    },
    {
      "code": 6013,
      "name": "randomnessNotCommitted",
      "msg": "Randomness not committed for this box"
    },
    {
      "code": 6014,
      "name": "randomnessAlreadyCommitted",
      "msg": "Randomness already committed for this box"
    },
    {
      "code": 6015,
      "name": "invalidRandomnessAccount",
      "msg": "Invalid randomness account"
    },
    {
      "code": 6016,
      "name": "platformPaused",
      "msg": "Platform is paused"
    },
    {
      "code": 6017,
      "name": "vaultNotEmpty",
      "msg": "Vault is not empty - withdraw funds first"
    },
    {
      "code": 6018,
      "name": "revealWindowExpired",
      "msg": "Reveal window expired"
    },
    {
      "code": 6019,
      "name": "invalidCommissionRate",
      "msg": "Invalid commission rate (max 50%)"
    },
    {
      "code": 6020,
      "name": "invalidLuckInterval",
      "msg": "Invalid luck interval (must be >= 0)"
    }
  ],
  "types": [
    {
      "name": "boxInstance",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "boxId",
            "type": "u64"
          },
          {
            "name": "projectId",
            "type": "u64"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "committedAt",
            "type": "i64"
          },
          {
            "name": "luck",
            "type": "u8"
          },
          {
            "name": "revealed",
            "type": "bool"
          },
          {
            "name": "settled",
            "type": "bool"
          },
          {
            "name": "rewardAmount",
            "type": "u64"
          },
          {
            "name": "isJackpot",
            "type": "bool"
          },
          {
            "name": "randomPercentage",
            "type": "f64"
          },
          {
            "name": "rewardTier",
            "type": "u8"
          },
          {
            "name": "randomnessAccount",
            "type": "pubkey"
          },
          {
            "name": "randomnessCommitted",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "platformConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "initialized",
            "type": "bool"
          },
          {
            "name": "paused",
            "type": "bool"
          },
          {
            "name": "baseLuck",
            "type": "u8"
          },
          {
            "name": "maxLuck",
            "type": "u8"
          },
          {
            "name": "luckTimeInterval",
            "type": "i64"
          },
          {
            "name": "payoutDud",
            "type": "u32"
          },
          {
            "name": "payoutRebate",
            "type": "u32"
          },
          {
            "name": "payoutBreakeven",
            "type": "u32"
          },
          {
            "name": "payoutProfit",
            "type": "u32"
          },
          {
            "name": "payoutJackpot",
            "type": "u32"
          },
          {
            "name": "tier1MaxLuck",
            "type": "u8"
          },
          {
            "name": "tier1Dud",
            "type": "u16"
          },
          {
            "name": "tier1Rebate",
            "type": "u16"
          },
          {
            "name": "tier1Breakeven",
            "type": "u16"
          },
          {
            "name": "tier1Profit",
            "type": "u16"
          },
          {
            "name": "tier2MaxLuck",
            "type": "u8"
          },
          {
            "name": "tier2Dud",
            "type": "u16"
          },
          {
            "name": "tier2Rebate",
            "type": "u16"
          },
          {
            "name": "tier2Breakeven",
            "type": "u16"
          },
          {
            "name": "tier2Profit",
            "type": "u16"
          },
          {
            "name": "tier3Dud",
            "type": "u16"
          },
          {
            "name": "tier3Rebate",
            "type": "u16"
          },
          {
            "name": "tier3Breakeven",
            "type": "u16"
          },
          {
            "name": "tier3Profit",
            "type": "u16"
          },
          {
            "name": "platformCommissionBps",
            "type": "u16"
          },
          {
            "name": "treasuryBump",
            "type": "u8"
          },
          {
            "name": "updatedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "projectConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "projectId",
            "type": "u64"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "paymentTokenMint",
            "type": "pubkey"
          },
          {
            "name": "boxPrice",
            "type": "u64"
          },
          {
            "name": "vaultAuthorityBump",
            "type": "u8"
          },
          {
            "name": "totalBoxesCreated",
            "type": "u64"
          },
          {
            "name": "totalBoxesSettled",
            "type": "u64"
          },
          {
            "name": "totalRevenue",
            "type": "u64"
          },
          {
            "name": "totalPaidOut",
            "type": "u64"
          },
          {
            "name": "active",
            "type": "bool"
          },
          {
            "name": "launchFeePaid",
            "type": "bool"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "luckTimeInterval",
            "type": "i64"
          }
        ]
      }
    }
  ]
};
