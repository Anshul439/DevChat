import AuthGuard from '@/components/authGuard';

export default function DashboardPage() {
  return (
    <AuthGuard>
      <div>
        <h1>Dashboard</h1>
        {/* Your dashboard content */}
      </div>
    </AuthGuard>
  );
}