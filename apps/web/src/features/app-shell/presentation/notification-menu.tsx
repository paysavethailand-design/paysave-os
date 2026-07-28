"use client";

import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@paysave/ui";
import { Bell } from "lucide-react";

export interface AppNotification {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
  readonly unread: boolean;
}

interface NotificationMenuProps {
  readonly notifications: readonly AppNotification[];
}

/** Renders a keyboard-accessible notification summary using mock or supplied data. */
export function NotificationMenu({ notifications }: NotificationMenuProps) {
  const unreadCount = notifications.filter((item) => item.unread).length;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`การแจ้งเตือนที่ยังไม่อ่าน ${unreadCount} รายการ`}
          className="relative"
          size="icon"
          variant="ghost"
        >
          <Bell className="size-[18px]" />
          {unreadCount > 0 ? (
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-danger ring-2 ring-surface" />
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(22rem,calc(100vw-2rem))]">
        <DropdownMenuLabel className="flex items-center justify-between tracking-normal text-foreground normal-case">
          <span className="text-sm">การแจ้งเตือน</span>
          <Badge variant="neutral">ข้อมูลตัวอย่าง</Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.map((item) => (
          <DropdownMenuItem className="items-start py-3" key={item.id}>
            <span
              className={
                item.unread
                  ? "mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                  : "mt-1.5 size-2 shrink-0 rounded-full bg-transparent"
              }
            />
            <span>
              <span className="block font-medium">{item.title}</span>
              <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                {item.detail}
              </span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
