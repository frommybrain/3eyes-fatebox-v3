// app/dashboard/create/page.js
// Create new project flow

import CreateProject from '@/components/create/CreateProject';

export const metadata = {
    title: 'Create Project | DegenBox',
    description: 'Launch your own lootbox project',
};

export default function CreatePage() {
    return (
        <CreateProject />
    );
}
