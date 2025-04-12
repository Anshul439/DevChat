import AuthGuard from "@/components/AuthGuard";

export default function FriendRequestsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full">
      <AuthGuard>{children}</AuthGuard>;
    </div>
  );
}
