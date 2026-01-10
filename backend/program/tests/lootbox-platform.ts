import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { LootboxPlatform } from "../target/types/lootbox_platform";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { assert } from "chai";

describe("lootbox-platform", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.LootboxPlatform as Program<LootboxPlatform>;

  // Test accounts
  let projectOwner: anchor.web3.Keypair;
  let user1: anchor.web3.Keypair;
  let user2: anchor.web3.Keypair;
  let paymentTokenMint: anchor.web3.PublicKey;
  let projectId: anchor.BN;
  let boxPrice: anchor.BN;

  // PDAs
  let projectConfigPda: anchor.web3.PublicKey;
  let vaultAuthorityPda: anchor.web3.PublicKey;
  let vaultTokenAccount: anchor.web3.PublicKey;

  before(async () => {
    // Generate test keypairs
    projectOwner = anchor.web3.Keypair.generate();
    user1 = anchor.web3.Keypair.generate();
    user2 = anchor.web3.Keypair.generate();

    // Airdrop SOL to test accounts
    const airdropAmount = 10 * anchor.web3.LAMPORTS_PER_SOL;
    await provider.connection.requestAirdrop(projectOwner.publicKey, airdropAmount);
    await provider.connection.requestAirdrop(user1.publicKey, airdropAmount);
    await provider.connection.requestAirdrop(user2.publicKey, airdropAmount);

    // Wait for airdrops to confirm
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create payment token mint
    paymentTokenMint = await createMint(
      provider.connection,
      projectOwner,
      projectOwner.publicKey,
      null,
      9 // 9 decimals
    );

    console.log("Payment token mint:", paymentTokenMint.toString());

    // Set test parameters
    projectId = new anchor.BN(Date.now());
    boxPrice = new anchor.BN(1_000_000_000); // 1 token

    // Derive PDAs
    [projectConfigPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("project"), projectId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    [vaultAuthorityPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("vault"),
        projectId.toArrayLike(Buffer, "le", 8),
        paymentTokenMint.toBuffer(),
      ],
      program.programId
    );

    console.log("Project Config PDA:", projectConfigPda.toString());
    console.log("Vault Authority PDA:", vaultAuthorityPda.toString());
  });

  describe("Initialize Project", () => {
    it("Should initialize a new project", async () => {
      // Create vault token account
      const vaultAta = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        projectOwner,
        paymentTokenMint,
        vaultAuthorityPda,
        true // allowOwnerOffCurve for PDA
      );
      vaultTokenAccount = vaultAta.address;

      console.log("Vault token account:", vaultTokenAccount.toString());

      // Initialize project
      const tx = await program.methods
        .initializeProject(projectId, boxPrice)
        .accounts({
          owner: projectOwner.publicKey,
          projectConfig: projectConfigPda,
          vaultAuthority: vaultAuthorityPda,
          paymentTokenMint: paymentTokenMint,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([projectOwner])
        .rpc();

      console.log("Initialize project tx:", tx);

      // Fetch and verify project config
      const projectConfig = await program.account.projectConfig.fetch(projectConfigPda);

      assert.ok(projectConfig.projectId.eq(projectId));
      assert.ok(projectConfig.owner.equals(projectOwner.publicKey));
      assert.ok(projectConfig.paymentTokenMint.equals(paymentTokenMint));
      assert.ok(projectConfig.boxPrice.eq(boxPrice));
      assert.ok(projectConfig.totalBoxesCreated.eq(new anchor.BN(0)));
      assert.equal(projectConfig.active, true);
      assert.equal(projectConfig.launchFeePaid, true);

      console.log("✓ Project initialized successfully");
    });

    it("Should fail to initialize project with price = 0", async () => {
      const invalidProjectId = new anchor.BN(Date.now() + 1);
      const [invalidProjectPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("project"), invalidProjectId.toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      try {
        await program.methods
          .initializeProject(invalidProjectId, new anchor.BN(0))
          .accounts({
            owner: projectOwner.publicKey,
            projectConfig: invalidProjectPda,
            vaultAuthority: vaultAuthorityPda,
            paymentTokenMint: paymentTokenMint,
            systemProgram: anchor.web3.SystemProgram.programId,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .signers([projectOwner])
          .rpc();

        assert.fail("Should have failed with invalid box price");
      } catch (err) {
        assert.include(err.toString(), "InvalidBoxPrice");
        console.log("✓ Correctly rejected price = 0");
      }
    });
  });

  describe("Create Box", () => {
    let user1TokenAccount: anchor.web3.PublicKey;
    let box1Pda: anchor.web3.PublicKey;

    before(async () => {
      // Create token account for user1 and mint tokens
      const user1Ata = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        user1,
        paymentTokenMint,
        user1.publicKey
      );
      user1TokenAccount = user1Ata.address;

      // Mint 100 tokens to user1
      await mintTo(
        provider.connection,
        projectOwner,
        paymentTokenMint,
        user1TokenAccount,
        projectOwner,
        100_000_000_000 // 100 tokens
      );

      console.log("User1 token account:", user1TokenAccount.toString());
      console.log("Minted 100 tokens to user1");

      // Derive box PDA (box_id = 1)
      [box1Pda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("box"),
          projectId.toArrayLike(Buffer, "le", 8),
          new anchor.BN(1).toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );
    });

    it("Should create a box", async () => {
      const vaultBalanceBefore = await provider.connection.getTokenAccountBalance(
        vaultTokenAccount
      );

      const tx = await program.methods
        .createBox(projectId)
        .accounts({
          buyer: user1.publicKey,
          projectConfig: projectConfigPda,
          boxInstance: box1Pda,
          buyerTokenAccount: user1TokenAccount,
          vaultTokenAccount: vaultTokenAccount,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      console.log("Create box tx:", tx);

      // Fetch and verify box instance
      const boxInstance = await program.account.boxInstance.fetch(box1Pda);

      assert.ok(boxInstance.boxId.eq(new anchor.BN(1)));
      assert.ok(boxInstance.projectId.eq(projectId));
      assert.ok(boxInstance.owner.equals(user1.publicKey));
      assert.equal(boxInstance.luck, 5); // Base luck
      assert.equal(boxInstance.revealed, false);
      assert.equal(boxInstance.settled, false);

      // Verify vault received payment
      const vaultBalanceAfter = await provider.connection.getTokenAccountBalance(
        vaultTokenAccount
      );
      const expectedBalance = BigInt(vaultBalanceBefore.value.amount) + BigInt(boxPrice.toString());
      assert.equal(vaultBalanceAfter.value.amount, expectedBalance.toString());

      // Verify project stats updated
      const projectConfig = await program.account.projectConfig.fetch(projectConfigPda);
      assert.ok(projectConfig.totalBoxesCreated.eq(new anchor.BN(1)));
      assert.ok(projectConfig.totalRevenue.eq(boxPrice));

      console.log("✓ Box created successfully");
    });

    it("Should fail to create box on inactive project", async () => {
      // First pause the project
      await program.methods
        .updateProject(projectId, null, false)
        .accounts({
          owner: projectOwner.publicKey,
          projectConfig: projectConfigPda,
        })
        .signers([projectOwner])
        .rpc();

      // Try to create box
      const [box2Pda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("box"),
          projectId.toArrayLike(Buffer, "le", 8),
          new anchor.BN(2).toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      try {
        await program.methods
          .createBox(projectId)
          .accounts({
            buyer: user1.publicKey,
            projectConfig: projectConfigPda,
            boxInstance: box2Pda,
            buyerTokenAccount: user1TokenAccount,
            vaultTokenAccount: vaultTokenAccount,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([user1])
          .rpc();

        assert.fail("Should have failed on inactive project");
      } catch (err) {
        assert.include(err.toString(), "ProjectInactive");
        console.log("✓ Correctly rejected box creation on inactive project");
      }

      // Re-activate project for next tests
      await program.methods
        .updateProject(projectId, null, true)
        .accounts({
          owner: projectOwner.publicKey,
          projectConfig: projectConfigPda,
        })
        .signers([projectOwner])
        .rpc();
    });
  });

  describe("Reveal Box", () => {
    let box1Pda: anchor.web3.PublicKey;

    before(async () => {
      [box1Pda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("box"),
          projectId.toArrayLike(Buffer, "le", 8),
          new anchor.BN(1).toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );
    });

    it("Should reveal a box", async () => {
      // Wait a few seconds to accumulate some luck
      console.log("Waiting 5 seconds for luck accumulation...");
      await new Promise(resolve => setTimeout(resolve, 5000));

      const tx = await program.methods
        .revealBox(projectId, new anchor.BN(1))
        .accounts({
          owner: user1.publicKey,
          projectConfig: projectConfigPda,
          boxInstance: box1Pda,
          vaultTokenAccount: vaultTokenAccount,
        })
        .signers([user1])
        .rpc();

      console.log("Reveal box tx:", tx);

      // Fetch and verify box instance
      const boxInstance = await program.account.boxInstance.fetch(box1Pda);

      assert.equal(boxInstance.revealed, true);
      assert.isAbove(boxInstance.luck, 5); // Should have accumulated some luck
      assert.isAbove(boxInstance.rewardAmount.toNumber(), 0); // Should have some reward

      console.log("Box revealed!");
      console.log("  Luck:", boxInstance.luck);
      console.log("  Reward:", boxInstance.rewardAmount.toString());
      console.log("  Is jackpot:", boxInstance.isJackpot);
      console.log("  Random %:", boxInstance.randomPercentage);
    });

    it("Should fail to reveal already revealed box", async () => {
      try {
        await program.methods
          .revealBox(projectId, new anchor.BN(1))
          .accounts({
            owner: user1.publicKey,
            projectConfig: projectConfigPda,
            boxInstance: box1Pda,
            vaultTokenAccount: vaultTokenAccount,
          })
          .signers([user1])
          .rpc();

        assert.fail("Should have failed revealing already revealed box");
      } catch (err) {
        assert.include(err.toString(), "BoxAlreadyRevealed");
        console.log("✓ Correctly rejected double reveal");
      }
    });

    it("Should fail to reveal box as non-owner", async () => {
      // Create another box first
      const user2Ata = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        user2,
        paymentTokenMint,
        user2.publicKey
      );

      await mintTo(
        provider.connection,
        projectOwner,
        paymentTokenMint,
        user2Ata.address,
        projectOwner,
        100_000_000_000
      );

      const [box2Pda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("box"),
          projectId.toArrayLike(Buffer, "le", 8),
          new anchor.BN(2).toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      await program.methods
        .createBox(projectId)
        .accounts({
          buyer: user2.publicKey,
          projectConfig: projectConfigPda,
          boxInstance: box2Pda,
          buyerTokenAccount: user2Ata.address,
          vaultTokenAccount: vaultTokenAccount,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user2])
        .rpc();

      // Try to reveal as user1 (not owner)
      try {
        await program.methods
          .revealBox(projectId, new anchor.BN(2))
          .accounts({
            owner: user1.publicKey,
            projectConfig: projectConfigPda,
            boxInstance: box2Pda,
            vaultTokenAccount: vaultTokenAccount,
          })
          .signers([user1])
          .rpc();

        assert.fail("Should have failed revealing as non-owner");
      } catch (err) {
        assert.include(err.toString(), "NotBoxOwner");
        console.log("✓ Correctly rejected non-owner reveal");
      }
    });
  });

  describe("Settle Box", () => {
    let box1Pda: anchor.web3.PublicKey;
    let user1TokenAccount: anchor.web3.PublicKey;

    before(async () => {
      [box1Pda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("box"),
          projectId.toArrayLike(Buffer, "le", 8),
          new anchor.BN(1).toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      const user1Ata = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        user1,
        paymentTokenMint,
        user1.publicKey
      );
      user1TokenAccount = user1Ata.address;
    });

    it("Should settle a revealed box", async () => {
      const boxBefore = await program.account.boxInstance.fetch(box1Pda);
      const userBalanceBefore = await provider.connection.getTokenAccountBalance(
        user1TokenAccount
      );

      const tx = await program.methods
        .settleBox(projectId, new anchor.BN(1))
        .accounts({
          owner: user1.publicKey,
          projectConfig: projectConfigPda,
          boxInstance: box1Pda,
          vaultAuthority: vaultAuthorityPda,
          paymentTokenMint: paymentTokenMint,
          vaultTokenAccount: vaultTokenAccount,
          ownerTokenAccount: user1TokenAccount,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        })
        .signers([user1])
        .rpc();

      console.log("Settle box tx:", tx);

      // Verify box is settled
      const boxAfter = await program.account.boxInstance.fetch(box1Pda);
      assert.equal(boxAfter.settled, true);

      // Verify user received reward
      const userBalanceAfter = await provider.connection.getTokenAccountBalance(
        user1TokenAccount
      );
      const expectedBalance = BigInt(userBalanceBefore.value.amount) + BigInt(boxBefore.rewardAmount.toString());
      assert.equal(userBalanceAfter.value.amount, expectedBalance.toString());

      // Verify project stats updated
      const projectConfig = await program.account.projectConfig.fetch(projectConfigPda);
      assert.ok(projectConfig.totalBoxesSettled.eq(new anchor.BN(1)));
      assert.ok(projectConfig.totalPaidOut.eq(boxBefore.rewardAmount));

      console.log("✓ Box settled successfully");
      console.log("  Reward transferred:", boxBefore.rewardAmount.toString());
    });

    it("Should fail to settle already settled box", async () => {
      try {
        await program.methods
          .settleBox(projectId, new anchor.BN(1))
          .accounts({
            owner: user1.publicKey,
            projectConfig: projectConfigPda,
            boxInstance: box1Pda,
            vaultAuthority: vaultAuthorityPda,
            paymentTokenMint: paymentTokenMint,
            vaultTokenAccount: vaultTokenAccount,
            ownerTokenAccount: user1TokenAccount,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          })
          .signers([user1])
          .rpc();

        assert.fail("Should have failed settling already settled box");
      } catch (err) {
        assert.include(err.toString(), "BoxAlreadySettled");
        console.log("✓ Correctly rejected double settle");
      }
    });
  });

  describe("Withdraw Earnings", () => {
    let ownerTokenAccount: anchor.web3.PublicKey;

    before(async () => {
      const ownerAta = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        projectOwner,
        paymentTokenMint,
        projectOwner.publicKey
      );
      ownerTokenAccount = ownerAta.address;
    });

    it("Should allow project owner to withdraw earnings", async () => {
      const vaultBalanceBefore = await provider.connection.getTokenAccountBalance(
        vaultTokenAccount
      );
      const ownerBalanceBefore = await provider.connection.getTokenAccountBalance(
        ownerTokenAccount
      );

      const withdrawAmount = new anchor.BN(500_000_000); // 0.5 tokens

      const tx = await program.methods
        .withdrawEarnings(projectId, withdrawAmount)
        .accounts({
          owner: projectOwner.publicKey,
          projectConfig: projectConfigPda,
          vaultAuthority: vaultAuthorityPda,
          paymentTokenMint: paymentTokenMint,
          vaultTokenAccount: vaultTokenAccount,
          ownerTokenAccount: ownerTokenAccount,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        })
        .signers([projectOwner])
        .rpc();

      console.log("Withdraw earnings tx:", tx);

      // Verify vault balance decreased
      const vaultBalanceAfter = await provider.connection.getTokenAccountBalance(
        vaultTokenAccount
      );
      const expectedVaultBalance = BigInt(vaultBalanceBefore.value.amount) - BigInt(withdrawAmount.toString());
      assert.equal(vaultBalanceAfter.value.amount, expectedVaultBalance.toString());

      // Verify owner balance increased
      const ownerBalanceAfter = await provider.connection.getTokenAccountBalance(
        ownerTokenAccount
      );
      const expectedOwnerBalance = BigInt(ownerBalanceBefore.value.amount) + BigInt(withdrawAmount.toString());
      assert.equal(ownerBalanceAfter.value.amount, expectedOwnerBalance.toString());

      console.log("✓ Withdrawal successful");
      console.log("  Amount:", withdrawAmount.toString());
    });

    it("Should fail withdrawal from non-owner", async () => {
      const withdrawAmount = new anchor.BN(100_000_000);

      try {
        await program.methods
          .withdrawEarnings(projectId, withdrawAmount)
          .accounts({
            owner: user1.publicKey,
            projectConfig: projectConfigPda,
            vaultAuthority: vaultAuthorityPda,
            paymentTokenMint: paymentTokenMint,
            vaultTokenAccount: vaultTokenAccount,
            ownerTokenAccount: ownerTokenAccount,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          })
          .signers([user1])
          .rpc();

        assert.fail("Should have failed withdrawal from non-owner");
      } catch (err) {
        assert.include(err.toString(), "NotProjectOwner");
        console.log("✓ Correctly rejected non-owner withdrawal");
      }
    });
  });

  describe("Update Project", () => {
    it("Should update box price", async () => {
      const newPrice = new anchor.BN(2_000_000_000); // 2 tokens

      const tx = await program.methods
        .updateProject(projectId, newPrice, null)
        .accounts({
          owner: projectOwner.publicKey,
          projectConfig: projectConfigPda,
        })
        .signers([projectOwner])
        .rpc();

      console.log("Update price tx:", tx);

      const projectConfig = await program.account.projectConfig.fetch(projectConfigPda);
      assert.ok(projectConfig.boxPrice.eq(newPrice));

      console.log("✓ Box price updated to:", newPrice.toString());
    });

    it("Should pause and resume project", async () => {
      // Pause
      await program.methods
        .updateProject(projectId, null, false)
        .accounts({
          owner: projectOwner.publicKey,
          projectConfig: projectConfigPda,
        })
        .signers([projectOwner])
        .rpc();

      let projectConfig = await program.account.projectConfig.fetch(projectConfigPda);
      assert.equal(projectConfig.active, false);
      console.log("✓ Project paused");

      // Resume
      await program.methods
        .updateProject(projectId, null, true)
        .accounts({
          owner: projectOwner.publicKey,
          projectConfig: projectConfigPda,
        })
        .signers([projectOwner])
        .rpc();

      projectConfig = await program.account.projectConfig.fetch(projectConfigPda);
      assert.equal(projectConfig.active, true);
      console.log("✓ Project resumed");
    });

    it("Should fail update from non-owner", async () => {
      try {
        await program.methods
          .updateProject(projectId, new anchor.BN(1), null)
          .accounts({
            owner: user1.publicKey,
            projectConfig: projectConfigPda,
          })
          .signers([user1])
          .rpc();

        assert.fail("Should have failed update from non-owner");
      } catch (err) {
        assert.include(err.toString(), "NotProjectOwner");
        console.log("✓ Correctly rejected non-owner update");
      }
    });
  });
});
