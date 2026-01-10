// components/create/CreateProject.jsx
'use client';

import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { Transaction } from '@solana/web3.js';
import useNetworkStore from '@/store/useNetworkStore';
import { checkSubdomainAvailability, generateSubdomain } from '@/lib/getNetworkConfig';
import { supabase } from '@/lib/supabase';
import {
    DegenButton,
    DegenCard,
    DegenBadge,
    DegenInput,
    DegenTextarea,
    DegenLoadingState,
} from '@/components/ui';

export default function CreateProject() {
    const router = useRouter();
    const { publicKey, connected, sendTransaction } = useWallet();
    const { connection } = useConnection();
    const { config, configLoading } = useNetworkStore();

    const [mounted, setMounted] = useState(false);
    const [step, setStep] = useState(1); // 1: Details, 2: Review, 3: Creating

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        subdomain: '',
        description: '',
        paymentTokenMint: '',
        paymentTokenSymbol: '',
        paymentTokenDecimals: 9,
        boxPrice: '',
        logoUrl: '',
    });

    const [errors, setErrors] = useState({});
    const [subdomainChecking, setSubdomainChecking] = useState(false);
    const [subdomainAvailable, setSubdomainAvailable] = useState(null);

    useEffect(() => {
        setMounted(true);

        // Redirect if not connected
        if (mounted && !connected) {
            router.push('/');
        }
    }, [connected, mounted, router]);

    // Auto-generate subdomain from name
    const handleNameChange = (e) => {
        const name = e.target.value;
        const autoSubdomain = name
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '')
            .slice(0, 30);

        setFormData({ ...formData, name, subdomain: autoSubdomain });
        setSubdomainAvailable(null); // Reset availability
    };

    // Check subdomain availability
    const checkSubdomain = async () => {
        if (!formData.subdomain || !config) return;

        setSubdomainChecking(true);
        try {
            const result = await checkSubdomainAvailability(formData.subdomain, config.network);
            setSubdomainAvailable(result.available);
            if (!result.available) {
                setErrors({ ...errors, subdomain: result.reason });
            } else {
                const newErrors = { ...errors };
                delete newErrors.subdomain;
                setErrors(newErrors);
            }
        } catch (error) {
            console.error('Error checking subdomain:', error);
        }
        setSubdomainChecking(false);
    };

    // Validate step 1
    const validateStep1 = () => {
        const newErrors = {};

        if (!formData.name.trim()) newErrors.name = 'Project name is required';
        if (!formData.subdomain.trim()) newErrors.subdomain = 'Subdomain is required';
        if (subdomainAvailable === false) newErrors.subdomain = 'Subdomain is not available';
        if (!formData.paymentTokenMint.trim()) newErrors.paymentTokenMint = 'Token mint address is required';
        if (!formData.boxPrice || parseFloat(formData.boxPrice) <= 0) newErrors.boxPrice = 'Box price must be greater than 0';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle form submission - Initializes on-chain FIRST, then creates in DB
    const handleSubmit = async () => {
        if (!validateStep1()) return;

        setStep(3); // Creating...

        let projectData = null;
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

        try {
            const fullSubdomain = generateSubdomain(formData.subdomain, config.network);

            // Step 1: Create project in database first to get a numeric ID
            const { data: tempProject, error: dbError } = await supabase
                .from('projects')
                .insert({
                    owner_wallet: publicKey.toString(),
                    subdomain: fullSubdomain,
                    project_name: formData.name,
                    description: formData.description,
                    vault_wallet: publicKey.toString(),
                    box_price: Math.floor(parseFloat(formData.boxPrice) * Math.pow(10, formData.paymentTokenDecimals)),
                    max_boxes: 1000,
                    is_active: true,
                    payment_token_mint: formData.paymentTokenMint,
                    payment_token_symbol: formData.paymentTokenSymbol,
                    payment_token_decimals: formData.paymentTokenDecimals,
                    network: config.network,
                })
                .select()
                .single();

            if (dbError) throw dbError;
            projectData = tempProject;

            console.log('Project created in database:', projectData);

            if (!projectData.project_numeric_id) {
                throw new Error('Project numeric ID not assigned. Please check database configuration.');
            }

            // Step 2: Build transaction via backend
            const buildResponse = await fetch(`${backendUrl}/api/program/build-initialize-project-tx`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: projectData.project_numeric_id,
                    boxPrice: Math.floor(parseFloat(formData.boxPrice) * Math.pow(10, formData.paymentTokenDecimals)),
                    paymentTokenMint: formData.paymentTokenMint,
                    ownerWallet: publicKey.toString(),
                }),
            });

            const buildResult = await buildResponse.json();

            if (!buildResult.success) {
                throw new Error(buildResult.details || 'Failed to build transaction');
            }

            console.log('Transaction built:', buildResult);

            // Step 3: Deserialize transaction
            const transaction = Transaction.from(Buffer.from(buildResult.transaction, 'base64'));

            // Get a fresh blockhash (the one from backend may have expired)
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
            transaction.recentBlockhash = blockhash;
            transaction.lastValidBlockHeight = lastValidBlockHeight;

            console.log('Sending transaction for signing...');

            // Step 4: Sign and send transaction
            const signature = await sendTransaction(transaction, connection, {
                skipPreflight: false,
                preflightCommitment: 'confirmed',
            });

            console.log('Transaction sent:', signature);

            // Step 5: Wait for confirmation
            const confirmation = await connection.confirmTransaction(signature, 'confirmed');

            if (confirmation.value.err) {
                throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
            }

            console.log('Transaction confirmed!');

            // Step 6: Update database with PDAs and vault funding status
            const confirmResponse = await fetch(`${backendUrl}/api/program/confirm-project-init`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: projectData.project_numeric_id,
                    signature,
                    pdas: buildResult.pdas,
                    vaultFunding: buildResult.vaultFunding,
                }),
            });

            const confirmResult = await confirmResponse.json();

            if (!confirmResult.success) {
                console.warn('Warning: Failed to update database:', confirmResult.details);
            }

            // Success!
            alert(
                `Project "${formData.name}" created successfully!\n\n` +
                `Subdomain: ${fullSubdomain}.degenbox.fun\n` +
                `Transaction: ${signature}\n\n` +
                `View on Solana Explorer: ${confirmResult.explorerUrl || `https://explorer.solana.com/tx/${signature}?cluster=${config.network}`}`
            );
            router.push('/dashboard');

        } catch (error) {
            console.error('Error creating project:', error);

            // Clean up: delete the project from database if on-chain init failed
            if (projectData?.id) {
                console.log('Cleaning up failed project from database...');
                try {
                    const { data: deleteData, error: deleteError } = await supabase
                        .from('projects')
                        .delete()
                        .eq('id', projectData.id)
                        .select();

                    if (deleteError) {
                        console.error('Failed to clean up project:', deleteError);
                    } else {
                        console.log('Failed project removed from database');
                    }
                } catch (cleanupError) {
                    console.error('Error during cleanup:', cleanupError);
                }
            }

            alert(`Failed to create project: ${error.message}\n\nPlease try again.`);
            setStep(2);
        }
    };

    if (!mounted || configLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-degen-bg">
                <DegenLoadingState text="Loading..." />
            </div>
        );
    }

    if (!connected) {
        return null; // Will redirect
    }

    const isDevnet = config?.network === 'devnet';
    const launchFee = config?.launchFeeAmount ? config.launchFeeAmount / 1e9 : 100;
    const vaultFundAmount = config?.vaultFundAmount ? Number(config.vaultFundAmount) / 1e9 : 50000000;

    return (
        <div className="min-h-screen bg-degen-bg pt-24 pb-12 px-6">
            <div className="max-w-3xl mx-auto">
                {/* Network Badge */}
                {isDevnet && (
                    <div className="mb-6">
                        <DegenBadge variant="warning" size="lg">
                            DEVNET MODE
                        </DegenBadge>
                    </div>
                )}

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-degen-black text-4xl font-medium uppercase tracking-wider mb-2">Create New Project</h1>
                    <p className="text-degen-text-muted text-lg">
                        Launch your own lootbox platform
                    </p>
                </div>

                {/* Progress Steps */}
                <div className="flex mb-8 gap-2">
                    <div className={`flex-1 h-1 ${step >= 1 ? 'bg-degen-black' : 'bg-degen-text-light'}`} />
                    <div className={`flex-1 h-1 ${step >= 2 ? 'bg-degen-black' : 'bg-degen-text-light'}`} />
                    <div className={`flex-1 h-1 ${step >= 3 ? 'bg-degen-black' : 'bg-degen-text-light'}`} />
                </div>

                {/* Step 1: Project Details */}
                {step === 1 && (
                    <DegenCard variant="white" padding="lg">
                        <h2 className="text-degen-black text-2xl font-medium uppercase tracking-wider mb-6">Project Details</h2>

                        {/* Project Name */}
                        <div className="mb-6">
                            <DegenInput
                                label="Project Name *"
                                value={formData.name}
                                onChange={handleNameChange}
                                placeholder="Lucky Cat Boxes"
                                error={errors.name}
                            />
                        </div>

                        {/* Subdomain */}
                        <div className="mb-6">
                            <label className="block text-degen-black font-medium text-sm uppercase tracking-wider mb-2">
                                Subdomain *
                            </label>
                            <div className="flex gap-2">
                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        value={formData.subdomain}
                                        onChange={(e) => {
                                            setFormData({ ...formData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') });
                                            setSubdomainAvailable(null);
                                        }}
                                        onBlur={checkSubdomain}
                                        placeholder="luckycat"
                                        className="w-full px-3 py-2 bg-degen-white text-degen-black placeholder:text-degen-text-muted border border-degen-black outline-none transition-colors duration-100 focus:bg-degen-container"
                                    />
                                    {subdomainChecking && (
                                        <div className="absolute right-3 top-2 text-degen-text-muted">...</div>
                                    )}
                                    {subdomainAvailable === true && (
                                        <div className="absolute right-3 top-2 text-degen-green">OK</div>
                                    )}
                                    {subdomainAvailable === false && (
                                        <div className="absolute right-3 top-2 text-degen-feature">X</div>
                                    )}
                                </div>
                                <div className="flex items-center text-degen-text-muted text-sm">.degenbox.fun</div>
                            </div>
                            {isDevnet && (
                                <p className="text-degen-warning text-xs mt-1">
                                    Devnet projects will have "devnet-" prefix
                                </p>
                            )}
                            {errors.subdomain && <p className="text-degen-feature text-sm mt-1">{errors.subdomain}</p>}
                        </div>

                        {/* Description */}
                        <div className="mb-6">
                            <DegenTextarea
                                label="Description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Try your luck with adorable cat-themed lootboxes!"
                                rows={3}
                            />
                        </div>

                        {/* Payment Token */}
                        <div className="mb-6">
                            <DegenInput
                                label="Payment Token Mint Address *"
                                value={formData.paymentTokenMint}
                                onChange={(e) => setFormData({ ...formData, paymentTokenMint: e.target.value })}
                                placeholder="So11111111111111111111111111111111111111112"
                                hint="The SPL token users will pay with (e.g., SOL, USDC, your token)"
                                error={errors.paymentTokenMint}
                                className="font-mono text-sm"
                            />
                        </div>

                        {/* Token Symbol & Decimals */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <DegenInput
                                label="Token Symbol"
                                value={formData.paymentTokenSymbol}
                                onChange={(e) => setFormData({ ...formData, paymentTokenSymbol: e.target.value.toUpperCase() })}
                                placeholder="SOL"
                            />
                            <DegenInput
                                label="Decimals"
                                type="number"
                                value={formData.paymentTokenDecimals}
                                onChange={(e) => setFormData({ ...formData, paymentTokenDecimals: parseInt(e.target.value) })}
                                min="0"
                                max="9"
                            />
                        </div>

                        {/* Box Price */}
                        <div className="mb-6">
                            <DegenInput
                                label="Box Price (in tokens) *"
                                type="number"
                                value={formData.boxPrice}
                                onChange={(e) => setFormData({ ...formData, boxPrice: e.target.value })}
                                placeholder="1.0"
                                step="0.000000001"
                                min="0"
                                error={errors.boxPrice}
                            />
                        </div>

                        {/* Continue Button */}
                        <DegenButton
                            onClick={() => {
                                if (validateStep1()) setStep(2);
                            }}
                            variant="primary"
                            size="lg"
                            fullWidth
                        >
                            Continue
                        </DegenButton>
                    </DegenCard>
                )}

                {/* Step 2: Review */}
                {step === 2 && (
                    <DegenCard variant="white" padding="lg">
                        <h2 className="text-degen-black text-2xl font-medium uppercase tracking-wider mb-6">Review & Confirm</h2>

                        <div className="space-y-4 mb-8">
                            <ReviewItem label="Project Name" value={formData.name} />
                            <ReviewItem
                                label="Subdomain"
                                value={`${generateSubdomain(formData.subdomain, config.network)}.degenbox.fun`}
                            />
                            {formData.description && (
                                <ReviewItem label="Description" value={formData.description} />
                            )}
                            <ReviewItem label="Payment Token" value={formData.paymentTokenSymbol || 'TOKEN'} />
                            <ReviewItem label="Box Price" value={`${formData.boxPrice} ${formData.paymentTokenSymbol || 'TOKEN'}`} />
                        </div>

                        {/* Launch Fee & Vault Funding Notice */}
                        <DegenCard variant="yellow" padding="md" className="mb-6">
                            <h3 className="text-degen-black font-medium uppercase tracking-wider mb-3">Required Payments</h3>

                            <div className="space-y-3 mb-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-degen-black">Launch Fee ($3EYES)</span>
                                    <span className="text-degen-black font-medium">{launchFee.toLocaleString()} $3EYES</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-degen-black">Vault Funding ({formData.paymentTokenSymbol || 'tokens'})</span>
                                    <span className="text-degen-black font-medium">{vaultFundAmount.toLocaleString()} {formData.paymentTokenSymbol || 'tokens'}</span>
                                </div>
                            </div>

                            <p className="text-degen-black/70 text-sm">
                                {isDevnet
                                    ? "This is DEVNET - no real tokens required for testing!"
                                    : "The vault funding ensures there are tokens available to pay out rewards to winners."}
                            </p>
                        </DegenCard>

                        {/* Buttons */}
                        <div className="flex gap-4">
                            <DegenButton
                                onClick={() => setStep(1)}
                                variant="secondary"
                                size="lg"
                                className="flex-1"
                            >
                                Back
                            </DegenButton>
                            <DegenButton
                                onClick={handleSubmit}
                                variant="primary"
                                size="lg"
                                className="flex-1"
                            >
                                Create Project
                            </DegenButton>
                        </div>
                    </DegenCard>
                )}

                {/* Step 3: Creating */}
                {step === 3 && (
                    <DegenCard variant="white" padding="lg" className="text-center">
                        <DegenLoadingState text="Creating Your Project..." />
                        <p className="text-degen-text-muted mt-2">Please wait and approve the transaction in your wallet</p>
                    </DegenCard>
                )}
            </div>
        </div>
    );
}

function ReviewItem({ label, value }) {
    return (
        <div className="flex justify-between py-3 border-b border-degen-black">
            <span className="text-degen-text-muted">{label}</span>
            <span className="text-degen-black font-medium">{value}</span>
        </div>
    );
}
