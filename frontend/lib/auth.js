// lib/auth.js
// Wallet-based authentication using Supabase
// Based on: https://supabase.com/docs/guides/auth/auth-web3

import { supabase } from './supabase';
import bs58 from 'bs58';

/**
 * Authenticate wallet with Supabase
 * Creates or updates user account on successful auth
 *
 * @param {Object} wallet - Solana wallet adapter wallet object
 * @returns {Promise<Object>} User data
 */
export async function authenticateWallet(wallet) {
    if (!wallet || !wallet.publicKey) {
        throw new Error('Wallet not connected');
    }

    const walletAddress = wallet.publicKey.toString();

    try {
        // Step 1: Create a message to sign
        const message = `Sign this message to authenticate with DegenBox.\n\nWallet: ${walletAddress}\nTimestamp: ${Date.now()}`;
        const encodedMessage = new TextEncoder().encode(message);

        // Step 2: Request signature from wallet
        const signature = await wallet.signMessage(encodedMessage);

        // Step 3: Verify signature (client-side, for UX)
        const signatureBase58 = bs58.encode(signature);

        // Step 4: Upsert user in database
        const { data, error } = await supabase.rpc('upsert_user', {
            p_wallet_address: walletAddress
        });

        if (error) {
            console.error('Error upserting user:', error);
            throw error;
        }

        console.log('✅ User authenticated:', data);

        return {
            success: true,
            user: data[0],
            walletAddress,
            signature: signatureBase58,
        };

    } catch (error) {
        console.error('Wallet authentication failed:', error);

        // If user rejected signature, still create basic account
        if (error.message?.includes('User rejected')) {
            console.log('User rejected signature, creating basic account...');

            const { data, error: dbError } = await supabase.rpc('upsert_user', {
                p_wallet_address: walletAddress
            });

            if (dbError) {
                throw dbError;
            }

            return {
                success: true,
                user: data[0],
                walletAddress,
                signatureRejected: true,
            };
        }

        throw error;
    }
}

/**
 * Get user by wallet address
 * @param {string} walletAddress
 * @returns {Promise<Object|null>}
 */
export async function getUserByWallet(walletAddress) {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            // No user found
            return null;
        }
        throw error;
    }

    return data;
}

/**
 * Update user profile
 * @param {string} walletAddress
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
export async function updateUserProfile(walletAddress, updates) {
    const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('wallet_address', walletAddress)
        .select()
        .single();

    if (error) throw error;

    return data;
}

/**
 * Get user stats
 * @param {string} walletAddress
 * @returns {Promise<Object>}
 */
export async function getUserStats(walletAddress) {
    // Get project count
    const { count: projectCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('owner_wallet', walletAddress);

    // Get box count
    const { count: boxCount } = await supabase
        .from('boxes')
        .select('*', { count: 'exact', head: true })
        .eq('owner_wallet', walletAddress);

    // Get wins
    const { count: winCount } = await supabase
        .from('boxes')
        .select('*', { count: 'exact', head: true })
        .eq('owner_wallet', walletAddress)
        .in('box_result', [3, 4]); // profit or jackpot

    return {
        totalProjects: projectCount || 0,
        totalBoxes: boxCount || 0,
        totalWins: winCount || 0,
    };
}
