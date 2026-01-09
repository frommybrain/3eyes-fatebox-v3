// proxy.js
// Next.js 16 Edge Proxy for Multi-Tenant Subdomain Routing
// Based on Vercel's multi-tenant approach: https://vercel.com/docs/multi-tenant
// Migrated from middleware.js (Next.js 16+ uses proxy.js instead)

import { NextResponse } from 'next/server';

// Platform domain (without subdomains)
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'degenbox.fun';

// Reserved subdomains that route to main app (not project pages)
const RESERVED_SUBDOMAINS = new Set([
    'www',
    'app',
    'admin',
    'dashboard',
    'api',
    'docs',
    'blog',
    'help',
    'support',
    'status',
    'staging',
    'dev',
    'test',
]);

// CORS allowed origins
const ALLOWED_ORIGINS = new Set([
    "https://degenbox.fun",
    "https://www.degenbox.fun",
]);

/**
 * Extract subdomain from hostname
 * @param {string} hostname - e.g., 'catbox.degenbox.fun' or 'localhost:3000'
 * @returns {string | null} - e.g., 'catbox' or null
 */
function getSubdomain(hostname) {
    // Handle localhost development
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
        // For local testing, check for subdomain in query param or header
        return null; // Return null to skip subdomain routing in development
    }

    // Remove port if present
    const host = hostname.split(':')[0];

    // Split by dots
    const parts = host.split('.');

    // Need at least 3 parts for subdomain (subdomain.domain.tld)
    if (parts.length < 3) {
        return null;
    }

    // Get subdomain (first part)
    const subdomain = parts[0];

    // Check if it's the root domain or www
    if (subdomain === '' || subdomain === 'www') {
        return null;
    }

    return subdomain;
}

/**
 * Check if subdomain is reserved
 * @param {string} subdomain
 * @returns {boolean}
 */
function isReservedSubdomain(subdomain) {
    return RESERVED_SUBDOMAINS.has(subdomain);
}

export function proxy(request) {
    const { pathname, searchParams } = request.nextUrl;
    const hostname = request.headers.get('host') || '';
    const origin = request.headers.get("origin");

    // --- CORS HANDLING for API routes ---
    if (pathname.startsWith('/api/')) {
        const res = NextResponse.next();

        if (origin && ALLOWED_ORIGINS.has(origin)) {
            res.headers.set("Access-Control-Allow-Origin", origin);
            res.headers.set("Vary", "Origin");
            res.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
            res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
        }

        if (request.method === "OPTIONS") {
            return new NextResponse(null, { status: 204, headers: res.headers });
        }

        return res;
    }

    // Extract subdomain
    const subdomain = getSubdomain(hostname);

    // --- DEVELOPMENT MODE: Support ?subdomain= query param ---
    // This allows testing subdomains locally without DNS setup
    // Example: http://localhost:3000?subdomain=catbox
    const devSubdomain = searchParams.get('subdomain');
    if (devSubdomain && (hostname.includes('localhost') || hostname.includes('127.0.0.1'))) {
        // Rewrite to project page with subdomain as prop
        const url = request.nextUrl.clone();
        url.pathname = `/project/${devSubdomain}${pathname}`;
        url.searchParams.delete('subdomain'); // Clean up URL
        return NextResponse.rewrite(url);
    }

    // --- NO SUBDOMAIN: Main platform site ---
    if (!subdomain) {
        // Routes to main app (landing, dashboard, admin, etc.)
        return NextResponse.next();
    }

    // --- RESERVED SUBDOMAIN: Route to specific app pages ---
    if (isReservedSubdomain(subdomain)) {
        // Reserved subdomains route to their respective pages
        // Example: admin.degenbox.fun → /admin
        if (subdomain === 'admin') {
            const url = request.nextUrl.clone();
            url.pathname = `/admin${pathname}`;
            return NextResponse.rewrite(url);
        }

        if (subdomain === 'dashboard') {
            const url = request.nextUrl.clone();
            url.pathname = `/dashboard${pathname}`;
            return NextResponse.rewrite(url);
        }

        // For other reserved subdomains, just serve main site
        return NextResponse.next();
    }

    // --- PROJECT SUBDOMAIN: Rewrite to dynamic project page ---
    // Example: catbox.degenbox.fun → /project/catbox
    // This allows each project to have its own subdomain while using shared code

    const url = request.nextUrl.clone();

    // Don't rewrite /_next, /api, or static files
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname.startsWith('/static') ||
        pathname.includes('.')
    ) {
        return NextResponse.next();
    }

    // Rewrite to /project/[subdomain] route
    url.pathname = `/project/${subdomain}${pathname}`;

    // Add subdomain to headers for use in components
    const response = NextResponse.rewrite(url);
    response.headers.set('x-subdomain', subdomain);
    response.headers.set('x-hostname', hostname);

    return response;
}

// Configure proxy to run on all routes
export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder files with extensions
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|gif|png|svg|ico|webp)).*)',
    ],
};
