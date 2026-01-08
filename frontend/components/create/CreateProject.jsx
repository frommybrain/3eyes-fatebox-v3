// components/create/CreateProject.jsx
'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import useNetworkStore from '@/store/useNetworkStore';
import { checkSubdomainAvailability, generateSubdomain } from '@/lib/getNetworkConfig';
import { supabase } from '@/lib/supabase';

export default function CreateProject() {
    const router = useRouter();
    const { publicKey, connected } = useWallet();
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

    // Handle form submission (MOCK - no on-chain transaction yet)
    const handleSubmit = async () => {
        if (!validateStep1()) return;

        setStep(3); // Creating...

        try {
            // In production, this would call the on-chain create_project instruction
            // For now, we'll just insert directly into the database for testing

            const fullSubdomain = generateSubdomain(formData.subdomain, config.network);
            const nextProjectId = Date.now(); // Mock project ID

            const { data, error } = await supabase
                .from('projects')
                .insert({
                    project_id: nextProjectId,
                    owner_wallet: publicKey.toString(),
                    network: config.network,
                    subdomain: fullSubdomain,
                    name: formData.name,
                    description: formData.description,
                    logo_url: formData.logoUrl,
                    payment_token_mint: formData.paymentTokenMint,
                    payment_token_symbol: formData.paymentTokenSymbol || 'TOKEN',
                    payment_token_decimals: formData.paymentTokenDecimals,
                    box_price: Math.floor(parseFloat(formData.boxPrice) * Math.pow(10, formData.paymentTokenDecimals)),
                    project_pda: 'MOCK_PDA',
                    vault_pda: 'MOCK_VAULT_PDA',
                    vault_authority_pda: 'MOCK_VAULT_AUTH_PDA',
                    vault_token_account: 'MOCK_VAULT_TOKEN_ACCOUNT',
                    active: true,
                })
                .select()
                .single();

            if (error) throw error;

            // Success! Redirect to dashboard
            alert(`Project "${formData.name}" created successfully! 🎉\n\nYour subdomain: ${fullSubdomain}.degenbox.fun`);
            router.push('/dashboard');

        } catch (error) {
            console.error('Error creating project:', error);
            alert('Failed to create project. Please try again.');
            setStep(2);
        }
    };

    if (!mounted || configLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-4xl mb-4">👁️👁️👁️</div>
                    <p className="text-white text-lg">Loading...</p>
                </div>
            </div>
        );
    }

    if (!connected) {
        return null; // Will redirect
    }

    const isDevnet = config?.network === 'devnet';
    const launchFee = config?.launchFeeAmount ? config.launchFeeAmount / 1e9 : 100; // Simplified for display

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 pt-24 pb-12 px-6">
            <div className="max-w-3xl mx-auto">
                {/* Network Badge */}
                {isDevnet && (
                    <div className="mb-6 inline-block bg-yellow-500 text-black px-4 py-2 rounded-lg font-bold">
                        🧪 DEVNET MODE - Testing
                    </div>
                )}

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-white text-4xl font-bold mb-2">Create New Project</h1>
                    <p className="text-gray-400 text-lg">
                        Launch your own lootbox platform
                    </p>
                </div>

                {/* Progress Steps */}
                <div className="flex mb-8 gap-4">
                    <div className={`flex-1 h-2 rounded-full ${step >= 1 ? 'bg-purple-600' : 'bg-gray-700'}`} />
                    <div className={`flex-1 h-2 rounded-full ${step >= 2 ? 'bg-purple-600' : 'bg-gray-700'}`} />
                    <div className={`flex-1 h-2 rounded-full ${step >= 3 ? 'bg-purple-600' : 'bg-gray-700'}`} />
                </div>

                {/* Step 1: Project Details */}
                {step === 1 && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-8">
                        <h2 className="text-white text-2xl font-bold mb-6">Project Details</h2>

                        {/* Project Name */}
                        <div className="mb-6">
                            <label className="block text-white font-medium mb-2">
                                Project Name *
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={handleNameChange}
                                placeholder="Lucky Cat Boxes"
                                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                            />
                            {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
                        </div>

                        {/* Subdomain */}
                        <div className="mb-6">
                            <label className="block text-white font-medium mb-2">
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
                                        className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                                    />
                                    {subdomainChecking && (
                                        <div className="absolute right-3 top-3 text-gray-400">⏳</div>
                                    )}
                                    {subdomainAvailable === true && (
                                        <div className="absolute right-3 top-3 text-green-400">✓</div>
                                    )}
                                    {subdomainAvailable === false && (
                                        <div className="absolute right-3 top-3 text-red-400">✗</div>
                                    )}
                                </div>
                                <div className="flex items-center text-gray-400">.degenbox.fun</div>
                            </div>
                            {isDevnet && (
                                <p className="text-yellow-500 text-sm mt-1">
                                    Devnet projects will have "devnet-" prefix
                                </p>
                            )}
                            {errors.subdomain && <p className="text-red-400 text-sm mt-1">{errors.subdomain}</p>}
                        </div>

                        {/* Description */}
                        <div className="mb-6">
                            <label className="block text-white font-medium mb-2">
                                Description
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Try your luck with adorable cat-themed lootboxes!"
                                rows={3}
                                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                            />
                        </div>

                        {/* Payment Token */}
                        <div className="mb-6">
                            <label className="block text-white font-medium mb-2">
                                Payment Token Mint Address *
                            </label>
                            <input
                                type="text"
                                value={formData.paymentTokenMint}
                                onChange={(e) => setFormData({ ...formData, paymentTokenMint: e.target.value })}
                                placeholder="So11111111111111111111111111111111111111112"
                                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 font-mono text-sm"
                            />
                            <p className="text-gray-500 text-sm mt-1">
                                The SPL token users will pay with (e.g., SOL, USDC, your token)
                            </p>
                            {errors.paymentTokenMint && <p className="text-red-400 text-sm mt-1">{errors.paymentTokenMint}</p>}
                        </div>

                        {/* Token Symbol & Decimals */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block text-white font-medium mb-2">
                                    Token Symbol
                                </label>
                                <input
                                    type="text"
                                    value={formData.paymentTokenSymbol}
                                    onChange={(e) => setFormData({ ...formData, paymentTokenSymbol: e.target.value.toUpperCase() })}
                                    placeholder="SOL"
                                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                                />
                            </div>
                            <div>
                                <label className="block text-white font-medium mb-2">
                                    Decimals
                                </label>
                                <input
                                    type="number"
                                    value={formData.paymentTokenDecimals}
                                    onChange={(e) => setFormData({ ...formData, paymentTokenDecimals: parseInt(e.target.value) })}
                                    min="0"
                                    max="9"
                                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                                />
                            </div>
                        </div>

                        {/* Box Price */}
                        <div className="mb-6">
                            <label className="block text-white font-medium mb-2">
                                Box Price (in tokens) *
                            </label>
                            <input
                                type="number"
                                value={formData.boxPrice}
                                onChange={(e) => setFormData({ ...formData, boxPrice: e.target.value })}
                                placeholder="1.0"
                                step="0.000000001"
                                min="0"
                                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                            />
                            {errors.boxPrice && <p className="text-red-400 text-sm mt-1">{errors.boxPrice}</p>}
                        </div>

                        {/* Continue Button */}
                        <button
                            onClick={() => {
                                if (validateStep1()) setStep(2);
                            }}
                            className="w-full px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-lg font-bold rounded-xl shadow-lg transform transition-all hover:scale-105 active:scale-95"
                        >
                            Continue →
                        </button>
                    </div>
                )}

                {/* Step 2: Review */}
                {step === 2 && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-8">
                        <h2 className="text-white text-2xl font-bold mb-6">Review & Confirm</h2>

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

                        {/* Launch Fee Notice */}
                        <div className="bg-purple-500/10 border border-purple-500/50 rounded-xl p-6 mb-6">
                            <h3 className="text-white font-bold mb-2">⚠️ Launch Fee Required</h3>
                            <p className="text-gray-300 mb-4">
                                Creating a project requires a launch fee of <strong>{launchFee} $3EYES</strong> tokens.
                            </p>
                            <p className="text-gray-400 text-sm">
                                {isDevnet
                                    ? "This is DEVNET - no real tokens required for testing!"
                                    : "This fee helps prevent spam and supports the platform."}
                            </p>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-4">
                            <button
                                onClick={() => setStep(1)}
                                className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                            >
                                ← Back
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="flex-1 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-lg font-bold rounded-xl shadow-lg transform transition-all hover:scale-105 active:scale-95"
                            >
                                Create Project 🚀
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Creating */}
                {step === 3 && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
                        <div className="text-6xl mb-4 animate-bounce">🎲</div>
                        <h2 className="text-white text-2xl font-bold mb-2">Creating Your Project...</h2>
                        <p className="text-gray-400">Please wait while we set everything up</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function ReviewItem({ label, value }) {
    return (
        <div className="flex justify-between py-3 border-b border-white/10">
            <span className="text-gray-400">{label}</span>
            <span className="text-white font-medium">{value}</span>
        </div>
    );
}
