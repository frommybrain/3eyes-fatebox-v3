// lib/pdaHelpers.js
// PDA derivation helpers that work without full Anchor Program instance
// Use these for utility endpoints and testing

import { PublicKey } from '@solana/web3.js';
import {
    getAssociatedTokenAddress,
    getAssociatedTokenAddressSync,
    TOKEN_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import BN from 'bn.js';

/**
 * Detect which token program a mint uses (Token or Token-2022)
 * @param {Connection} connection - Solana connection
 * @param {PublicKey} mintAddress - Token mint address
 * @returns {Promise<PublicKey>} - TOKEN_PROGRAM_ID or TOKEN_2022_PROGRAM_ID
 */
export async function getTokenProgramForMint(connection, mintAddress) {
    const mintInfo = await connection.getAccountInfo(mintAddress);
    if (!mintInfo) {
        throw new Error(`Mint account not found: ${mintAddress.toString()}`);
    }

    // Check if the owner is Token-2022 program
    if (mintInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) {
        return TOKEN_2022_PROGRAM_ID;
    }

    // Default to legacy Token program
    return TOKEN_PROGRAM_ID;
}

/**
 * Get associated token address with automatic token program detection
 * @param {Connection} connection - Solana connection
 * @param {PublicKey} mint - Token mint
 * @param {PublicKey} owner - Owner wallet
 * @param {boolean} allowOwnerOffCurve - Allow PDA owners
 * @returns {Promise<{address: PublicKey, tokenProgram: PublicKey}>}
 */
export async function getAssociatedTokenAddressWithProgram(connection, mint, owner, allowOwnerOffCurve = false) {
    const tokenProgram = await getTokenProgramForMint(connection, mint);
    const address = getAssociatedTokenAddressSync(
        mint,
        owner,
        allowOwnerOffCurve,
        tokenProgram,
        ASSOCIATED_TOKEN_PROGRAM_ID
    );
    return { address, tokenProgram };
}

/**
 * Derive platform config PDA (global singleton for tunable parameters)
 * @param {PublicKey} programId - Program ID
 * @returns {[PublicKey, number]} - [PDA address, bump seed]
 */
export function derivePlatformConfigPDA(programId) {
    const [pda, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from('platform_config')],
        programId
    );
    return [pda, bump];
}

/**
 * Derive treasury PDA (global treasury for platform commission fees)
 * @param {PublicKey} programId - Program ID
 * @returns {[PublicKey, number]} - [PDA address, bump seed]
 */
export function deriveTreasuryPDA(programId) {
    const [pda, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from('treasury')],
        programId
    );
    return [pda, bump];
}

/**
 * Derive treasury token account (ATA for treasury PDA)
 * @param {PublicKey} treasuryPDA - Treasury PDA
 * @param {PublicKey} tokenMint - Token mint
 * @param {PublicKey} tokenProgram - Token program (TOKEN_PROGRAM_ID or TOKEN_2022_PROGRAM_ID)
 * @returns {PublicKey} - Treasury token account address
 */
export function deriveTreasuryTokenAccount(treasuryPDA, tokenMint, tokenProgram = TOKEN_PROGRAM_ID) {
    return getAssociatedTokenAddressSync(
        tokenMint,
        treasuryPDA,
        true, // allowOwnerOffCurve - PDAs can own token accounts
        tokenProgram,
        ASSOCIATED_TOKEN_PROGRAM_ID
    );
}

/**
 * Derive project config PDA
 * @param {PublicKey} programId - Program ID
 * @param {number} projectId - Numeric project ID
 * @returns {[PublicKey, number]} - [PDA address, bump seed]
 */
export function deriveProjectConfigPDA(programId, projectId) {
    const projectIdBN = new BN(projectId);
    const projectIdBytes = projectIdBN.toArrayLike(Buffer, 'le', 8);

    const [pda, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from('project'), projectIdBytes],
        programId
    );

    return [pda, bump];
}

/**
 * Derive vault authority PDA
 * @param {PublicKey} programId - Program ID
 * @param {number} projectId - Numeric project ID
 * @param {PublicKey} paymentTokenMint - Payment token mint address
 * @returns {[PublicKey, number]} - [PDA address, bump seed]
 */
export function deriveVaultAuthorityPDA(programId, projectId, paymentTokenMint) {
    const projectIdBN = new BN(projectId);
    const projectIdBytes = projectIdBN.toArrayLike(Buffer, 'le', 8);

    const [pda, bump] = PublicKey.findProgramAddressSync(
        [
            Buffer.from('vault'),
            projectIdBytes,
            paymentTokenMint.toBuffer()
        ],
        programId
    );

    return [pda, bump];
}

/**
 * Derive box instance PDA
 * @param {PublicKey} programId - Program ID
 * @param {number} projectId - Numeric project ID
 * @param {number} boxId - Box ID within the project
 * @returns {[PublicKey, number]} - [PDA address, bump seed]
 */
export function deriveBoxInstancePDA(programId, projectId, boxId) {
    const projectIdBN = new BN(projectId);
    const boxIdBN = new BN(boxId);
    const projectIdBytes = projectIdBN.toArrayLike(Buffer, 'le', 8);
    const boxIdBytes = boxIdBN.toArrayLike(Buffer, 'le', 8);

    const [pda, bump] = PublicKey.findProgramAddressSync(
        [
            Buffer.from('box'),
            projectIdBytes,
            boxIdBytes
        ],
        programId
    );

    return [pda, bump];
}

/**
 * Derive vault token account (ATA for vault authority)
 * @param {PublicKey} vaultAuthorityPDA - Vault authority PDA
 * @param {PublicKey} paymentTokenMint - Payment token mint
 * @param {PublicKey} tokenProgram - Token program (TOKEN_PROGRAM_ID or TOKEN_2022_PROGRAM_ID)
 * @returns {PublicKey} - Vault token account address
 */
export function deriveVaultTokenAccount(vaultAuthorityPDA, paymentTokenMint, tokenProgram = TOKEN_PROGRAM_ID) {
    return getAssociatedTokenAddressSync(
        paymentTokenMint,
        vaultAuthorityPDA,
        true, // allowOwnerOffCurve - PDAs can own token accounts
        tokenProgram,
        ASSOCIATED_TOKEN_PROGRAM_ID
    );
}

/**
 * Derive all PDAs for a project (utility function)
 * @param {PublicKey} programId - Program ID
 * @param {number} projectId - Numeric project ID
 * @param {PublicKey} paymentTokenMint - Payment token mint
 * @param {Connection} connection - Optional Solana connection for token program detection
 * @returns {Promise<Object>} - All PDA addresses
 */
export async function deriveAllPDAs(programId, projectId, paymentTokenMint, connection = null) {
    const [platformConfigPDA, platformConfigBump] = derivePlatformConfigPDA(programId);
    const [projectConfigPDA, projectConfigBump] = deriveProjectConfigPDA(programId, projectId);
    const [vaultAuthorityPDA, vaultAuthorityBump] = deriveVaultAuthorityPDA(programId, projectId, paymentTokenMint);
    const [treasuryPDA, treasuryBump] = deriveTreasuryPDA(programId);

    // Detect token program if connection provided
    let paymentTokenProgram = TOKEN_PROGRAM_ID;
    if (connection) {
        paymentTokenProgram = await getTokenProgramForMint(connection, paymentTokenMint);
    }

    const vaultTokenAccount = deriveVaultTokenAccount(vaultAuthorityPDA, paymentTokenMint, paymentTokenProgram);
    const treasuryTokenAccount = deriveTreasuryTokenAccount(treasuryPDA, paymentTokenMint, paymentTokenProgram);

    return {
        platformConfig: {
            address: platformConfigPDA,
            bump: platformConfigBump,
        },
        projectConfig: {
            address: projectConfigPDA,
            bump: projectConfigBump,
        },
        vaultAuthority: {
            address: vaultAuthorityPDA,
            bump: vaultAuthorityBump,
        },
        vaultTokenAccount: {
            address: vaultTokenAccount,
        },
        treasury: {
            address: treasuryPDA,
            bump: treasuryBump,
        },
        treasuryTokenAccount: {
            address: treasuryTokenAccount,
        },
        paymentTokenProgram, // Include detected token program
    };
}
