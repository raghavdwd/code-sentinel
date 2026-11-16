import React from "react";
import { AppSidebar, MobileNav } from "@/components/app-sidebar";
import { requireAuth } from "@/modules/auth/utils/auth-utils";

const DashboardLayout = async ({ children }: { children: React.ReactNode }) => {
  const session = await requireAuth();
  const user = {
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
  };

  return (
    <div className="flex min-h-dvh bg-background">
      <AppSidebar user={user} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-3 md:hidden">
          <MobileNav user={user} />
          <span className="text-[14px] font-semibold">Code Sentinel</span>
        </header>

        <main className="min-h-0 flex-1 bg-card">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
