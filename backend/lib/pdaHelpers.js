// lib/pdaHelpers.js
// PDA derivation helpers that work without full Anchor Program instance
// Use these for utility endpoints and testing

import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import BN from 'bn.js';

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
 * @returns {Promise<PublicKey>} - Vault token account address
 */
export async function deriveVaultTokenAccount(vaultAuthorityPDA, paymentTokenMint) {
    return await getAssociatedTokenAddress(
        paymentTokenMint,
        vaultAuthorityPDA,
        true // allowOwnerOffCurve - PDAs can own token accounts
    );
}

/**
 * Derive all PDAs for a project (utility function)
 * @param {PublicKey} programId - Program ID
 * @param {number} projectId - Numeric project ID
 * @param {PublicKey} paymentTokenMint - Payment token mint
 * @returns {Promise<Object>} - All PDA addresses
 */
export async function deriveAllPDAs(programId, projectId, paymentTokenMint) {
    const [platformConfigPDA, platformConfigBump] = derivePlatformConfigPDA(programId);
    const [projectConfigPDA, projectConfigBump] = deriveProjectConfigPDA(programId, projectId);
    const [vaultAuthorityPDA, vaultAuthorityBump] = deriveVaultAuthorityPDA(programId, projectId, paymentTokenMint);
    const vaultTokenAccount = await deriveVaultTokenAccount(vaultAuthorityPDA, paymentTokenMint);

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
        }
    };
}
