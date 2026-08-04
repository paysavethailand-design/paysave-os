"use client";
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@paysave/ui";
import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  ClipboardList,
  HeartHandshake,
  LogOut,
  Menu,
  Moon,
  PackageOpen,
  ShieldCheck,
  Sun,
  UserRound,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import type { ReactNode } from "react";
import { cn } from "@paysave/ui";
import { signOutAction } from "@/features/auth/actions";
const navigation = [
  { href: "/dashboard/executive", label: "Executive", icon: BarChart3 },
  { href: "/dashboard/partner", label: "Partner", icon: Building2 },
  { href: "/dashboard/admin", label: "Admin", icon: ShieldCheck },
  { href: "/dashboard/field", label: "Field", icon: BriefcaseBusiness },
  { href: "/inventory", label: "Inventory", icon: PackageOpen },
] as const;
const recoveryNavigation = [
  { href: "/recovery/cases", label: "Recovery Cases", icon: HeartHandshake },
  { href: "/recovery/assignments", label: "Assignments", icon: ClipboardList },
] as const;

/** Keeps Inventory discoverability aligned with the verified `assets.read` claim. */
export function getDashboardNavigation(canViewInventory: boolean) {
  return navigation.filter((item) => item.href !== "/inventory" || canViewInventory);
}

function Navigation({
  canViewInventory,
  mobile = false,
}: {
  readonly canViewInventory: boolean;
  readonly mobile?: boolean;
}) {
  const pathname = usePathname();
  const renderLink = (item: (typeof navigation)[number] | (typeof recoveryNavigation)[number]) => {
    const active =
      pathname === item.href ||
      (item.href === "/recovery/cases" && pathname.startsWith("/recovery/cases/"));
    const Icon = item.icon;
    return (
      <Link
        className={cn(
          "flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-medium transition",
          active
            ? "bg-white text-slate-950 shadow-sm"
            : "text-slate-300 hover:bg-white/8 hover:text-white",
          mobile && "text-base",
        )}
        href={item.href as Route}
        key={item.href}
      >
        <Icon className={cn("size-[18px]", active ? "text-primary" : "text-slate-400")} />
        {item.label}
      </Link>
    );
  };
  return (
    <nav aria-label="เมนูหลัก" className="space-y-5 p-4">
      <div className="space-y-1">
        <p className="px-3 pb-1 text-[11px] font-semibold tracking-[0.16em] text-slate-400">
          DASHBOARDS
        </p>
        {getDashboardNavigation(canViewInventory).map(renderLink)}
      </div>
      <div className="space-y-1">
        <p className="px-3 pb-1 text-[11px] font-semibold tracking-[0.16em] text-slate-400">
          RECOVERY
        </p>
        {recoveryNavigation.map(renderLink)}
      </div>
    </nav>
  );
}
function SidebarContent({ canViewInventory }: { readonly canViewInventory: boolean }) {
  return (
    <div className="flex h-full flex-col bg-slate-950 text-white">
      <div className="flex h-20 items-center gap-3 px-6">
        <span className="grid size-11 place-items-center rounded-xl bg-primary text-lg font-bold shadow-button">
          P
        </span>
        <div>
          <p className="font-semibold tracking-[0.12em]">PAYSAVE</p>
          <p className="text-xs text-slate-400">Business Console</p>
        </div>
      </div>
      <Separator className="bg-white/10" />
      <Navigation canViewInventory={canViewInventory} />
      <div className="mt-auto p-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Live</span>
            <Badge
              className="border-emerald-300/20 bg-emerald-300/10 text-emerald-300"
              variant="neutral"
            >
              ONLINE
            </Badge>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-400">ไม่เชื่อม Supabase หรือ Database</p>
        </div>
      </div>
    </div>
  );
}

/** Submits the real Supabase sign-out action so cookies are cleared before returning to sign-in. */
export function DashboardSignOutForm() {
  return (
    <form action={signOutAction} className="w-full">
      <button className="flex w-full items-center gap-2 text-danger" type="submit">
        <LogOut className="size-4" />
        ออกจากระบบ
      </button>
    </form>
  );
}

export function DashboardShell({
  canViewInventory = false,
  children,
}: {
  readonly canViewInventory?: boolean;
  readonly children: ReactNode;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 lg:block">
        <SidebarContent canViewInventory={canViewInventory} />
      </aside>
      <div className="min-h-screen lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-border/80 bg-surface/88 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-2 px-4 sm:px-6 lg:px-8">
            <Sheet>
              <SheetTrigger asChild>
                <Button aria-label="เปิดเมนู" className="lg:hidden" size="icon" variant="ghost">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent className="p-0" side="left">
                <SheetTitle className="sr-only">เมนูหลัก</SheetTitle>
                <SheetDescription className="sr-only">เลือก Dashboard</SheetDescription>
                <SidebarContent canViewInventory={canViewInventory} />
              </SheetContent>
            </Sheet>
            <div>
              <p className="text-sm font-semibold">Operations Overview</p>
              <p className="hidden text-xs text-muted-foreground sm:block">
                Live Supabase · Real data
              </p>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <Button
                aria-label="สลับธีม"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                size="icon"
                variant="ghost"
              >
                {resolvedTheme === "dark" ? (
                  <Sun className="size-[18px]" />
                ) : (
                  <Moon className="size-[18px]" />
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    aria-label="เปิดการแจ้งเตือน"
                    className="relative"
                    size="icon"
                    variant="ghost"
                  >
                    <Bell className="size-[18px]" />
                    <span className="absolute top-2 right-2 size-2 rounded-full bg-danger ring-2 ring-surface" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[min(22rem,calc(100vw-2rem))]">
                  <DropdownMenuLabel className="flex items-center justify-between normal-case">
                    <span>Notification Center</span>
                    <Badge variant="neutral">Live</Badge>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="items-start py-3">
                    <span className="mt-1 size-2 rounded-full bg-primary" />
                    <span>
                      <b className="block">KPI รอบเช้าพร้อมแล้ว</b>
                      <small className="text-muted-foreground">อัปเดตจาก Supabase</small>
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="items-start py-3">
                    <span className="mt-1 size-2 rounded-full bg-success" />
                    <span>
                      <b className="block">ระบบทำงานปกติ</b>
                      <small className="text-muted-foreground">ไม่มีการเชื่อมต่อภายนอก</small>
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Separator className="mx-1 hidden h-7 sm:block" orientation="vertical" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="h-11 gap-2 px-1.5 sm:pr-3" variant="ghost">
                    <Avatar className="size-8">
                      <AvatarFallback>BB</AvatarFallback>
                    </Avatar>
                    <span className="hidden text-left sm:block">
                      <b className="block max-w-28 truncate text-sm">BB Admin</b>
                      <small className="text-muted-foreground">Demo workspace</small>
                    </span>
                    <ChevronDown className="hidden size-4 sm:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel className="normal-case">
                    <b className="block">BB Admin</b>
                    <small className="font-normal text-muted-foreground">demo@paysave.local</small>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <UserRound className="size-4" />
                    โปรไฟล์ตัวอย่าง
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <DashboardSignOutForm />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
