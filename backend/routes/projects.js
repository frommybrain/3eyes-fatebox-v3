// routes/projects.js
// API routes for project management
// Updated to integrate with Anchor program initialization

import express from 'express';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { createClient } from '@supabase/supabase-js';
import { getNetworkConfig } from '../lib/getNetworkConfig.js';
import { getAnchorProgram } from '../lib/anchorClient.js';
import {
    deriveProjectConfigPDA,
    deriveVaultAuthorityPDA
} from '../lib/pdaHelpers.js';

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

/**
 * POST /api/projects/create
 * Create a new project with on-chain initialization
 *
 * This endpoint:
 * 1. Creates project in database (gets numeric sequence ID)
 * 2. Derives PDAs using numeric project ID
 * 3. Calls Anchor program to initialize on-chain state
 * 4. Updates database with PDA addresses
 *
 * Body:
 * - owner_wallet: string (creator's wallet address)
 * - project_name: string
 * - subdomain: string
 * - description: string (optional)
 * - payment_token_mint: string (SPL token address)
 * - box_price: number (in token units with decimals)
 * - initialize_onchain: boolean (optional, default true)
 */
router.post('/create', async (req, res) => {
    try {
        const {
            owner_wallet,
            project_name,
            subdomain,
            description,
            payment_token_mint,
            box_price,
            initialize_onchain = true
        } = req.body;

        // Validate required fields
        if (!owner_wallet || !project_name || !subdomain || !payment_token_mint || !box_price) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                required: ['owner_wallet', 'project_name', 'subdomain', 'payment_token_mint', 'box_price']
            });
        }

        // Validate wallet addresses
        let ownerPubkey, paymentTokenPubkey;
        try {
            ownerPubkey = new PublicKey(owner_wallet);
            paymentTokenPubkey = new PublicKey(payment_token_mint);
        } catch (error) {
            return res.status(400).json({
                success: false,
                error: 'Invalid wallet address format'
            });
        }

        console.log(`\n📝 Creating project: ${project_name}`);
        console.log(`   Owner: ${owner_wallet}`);
        console.log(`   Subdomain: ${subdomain}`);
        console.log(`   Payment token: ${payment_token_mint}`);
        console.log(`   Box price: ${box_price}`);

        // Get network configuration
        const config = await getNetworkConfig();

        // Generate full subdomain with network prefix if devnet
        const fullSubdomain = config.network === 'devnet'
            ? `devnet-${subdomain}`
            : subdomain;

        // Check subdomain availability
        const { data: existingProject } = await supabase
            .from('projects')
            .select('id')
            .eq('subdomain', fullSubdomain)
            .maybeSingle();

        if (existingProject) {
            return res.status(409).json({
                success: false,
                error: 'Subdomain already taken',
                subdomain: fullSubdomain
            });
        }

        // Step 1: Insert project into database to get numeric ID
        console.log(`\n📊 Step 1: Creating project in database...`);
        const { data: project, error: insertError } = await supabase
            .from('projects')
            .insert({
                owner_wallet,
                project_name,
                subdomain: fullSubdomain,
                description: description || null,
                box_price: parseInt(box_price),
                max_boxes: 99999, // Default - effectively unlimited
                is_active: true,
                is_paused: false,
                vault_wallet: null, // Will be updated after PDA derivation
                vault_pda: null,
                vault_authority_pda: null,
                vault_token_account: null,
            })
            .select()
            .single();

        if (insertError) {
            console.error('❌ Database insert error:', insertError);
            return res.status(500).json({
                success: false,
                error: 'Failed to create project in database',
                details: insertError.message
            });
        }

        console.log(`✅ Project created in database with ID: ${project.id}`);

        // Extract numeric ID from UUID
        // We'll use a hash or counter for numeric project ID
        // For now, let's get a numeric sequence from a dedicated counter table
        const { data: counterData, error: counterError } = await supabase
            .rpc('get_next_project_number');

        if (counterError) {
            console.error('❌ Error getting project number:', counterError);
            // Fallback: use timestamp-based ID
            var numericProjectId = Math.floor(Date.now() / 1000);
        } else {
            var numericProjectId = counterData;
        }

        console.log(`📊 Numeric project ID: ${numericProjectId}`);

        // Step 2: Derive PDAs using numeric project ID
        console.log(`\n🔑 Step 2: Deriving PDAs...`);
        const { program } = await getAnchorProgram();

        const [projectConfigPDA, projectConfigBump] = deriveProjectConfigPDA(program, numericProjectId);
        const [vaultAuthorityPDA, vaultAuthorityBump] = deriveVaultAuthorityPDA(
            program,
            numericProjectId,
            paymentTokenPubkey
        );

        const vaultTokenAccount = await getAssociatedTokenAddress(
            paymentTokenPubkey,
            vaultAuthorityPDA,
            true // allowOwnerOffCurve
        );

        console.log(`✅ PDAs derived:`);
        console.log(`   Project Config: ${projectConfigPDA.toString()}`);
        console.log(`   Vault Authority: ${vaultAuthorityPDA.toString()}`);
        console.log(`   Vault Token Account: ${vaultTokenAccount.toString()}`);

        // Update database with numeric ID and PDAs
        const { error: updateError1 } = await supabase
            .from('projects')
            .update({
                // Store numeric ID for on-chain operations
                project_numeric_id: numericProjectId,
                vault_pda: projectConfigPDA.toString(),
                vault_authority_pda: vaultAuthorityPDA.toString(),
                vault_token_account: vaultTokenAccount.toString(),
                vault_wallet: vaultAuthorityPDA.toString(),
            })
            .eq('id', project.id);

        if (updateError1) {
            console.error('⚠️  Warning: Failed to update PDAs in database:', updateError1);
        } else {
            console.log(`✅ Database updated with PDAs`);
        }

        // Response object to build up
        const response = {
            success: true,
            project: {
                id: project.id,
                numeric_id: numericProjectId,
                project_name: project.project_name,
                subdomain: project.subdomain,
                vault_addresses: {
                    project_config_pda: projectConfigPDA.toString(),
                    vault_authority_pda: vaultAuthorityPDA.toString(),
                    vault_token_account: vaultTokenAccount.toString(),
                },
                network: config.network,
                url: `https://${project.subdomain}.degenbox.fun`
            },
            steps: {
                database_created: true,
                pdas_derived: true,
                onchain_initialized: false,
            }
        };

        // Step 3: Initialize on-chain (if requested)
        if (initialize_onchain) {
            console.log(`\n⛓️  Step 3: Initializing project on-chain...`);

            try {
                // Call the program initialization endpoint internally
                const apiBaseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3333}`;
                const initResponse = await fetch(`${apiBaseUrl}/api/program/initialize-project`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        projectId: numericProjectId,
                        boxPrice: box_price,
                        paymentTokenMint: payment_token_mint,
                        ownerWallet: owner_wallet,
                    })
                });

                const initResult = await initResponse.json();

                if (initResult.success) {
                    console.log(`✅ On-chain initialization successful!`);
                    console.log(`   Transaction: ${initResult.transaction}`);

                    response.steps.onchain_initialized = true;
                    response.transaction = initResult.transaction;
                    response.explorerUrl = initResult.explorerUrl;
                } else {
                    console.error(`❌ On-chain initialization failed:`, initResult.error);
                    response.steps.onchain_initialized = false;
                    response.onchain_error = initResult.error;
                    response.warning = 'Project created in database but on-chain initialization failed. You can retry initialization later.';
                }

            } catch (initError) {
                console.error(`❌ Error during on-chain initialization:`, initError);
                response.steps.onchain_initialized = false;
                response.onchain_error = initError.message;
                response.warning = 'Project created in database but on-chain initialization failed. You can retry initialization later.';
            }
        }

        console.log(`\n✅ Project creation complete!`);
        return res.status(201).json(response);

    } catch (error) {
        console.error('❌ Error creating project:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * GET /api/projects/:projectId
 * Get project details by ID
 */
router.get('/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;

        const { data: project, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single();

        if (error || !project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }

        return res.json({
            success: true,
            project
        });

    } catch (error) {
        console.error('Error fetching project:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * GET /api/projects
 * List all active projects (filtered by current network)
 */
router.get('/', async (req, res) => {
    try {
        const config = await getNetworkConfig();

        // Get projects from current network only
        const { data: projects, error } = await supabase
            .from('projects')
            .select('*')
            .eq('is_active', true)
            .eq('archived', false)
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        return res.json({
            success: true,
            network: config.network,
            count: projects.length,
            projects
        });

    } catch (error) {
        console.error('Error listing projects:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * GET /api/projects/boxes/by-owner/:walletAddress
 * Get all boxes owned by a specific wallet, grouped by project
 */
router.get('/boxes/by-owner/:walletAddress', async (req, res) => {
    try {
        const { walletAddress } = req.params;

        if (!walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address is required'
            });
        }

        // Validate wallet address format
        try {
            new PublicKey(walletAddress);
        } catch (error) {
            return res.status(400).json({
                success: false,
                error: 'Invalid wallet address format'
            });
        }

        // Fetch all boxes owned by this wallet with project details
        const { data: boxes, error } = await supabase
            .from('boxes')
            .select(`
                id,
                box_number,
                box_result,
                payout_amount,
                opened_at,
                settled_at,
                created_at,
                project_id,
                randomness_account,
                randomness_committed,
                committed_at,
                commit_tx_signature,
                purchase_tx_signature,
                reveal_tx_signature,
                settle_tx_signature,
                box_pda,
                luck_value,
                max_luck,
                random_percentage,
                projects (
                    id,
                    project_numeric_id,
                    project_name,
                    subdomain,
                    payment_token_symbol,
                    payment_token_decimals,
                    box_price
                )
            `)
            .eq('owner_wallet', walletAddress)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching boxes:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch boxes',
                details: error.message
            });
        }

        // Group boxes by project
        const groupedBoxes = {};
        boxes.forEach(box => {
            const projectId = box.project_id;
            if (!groupedBoxes[projectId]) {
                groupedBoxes[projectId] = {
                    project: box.projects,
                    boxes: []
                };
            }
            // Remove nested projects object from box
            const { projects, ...boxData } = box;
            groupedBoxes[projectId].boxes.push(boxData);
        });

        // Convert to array format
        const projectsWithBoxes = Object.values(groupedBoxes);

        return res.json({
            success: true,
            totalBoxes: boxes.length,
            projectCount: projectsWithBoxes.length,
            projectsWithBoxes
        });

    } catch (error) {
        console.error('Error fetching user boxes:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

export default router;
