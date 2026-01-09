// app/dashboard/manage/[projectId]/page.js
import ManageProject from '@/components/manage/ManageProject';

export default function ManageProjectPage({ params }) {
    return <ManageProject projectId={params.projectId} />;
}
