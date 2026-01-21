// app/projects/page.js
// Browse all projects on the platform

import ProjectsGrid from '@/components/projects/ProjectsGrid';

export const metadata = {
    title: 'Browse Projects | DegenBox',
    description: 'Explore all lootbox projects on DegenBox',
};

export default function ProjectsPage() {
    return (
        <ProjectsGrid />
    );
}
