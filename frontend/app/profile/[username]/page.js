// app/profile/[username]/page.js
// Dynamic user profile page

import ProfilePage from '@/components/profile/ProfilePage';

export default async function Profile({ params }) {
    const { username } = await params;

    return <ProfilePage username={username} />;
}

// Generate metadata for SEO
export async function generateMetadata({ params }) {
    const { username } = await params;

    return {
        title: `${username} | DegenBox Profile`,
        description: `View ${username}'s degen stats and achievements on DegenBox`,
        openGraph: {
            title: `${username} | DegenBox Profile`,
            description: `View ${username}'s degen stats and achievements on DegenBox`,
            type: 'profile',
        },
    };
}
