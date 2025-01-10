import AuthGuard from '@/components/AuthGuard';

export default function DashboardPage() {
  return (
    <AuthGuard>
      <div className='dark:bg-gray-900'>
        <h1>Dashboard</h1>
        {/* Your dashboard content */}
      </div>
    </AuthGuard>
  );
}