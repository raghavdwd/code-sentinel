"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  FolderGit,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { signOut } from "@/lib/auth-client";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export interface SidebarUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

const navItems = [
  {
    title: "Overview",
    url: "/dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  { title: "Repositories", url: "/dashboard/repositories", icon: FolderGit },
  { title: "Reviews", url: "/dashboard/reviews", icon: ShieldCheck },
];

const isActive = (
  item: (typeof navItems)[number],
  pathname: string
) =>
  item.exact
    ? pathname === item.url
    : pathname === item.url || pathname.startsWith(`${item.url}/`);

export const BrandMark = ({ className }: { className?: string }) => (
  <span
    className={cn(
      "flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand text-white",
      className
    )}
  >
    <ShieldCheck className="h-4 w-4" strokeWidth={2} />
  </span>
);

const NavList = ({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) => (
  <nav className="flex flex-col gap-0.5">
    {navItems.map((item) => {
      const active = isActive(item, pathname);
      return (
        <Link
          key={item.url}
          href={item.url}
          onClick={onNavigate}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex h-[34px] items-center gap-2.5 rounded-md px-2 text-[14px] transition-colors",
            active
              ? "bg-accent font-medium text-foreground"
              : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
          )}
        >
          <item.icon
            className={cn(
              "h-4 w-4",
              active ? "text-brand" : "text-muted-foreground"
            )}
            strokeWidth={1.75}
          />
          {item.title}
        </Link>
      );
    })}
  </nav>
);

const UserRow = ({ user }: { user?: SidebarUser }) => {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const name = user?.name || "Guest";
  const email = user?.email || "";
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent/60">
          <Avatar className="shrink-0 overflow-hidden rounded-full" style={{ width: 24, height: 24 }}>
            <AvatarImage src={user?.image || ""} alt={name} className="h-full w-full object-cover" />
            <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
          </Avatar>
          <span className="grid min-w-0 flex-1 leading-tight">
            <span className="truncate text-[13px] font-medium">{name}</span>
            {email && (
              <span className="truncate text-[12px] text-muted-foreground">
                {email}
              </span>
            )}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-56">
        <DropdownMenuItem
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          <Sun className="mr-2 h-4 w-4 dark:hidden" />
          <Moon className="mr-2 hidden h-4 w-4 dark:block" />
          {resolvedTheme === "dark" ? "Light theme" : "Dark theme"}
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={async () => {
            await signOut();
            router.push("/login");
            router.refresh();
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const AppSidebar = ({ user }: { user?: SidebarUser }) => {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[228px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:sticky md:top-0 md:flex md:h-dvh">
      <div className="flex h-12 shrink-0 items-center gap-2 px-4">
        <BrandMark />
        <span className="text-[14px] font-semibold tracking-tight">
          Code Sentinel
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-2 py-2">
        <NavList pathname={pathname} />
        <div className="mt-auto border-t border-sidebar-border pt-2">
          <Link
            href="/dashboard/settings"
            className={cn(
              "flex h-[34px] items-center gap-2.5 rounded-md px-2 text-[14px] transition-colors",
              pathname === "/dashboard/settings"
                ? "bg-accent font-medium text-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            )}
          >
            <Settings className="h-4 w-4" strokeWidth={1.75} />
            Settings
          </Link>
        </div>
      </div>

      <div className="border-t border-sidebar-border p-2">
        <UserRow user={user} />
      </div>
    </aside>
  );
};

export const MobileNav = ({ user }: { user?: SidebarUser }) => {
  const pathname = usePathname();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open navigation</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[264px] gap-0 bg-sidebar p-0">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <div className="flex h-12 items-center gap-2 px-4">
          <BrandMark />
          <span className="text-[14px] font-semibold">Code Sentinel</span>
        </div>
        <div className="flex flex-1 flex-col gap-4 px-2 py-2">
          <NavList pathname={pathname} />
          <div className="mt-auto border-t border-sidebar-border pt-2">
            <Link
              href="/dashboard/settings"
              className="flex h-[34px] items-center gap-2.5 rounded-md px-2 text-[14px] text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
            >
              <Settings className="h-4 w-4" strokeWidth={1.75} />
              Settings
            </Link>
          </div>
        </div>
        <div className="border-t border-sidebar-border p-2">
          <UserRow user={user} />
        </div>
      </SheetContent>
    </Sheet>
  );
};
