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
      "name": "createBox",
      "docs": [
        "Create a new box (user purchases box)",
        "Transfers payment from buyer to vault"
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
        }
      ]
    },
    {
      "name": "revealBox",
      "docs": [
        "Reveal box with Switchboard VRF randomness",
        "Calculates luck based on hold time and determines reward"
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
        }
      ]
    },
    {
      "name": "withdrawEarnings",
      "docs": [
        "Project owner withdraws earnings from vault",
        "Pays withdrawal fee in $DEGENBOX to platform"
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
      "name": "insufficientVaultBalance",
      "msg": "Insufficient vault balance"
    },
    {
      "code": 6008,
      "name": "withdrawalExceedsAvailable",
      "msg": "Withdrawal amount exceeds available balance"
    },
    {
      "code": 6009,
      "name": "insufficientFeeBalance",
      "msg": "Insufficient $DEGENBOX for withdrawal fee"
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
          }
        ]
      }
    }
  ]
};
