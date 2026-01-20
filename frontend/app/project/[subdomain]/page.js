// app/project/[subdomain]/page.js
// Dynamic project page - each subdomain routes here
// Example: catbox.degenbox.fun → /project/catbox

import ProjectPage from '@/components/project/ProjectPage';

export default async function Project({ params }) {
    const { subdomain } = await params;

    // Beta access is now handled inside ProjectPage with unified UI
    return <ProjectPage subdomain={subdomain} />;
}

// Generate metadata for SEO (optional but recommended)
export async function generateMetadata({ params }) {
    const { subdomain } = await params;

    return {
        title: `${subdomain} | DegenBox`,
        description: `Try your luck with ${subdomain} lootboxes on DegenBox`,
    };
}
