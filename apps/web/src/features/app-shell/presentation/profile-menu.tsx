"use client";

import {
  Avatar,
  AvatarFallback,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@paysave/ui";
import { LogOut, Settings, UserRound } from "lucide-react";
import { signOutAction } from "@/features/auth/actions";

export interface AppProfile {
  readonly name: string;
  readonly email: string;
  readonly initials: string;
  readonly roleLabel: string;
}
interface ProfileMenuProps {
  readonly profile: AppProfile;
}

/** Renders profile identity, settings shortcuts and secure sign-out action. */
export function ProfileMenu({ profile }: ProfileMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label="เปิดเมนูโปรไฟล์" className="h-11 gap-2 px-1.5 sm:pr-3" variant="ghost">
          <Avatar className="size-8">
            <AvatarFallback>{profile.initials}</AvatarFallback>
          </Avatar>
          <span className="hidden text-left sm:block">
            <span className="block max-w-32 truncate text-sm font-semibold">{profile.name}</span>
            <span className="block text-[11px] text-muted-foreground">{profile.roleLabel}</span>
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="tracking-normal normal-case">
          <span className="block truncate text-sm text-foreground">{profile.name}</span>
          <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">
            {profile.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <UserRound className="size-4" />
          โปรไฟล์
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings className="size-4" />
          ตั้งค่า
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={signOutAction}>
          <DropdownMenuItem asChild>
            <button className="w-full text-danger" type="submit">
              <LogOut className="size-4" />
              ออกจากระบบ
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
