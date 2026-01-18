// app/project/[subdomain]/page.js
// Dynamic project page - each subdomain routes here
// Example: catbox.degenbox.fun → /project/catbox

import ProjectPage from '@/components/project/ProjectPage';
import BetaGate from '@/components/auth/BetaGate';

export default async function Project({ params }) {
    const { subdomain } = await params;

    return (
        <BetaGate>
            <ProjectPage subdomain={subdomain} />
        </BetaGate>
    );
}

// Generate metadata for SEO (optional but recommended)
export async function generateMetadata({ params }) {
    const { subdomain } = await params;

    return {
        title: `${subdomain} | DegenBox`,
        description: `Try your luck with ${subdomain} lootboxes on DegenBox`,
    };
}
