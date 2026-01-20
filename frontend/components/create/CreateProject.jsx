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
    DegenAccordion,
    useToast,
    XLogo,
} from '@/components/ui';
import { formatTimeToMaxLuck, formatDuration, LUCK_INTERVAL_PRESETS } from '@/lib/luckHelpers';
import { getProjectCreatedShareHandler } from '@/lib/shareManager';
import { getProjectUrl } from '@/lib/getNetworkConfig';

export default function CreateProject() {
    const router = useRouter();
    const { toast } = useToast();
    const { publicKey, connected, sendTransaction } = useWallet();
    const { connection } = useConnection();
    const { config, configLoading } = useNetworkStore();

    const [mounted, setMounted] = useState(false);
    const [step, setStep] = useState(1); // 1: Details, 2: Review, 3: Creating, 4: Success

    // Success state
    const [createdProjectData, setCreatedProjectData] = useState(null);

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
        luckIntervalSeconds: 0, // 0 = use platform default
    });

    const [errors, setErrors] = useState({});
    const [subdomainChecking, setSubdomainChecking] = useState(false);
    const [subdomainAvailable, setSubdomainAvailable] = useState(null);

    // On-chain config for luck calculation (baseLuck, maxLuck)
    const [onChainConfig, setOnChainConfig] = useState(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Fetch on-chain platform config for baseLuck/maxLuck
    useEffect(() => {
        async function fetchOnChainConfig() {
            try {
                const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';
                const response = await fetch(`${backendUrl}/api/admin/platform-config`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.platformConfig) {
                        setOnChainConfig(data.platformConfig);
                    }
                }
            } catch (error) {
                console.error('Error fetching on-chain config:', error);
            }
        }
        fetchOnChainConfig();
    }, []);

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
                    max_boxes: 99999,
                    is_active: true,
                    payment_token_mint: formData.paymentTokenMint,
                    payment_token_symbol: formData.paymentTokenSymbol,
                    payment_token_decimals: formData.paymentTokenDecimals,
                    network: config.network,
                    luck_interval_seconds: formData.luckIntervalSeconds || null,
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
                    luckIntervalSeconds: formData.luckIntervalSeconds || 0,
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
            transaction.feePayer = publicKey;

            // Step 3.5: Simulate transaction to get detailed error before sending
            console.log('Simulating transaction...');
            try {
                const simulation = await connection.simulateTransaction(transaction);
                console.log('Simulation result:', simulation);
                if (simulation.value.err) {
                    console.error('Simulation failed:', simulation.value.err);
                    console.error('Logs:', simulation.value.logs);
                    throw new Error(`Transaction simulation failed: ${JSON.stringify(simulation.value.err)}\nLogs: ${simulation.value.logs?.join('\n')}`);
                }
                console.log('Simulation successful, proceeding to sign...');
            } catch (simError) {
                console.error('Simulation error:', simError);
                throw simError;
            }

            console.log('Sending transaction for signing...');

            // Step 4: Sign and send transaction
            const signature = await sendTransaction(transaction, connection, {
                skipPreflight: true, // We already simulated
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
                    launchFee: buildResult.launchFee,
                }),
            });

            const confirmResult = await confirmResponse.json();

            if (!confirmResult.success) {
                console.warn('Warning: Failed to update database:', confirmResult.details);
            }

            // Success!
            const projectUrl = getProjectUrl(fullSubdomain);
            setCreatedProjectData({
                name: formData.name,
                url: projectUrl,
                subdomain: fullSubdomain,
            });
            setStep(4); // Success step

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

            toast.error(error.message || 'Failed to create project. Please try again.', {
                title: 'Creation Failed',
                duration: 6000,
            });
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
        return (
            <div className="min-h-screen bg-degen-bg pt-24 pb-12 px-6">
                <div className="max-w-3xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-degen-black text-4xl font-medium uppercase tracking-wider mb-2">Create Project</h1>
                    </div>
                    <DegenCard variant="white" padding="lg" className="text-center">
                        <h2 className="text-degen-black text-2xl font-medium uppercase tracking-wider mb-4">
                            Connect Your Wallet
                        </h2>
                        <p className="text-degen-text-muted mb-6">
                            Please connect your wallet to create a new project.
                        </p>
                    </DegenCard>
                </div>
            </div>
        );
    }

    const isDevnet = config?.network === 'devnet';
    const launchFee = config?.launchFeeAmount ? config.launchFeeAmount / 1e9 : 100;

    // Dynamic vault funding: ~30x box price (calculated by backend based on EV analysis)
    const boxPriceNum = parseFloat(formData.boxPrice) || 0;
    const estimatedVaultFunding = Math.ceil(boxPriceNum * 30);

    return (
        <div className="min-h-screen bg-degen-bg pt-24 pb-12 px-2 md:px-6">
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
                    <h1 className="text-degen-black text-4xl font-medium uppercase tracking-wider mb-2">Create Project</h1>
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
                                placeholder="Cats"
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
                                        placeholder="cats"
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
                                <p className="text-degen-black text-xs mt-1">
                                    Devnet projects will have devnet- prefix
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
                                //placeholder="..."
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

                        {/* Advanced Settings Accordion */}
                        <div className="mb-6">
                            <DegenAccordion title="Advanced">
                                {/* Luck Accumulation Speed */}
                                <div>
                                    <label className="block text-degen-black font-medium text-sm uppercase tracking-wider mb-2">
                                        Luck Accumulation Speed
                                    </label>
                                    <p className="text-degen-text-muted text-sm mb-3">
                                        How fast should luck accumulate? This determines how long users need to hold boxes to reach maximum luck.
                                    </p>

                                    {/* Platform Default Info */}
                                    <div className="bg-blue-50 border border-blue-200 p-3 mb-3">
                                        <p className="text-blue-800 text-sm">
                                            <strong>Platform Default:</strong> {config?.luckIntervalSeconds ? formatDuration(config.luckIntervalSeconds) : '...'} per +1 luck
                                            {config?.luckIntervalSeconds && (
                                                <span className="text-blue-600"> ({formatTimeToMaxLuck(config.luckIntervalSeconds, onChainConfig?.baseLuck, onChainConfig?.maxLuck)} to max luck)</span>
                                            )}
                                        </p>
                                    </div>

                                    {/* Custom Interval Input */}
                                    <DegenInput
                                        type="number"
                                        value={formData.luckIntervalSeconds || ''}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            luckIntervalSeconds: parseInt(e.target.value) || 0
                                        })}
                                        placeholder="Leave empty to use platform default"
                                        min="0"
                                        hint="Seconds per +1 luck"
                                    />

                                    {/* Quick Presets */}
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {/* Platform Default button */}
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, luckIntervalSeconds: 0 })}
                                            className={`px-3 py-1 text-xs border transition-colors ${
                                                formData.luckIntervalSeconds === 0
                                                    ? 'bg-degen-black text-degen-white border-degen-black'
                                                    : 'bg-degen-white text-degen-black border-degen-text-light hover:border-degen-black'
                                            }`}
                                        >
                                            Platform Default ({config?.luckIntervalSeconds ? formatDuration(config.luckIntervalSeconds) : '...'})
                                        </button>
                                        {/* Other presets */}
                                        {LUCK_INTERVAL_PRESETS.slice(0, 5).map((preset) => (
                                            <button
                                                key={preset.value}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, luckIntervalSeconds: preset.value })}
                                                className={`px-3 py-1 text-xs border transition-colors ${
                                                    formData.luckIntervalSeconds === preset.value
                                                        ? 'bg-degen-black text-degen-white border-degen-black'
                                                        : 'bg-degen-white text-degen-black border-degen-text-light hover:border-degen-black'
                                                }`}
                                            >
                                                {preset.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Time to Max Luck Projection */}
                                    <div className="mt-4 p-3 bg-degen-container border border-degen-text-light">
                                        <div className="flex justify-between items-center">
                                            <span className="text-degen-text-muted text-sm">Time to max luck ({onChainConfig?.maxLuck ?? 60}):</span>
                                            <span className="text-degen-black font-medium">
                                                {formatTimeToMaxLuck(formData.luckIntervalSeconds || config?.luckIntervalSeconds || 10800, onChainConfig?.baseLuck, onChainConfig?.maxLuck)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </DegenAccordion>
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
                            <ReviewItem
                                label="Time to Max Luck"
                                value={`${formatTimeToMaxLuck(formData.luckIntervalSeconds || config?.luckIntervalSeconds || 10800, onChainConfig?.baseLuck, onChainConfig?.maxLuck)}${formData.luckIntervalSeconds === 0 ? ' (platform default)' : ''}`}
                            />
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
                                    <span className="text-degen-black font-medium">~{estimatedVaultFunding.toLocaleString()} {formData.paymentTokenSymbol || 'tokens'}</span>
                                </div>
                            </div>

                            <p className="text-degen-black/70 text-sm mb-2">
                                Vault funding is calculated dynamically (~30x box price) based on statistical payout requirements.
                            </p>
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

                {/* Step 4: Success */}
                {step === 4 && (
                    <DegenCard variant="white" padding="lg" className="text-center">
                        <h2 className="text-degen-black text-2xl font-medium uppercase tracking-wider mb-4">
                            Project Created!
                        </h2>
                        <p className="text-degen-text-muted mb-6">
                            Your project is now live. Share it with the world!
                        </p>
                        <div className="flex gap-4 justify-center flex-wrap">
                            <DegenButton
                                onClick={() => router.push('/dashboard?tab=projects')}
                                variant="secondary"
                                size="lg"
                            >
                                Go to Dashboard
                            </DegenButton>
                            <DegenButton
                                onClick={() => window.open(createdProjectData?.url, '_blank')}
                                variant="primary"
                                size="lg"
                            >
                                Visit Project
                            </DegenButton>
                            <DegenButton
                                onClick={getProjectCreatedShareHandler(createdProjectData?.name, createdProjectData?.url)}
                                variant="secondary"
                                size="lg"
                            >
                                <XLogo size={16} className="mr-2" />
                                Share on X
                            </DegenButton>
                        </div>
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
