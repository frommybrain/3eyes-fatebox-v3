// lib/deriveVaultPDAs.js
// Derive vault PDAs for a project
// These PDAs match what the Rust program will use

import { PublicKey } from '@solana/web3.js';

/**
 * Derive vault PDAs for a project
 * Must match the seeds used in the Rust program exactly
 *
 * @param {PublicKey} programId - The lootbox program ID
 * @param {string} projectId - Unique project identifier (UUID or number)
 * @param {PublicKey} paymentTokenMint - The SPL token mint for this project
 * @returns {Object} Object containing vault PDA addresses
 */
export function deriveVaultPDAs(programId, projectId, paymentTokenMint) {
    // Convert projectId to buffer (use UUID as bytes or convert number to bytes)
    // For now, using string representation (will match Rust implementation)
    const projectIdBuffer = Buffer.from(projectId.toString());

    // Derive vault PDA
    // Seeds: ["vault", project_id, payment_token_mint]
    const [vaultPda, vaultBump] = PublicKey.findProgramAddressSync(
        [
            Buffer.from('vault'),
            projectIdBuffer,
            paymentTokenMint.toBuffer(),
        ],
        programId
    );

    // Derive vault authority PDA
    // Seeds: ["vault_authority", project_id]
    const [vaultAuthorityPda, authorityBump] = PublicKey.findProgramAddressSync(
        [
            Buffer.from('vault_authority'),
            projectIdBuffer,
        ],
        programId
    );

    return {
        vaultPda: vaultPda.toString(),
        vaultBump,
        vaultAuthorityPda: vaultAuthorityPda.toString(),
        authorityBump,
        projectIdBuffer,
    };
}

/**
 * Get associated token account address for vault
 * This is where the project tokens will be held
 *
 * @param {PublicKey} vaultPda - The vault PDA
 * @param {PublicKey} paymentTokenMint - The token mint
 * @returns {Promise<PublicKey>} The vault's token account address
 */
export async function getVaultTokenAccount(vaultPda, paymentTokenMint) {
    const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
    const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

    const [ata] = PublicKey.findProgramAddressSync(
        [
            vaultPda.toBuffer(),
            TOKEN_PROGRAM_ID.toBuffer(),
            paymentTokenMint.toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
    );

    return ata;
}

/**
 * Derive all vault addresses for a project (convenience function)
 *
 * @param {PublicKey} programId - The lootbox program ID
 * @param {string} projectId - Project identifier
 * @param {PublicKey} paymentTokenMint - Payment token mint
 * @returns {Promise<Object>} All vault addresses
 */
export async function deriveAllVaultAddresses(programId, projectId, paymentTokenMint) {
    const pdas = deriveVaultPDAs(programId, projectId, paymentTokenMint);
    const vaultPdaPublicKey = new PublicKey(pdas.vaultPda);
    const vaultTokenAccount = await getVaultTokenAccount(vaultPdaPublicKey, paymentTokenMint);

    return {
        vaultWallet: pdas.vaultPda,
        vaultPda: pdas.vaultPda,
        vaultAuthorityPda: pdas.vaultAuthorityPda,
        vaultTokenAccount: vaultTokenAccount.toString(),
        vaultBump: pdas.vaultBump,
        authorityBump: pdas.authorityBump,
    };
}
