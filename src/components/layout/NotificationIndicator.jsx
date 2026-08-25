'use client';

import Link from 'next/link';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useNotifications,
  useUnreadNotificationCount,
} from '@/hooks/useNotifications';
import { notificationTarget, notificationTypeLabel } from '@/lib/notifications';
import { formatRelativeTime } from '@/lib/utils/formatters';

export default function NotificationIndicator() {
  const { data: countData } = useUnreadNotificationCount();
  const { data, isLoading, error } = useNotifications(
    { page: 1, limit: 5 },
    { refetchInterval: 60_000 }
  );
  const markRead = useMarkNotificationAsRead();
  const markAllRead = useMarkAllNotificationsAsRead();
  const unreadCount = countData?.unreadCount ?? 0;
  const notifications = data?.notifications ?? [];

  function handleNotification(notification) {
    if (!notification.isRead) markRead.mutate(notification._id);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative rounded-lg p-2 text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground"
          aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-4 text-destructive-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-0">
        <DropdownMenuLabel className="flex items-center justify-between px-3 py-2">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={markAllRead.isPending}
              onClick={(event) => {
                event.preventDefault();
                markAllRead.mutate();
              }}
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading notifications
          </div>
        ) : error ? (
          <p className="p-4 text-sm text-destructive">Could not load notifications</p>
        ) : notifications.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            <Bell className="mx-auto mb-2 h-5 w-5" /> No notifications yet
          </div>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem key={notification._id} asChild className="rounded-none p-0">
              <Link
                href={notificationTarget(notification)}
                className="flex cursor-pointer items-start gap-3 px-3 py-3"
                onClick={() => handleNotification(notification)}
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.isRead ? 'bg-muted' : 'bg-primary'}`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium text-muted-foreground">
                    {notificationTypeLabel(notification.type)}
                  </span>
                  <span className="mt-0.5 block text-sm leading-snug">{notification.message}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {formatRelativeTime(notification.createdAt)}
                  </span>
                </span>
              </Link>
            </DropdownMenuItem>
          ))
        )}

        <DropdownMenuSeparator className="m-0" />
        <DropdownMenuItem asChild className="rounded-none p-0">
          <Link
            href="/notifications"
            className="flex cursor-pointer justify-center px-3 py-2 text-sm font-medium"
          >
            View all notifications
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
