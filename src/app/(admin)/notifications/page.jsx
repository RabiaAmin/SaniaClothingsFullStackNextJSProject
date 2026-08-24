'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, Check, CheckCheck } from 'lucide-react';
import EmptyState from '@/components/admin/EmptyState';
import PageHeader from '@/components/admin/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useNotifications,
} from '@/hooks/useNotifications';
import { notificationTarget, notificationTypeLabel } from '@/lib/notifications';
import { formatRelativeTime } from '@/lib/utils/formatters';

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { data, isLoading, error } = useNotifications({ page, limit: 20, unreadOnly });
  const markRead = useMarkNotificationAsRead();
  const markAllRead = useMarkAllNotificationsAsRead();
  const notifications = data?.notifications ?? [];

  function changeFilter(nextUnreadOnly) {
    setUnreadOnly(nextUnreadOnly);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Production submissions and review updates"
        action={
          <Button
            variant="outline"
            disabled={markAllRead.isPending}
            onClick={() => markAllRead.mutate()}
          >
            <CheckCheck className="h-4 w-4" /> Mark all as read
          </Button>
        }
      />

      <div className="flex gap-2">
        <Button
          size="sm"
          variant={unreadOnly ? 'outline' : 'default'}
          onClick={() => changeFilter(false)}
        >
          All
        </Button>
        <Button
          size="sm"
          variant={unreadOnly ? 'default' : 'outline'}
          onClick={() => changeFilter(true)}
        >
          Unread
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-20 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : error ? (
            <p className="p-6 text-sm text-destructive">{error.message}</p>
          ) : notifications.length === 0 ? (
            <EmptyState
              icon={Bell}
              title={unreadOnly ? 'No unread notifications' : 'No notifications yet'}
              description="Production activity notifications will appear here."
              className="m-6"
            />
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`flex items-start gap-4 p-4 ${notification.isRead ? '' : 'bg-primary/5'}`}
                >
                  <span
                    className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${notification.isRead ? 'bg-muted' : 'bg-primary'}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={notification.isRead ? 'secondary' : 'default'}>
                        {notificationTypeLabel(notification.type)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(notification.createdAt)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm">{notification.message}</p>
                    {notification.productionOrder?.poNumber && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {notification.productionOrder.poNumber} ·{' '}
                        {notification.productionOrder.productionDescription}
                      </p>
                    )}
                    <Button asChild variant="link" size="sm" className="mt-1 h-auto p-0">
                      <Link
                        href={notificationTarget(notification)}
                        onClick={() => !notification.isRead && markRead.mutate(notification._id)}
                      >
                        View related production
                      </Link>
                    </Button>
                  </div>
                  {!notification.isRead && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Mark notification as read"
                      disabled={markRead.isPending}
                      onClick={() => markRead.mutate(notification._id)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {(data?.totalPages ?? 1) > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
