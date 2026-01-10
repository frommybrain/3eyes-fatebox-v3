/**
 * Price Oracle - Jupiter/Birdeye API Integration
 *
 * Fetches real-time token prices for withdrawal fee calculation.
 * Uses Jupiter Price API v3.
 *
 * IMPORTANT: API key is REQUIRED for Jupiter Price API v3.
 * Set JUPITER_API_KEY in .env for authenticated requests.
 * Get your API key at: https://portal.jup.ag
 *
 * For development/devnet testing, set USE_MOCK_PRICES=true in .env
 * to use mock exchange rates for test tokens.
 */

// Well-known mainnet token addresses for testing Jupiter connection
const KNOWN_TOKENS = {
    SOL: 'So11111111111111111111111111111111111111112',
    USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
};

// Cache prices for 60 seconds to avoid rate limiting
const priceCache = new Map();
const CACHE_TTL_MS = 60 * 1000;

/**
 * Check if we should use mock prices (for devnet testing)
 */
function useMockPrices() {
    return process.env.USE_MOCK_PRICES === 'true' || process.env.NODE_ENV === 'development';
}

/**
 * Get mock price for development testing
 * Returns a consistent mock price for any token
 */
function getMockPrice(mintAddress) {
    // Use a hash of the mint address to generate a consistent mock price
    // This ensures the same token always gets the same mock price
    let hash = 0;
    for (let i = 0; i < mintAddress.length; i++) {
        hash = ((hash << 5) - hash) + mintAddress.charCodeAt(i);
        hash = hash & hash;
    }
    // Generate a price between $0.0001 and $10
    const mockPrice = Math.abs(hash % 10000) / 1000 + 0.0001;
    return mockPrice;
}

/**
 * Get token price in USD from Jupiter Price API
 *
 * @param {string} mintAddress - SPL token mint address
 * @returns {Promise<number|null>} Price in USD, or null if not found
 */
async function getTokenPriceUSD(mintAddress) {
    // Check cache first
    const cached = priceCache.get(mintAddress);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        console.log(`   Price cache hit for ${mintAddress.slice(0, 8)}...`);
        return cached.price;
    }

    try {
        // Jupiter Price API v3 (required since August 2025)
        // Docs: https://dev.jup.ag/docs/price/v3
        // API key is REQUIRED for v3
        if (!process.env.JUPITER_API_KEY) {
            console.warn('   JUPITER_API_KEY not set - Jupiter Price API v3 requires an API key');
            return null;
        }

        const headers = {
            'Accept': 'application/json',
            'x-api-key': process.env.JUPITER_API_KEY,
        };

        const response = await fetch(
            `https://api.jup.ag/price/v3?ids=${mintAddress}`,
            { headers }
        );

        if (!response.ok) {
            console.error(`Jupiter API error: ${response.status}`);
            // Log more details for debugging
            if (response.status === 401) {
                console.error('   401 Unauthorized - Check JUPITER_API_KEY in .env');
                console.error('   Get your API key at: https://portal.jup.ag');
            } else if (response.status === 404) {
                console.error('   404 Not Found - Token may not be traded on Jupiter');
            }
            return null;
        }

        const data = await response.json();

        // V3 response format: { [mint]: { usdPrice: number, ... } }
        // Note: V3 uses 'usdPrice' instead of 'price' and no 'data' wrapper
        if (data[mintAddress]) {
            const price = parseFloat(data[mintAddress].usdPrice);

            // Cache the result
            priceCache.set(mintAddress, {
                price,
                timestamp: Date.now(),
            });

            console.log(`   Jupiter price for ${mintAddress.slice(0, 8)}...: $${price}`);
            return price;
        }

        console.warn(`No price data for ${mintAddress}`);
        return null;
    } catch (error) {
        console.error('Error fetching price from Jupiter:', error.message);
        return null;
    }
}

/**
 * Get exchange rate between two tokens
 *
 * @param {string} fromMint - Source token mint address
 * @param {string} toMint - Target token mint address
 * @returns {Promise<{rate: number, fromPriceUSD: number, toPriceUSD: number}|null>}
 */
async function getExchangeRate(fromMint, toMint) {
    console.log(`\n   Fetching exchange rate: ${fromMint.slice(0, 8)}... -> ${toMint.slice(0, 8)}...`);

    // Fetch both prices in parallel
    const [fromPrice, toPrice] = await Promise.all([
        getTokenPriceUSD(fromMint),
        getTokenPriceUSD(toMint),
    ]);

    // If Jupiter fails and we're in dev mode, use mock prices
    if ((fromPrice === null || toPrice === null) && useMockPrices()) {
        console.log('   Jupiter prices unavailable, using mock prices for development');
        const mockFromPrice = getMockPrice(fromMint);
        const mockToPrice = getMockPrice(toMint);
        const rate = mockFromPrice / mockToPrice;

        console.log(`   Mock price for ${fromMint.slice(0, 8)}...: $${mockFromPrice.toFixed(6)}`);
        console.log(`   Mock price for ${toMint.slice(0, 8)}...: $${mockToPrice.toFixed(6)}`);
        console.log(`   Mock exchange rate: 1 ${fromMint.slice(0, 8)}... = ${rate.toFixed(6)} ${toMint.slice(0, 8)}...`);

        return {
            rate,
            fromPriceUSD: mockFromPrice,
            toPriceUSD: mockToPrice,
            isMock: true,
        };
    }

    if (fromPrice === null || toPrice === null) {
        console.error('   Could not fetch prices for exchange rate calculation');
        return null;
    }

    if (toPrice === 0) {
        console.error('   Target token price is 0, cannot calculate exchange rate');
        return null;
    }

    // How many toTokens equal 1 fromToken
    const rate = fromPrice / toPrice;

    console.log(`   Exchange rate: 1 ${fromMint.slice(0, 8)}... = ${rate.toFixed(6)} ${toMint.slice(0, 8)}...`);

    return {
        rate,
        fromPriceUSD: fromPrice,
        toPriceUSD: toPrice,
        isMock: false,
    };
}

/**
 * Calculate withdrawal fee in platform tokens
 *
 * @param {bigint|number} withdrawalAmount - Amount being withdrawn (in smallest units)
 * @param {number} feePercentage - Fee percentage (e.g., 2.5 for 2.5%)
 * @param {string} projectTokenMint - Project's payment token mint
 * @param {string} platformTokenMint - Platform fee token mint ($3EYES)
 * @param {number} projectTokenDecimals - Decimals for project token
 * @param {number} platformTokenDecimals - Decimals for platform token
 * @returns {Promise<{
 *   feeInProjectToken: bigint,
 *   feeInPlatformToken: bigint,
 *   exchangeRate: number,
 *   projectTokenPriceUSD: number,
 *   platformTokenPriceUSD: number,
 *   success: boolean,
 *   isMockPrice: boolean,
 *   error?: string
 * }>}
 */
async function calculateWithdrawalFee(
    withdrawalAmount,
    feePercentage,
    projectTokenMint,
    platformTokenMint,
    projectTokenDecimals = 9,
    platformTokenDecimals = 9
) {
    console.log(`\n   Calculating withdrawal fee:`);
    console.log(`   Withdrawal: ${withdrawalAmount} (smallest units)`);
    console.log(`   Fee %: ${feePercentage}%`);

    // Calculate fee in project token terms
    const withdrawalBigInt = BigInt(withdrawalAmount);
    const feeInProjectToken = (withdrawalBigInt * BigInt(Math.floor(feePercentage * 100))) / BigInt(10000);

    console.log(`   Fee in project token: ${feeInProjectToken}`);

    // Get exchange rate
    const exchangeData = await getExchangeRate(projectTokenMint, platformTokenMint);

    if (!exchangeData) {
        return {
            feeInProjectToken,
            feeInPlatformToken: BigInt(0),
            exchangeRate: 0,
            projectTokenPriceUSD: 0,
            platformTokenPriceUSD: 0,
            success: false,
            isMockPrice: false,
            error: 'Could not fetch token prices. Please try again later.',
        };
    }

    // Convert fee to platform token
    // Account for decimal differences
    const decimalAdjustment = Math.pow(10, platformTokenDecimals - projectTokenDecimals);
    const feeInPlatformTokenFloat = Number(feeInProjectToken) * exchangeData.rate * decimalAdjustment;
    const feeInPlatformToken = BigInt(Math.ceil(feeInPlatformTokenFloat)); // Round up to be safe

    console.log(`   Fee in platform token: ${feeInPlatformToken}`);
    if (exchangeData.isMock) {
        console.log(`   (Using mock prices for development)`);
    }

    return {
        feeInProjectToken,
        feeInPlatformToken,
        exchangeRate: exchangeData.rate,
        projectTokenPriceUSD: exchangeData.fromPriceUSD,
        platformTokenPriceUSD: exchangeData.toPriceUSD,
        success: true,
        isMockPrice: exchangeData.isMock || false,
    };
}

/**
 * Test Jupiter API connection with well-known tokens
 * Useful for verifying the API is working
 *
 * @returns {Promise<{success: boolean, prices: Object, error?: string}>}
 */
async function testJupiterConnection() {
    console.log('\n   Testing Jupiter API connection...');

    try {
        const prices = {};

        for (const [symbol, mint] of Object.entries(KNOWN_TOKENS)) {
            const price = await getTokenPriceUSD(mint);
            prices[symbol] = price;
            console.log(`   ${symbol}: $${price ?? 'N/A'}`);
        }

        const success = Object.values(prices).some(p => p !== null);

        return {
            success,
            prices,
            error: success ? undefined : 'Could not fetch any prices from Jupiter',
        };
    } catch (error) {
        return {
            success: false,
            prices: {},
            error: error.message,
        };
    }
}

/**
 * Clear the price cache (useful for testing or forcing refresh)
 */
function clearPriceCache() {
    priceCache.clear();
    console.log('Price cache cleared');
}

/**
 * Get cache status (for debugging)
 */
function getCacheStatus() {
    const entries = [];
    for (const [mint, data] of priceCache.entries()) {
        entries.push({
            mint: mint.slice(0, 8) + '...',
            price: data.price,
            age: Math.round((Date.now() - data.timestamp) / 1000) + 's',
        });
    }
    return entries;
}

export {
    getTokenPriceUSD,
    getExchangeRate,
    calculateWithdrawalFee,
    testJupiterConnection,
    clearPriceCache,
    getCacheStatus,
    KNOWN_TOKENS,
};
