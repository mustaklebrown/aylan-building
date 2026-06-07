import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const user = {
    ...session.user,
    role: session.user.role ?? "AGENT",
  };

  return (
    <div className="flex min-h-screen bg-muted/40">
      <Sidebar user={user} />
      <div className="flex w-full flex-col pl-0 md:pl-64">
        <Header user={user} />
        <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
          {children}
        </main>
      </div>
    </div>
  );
}
