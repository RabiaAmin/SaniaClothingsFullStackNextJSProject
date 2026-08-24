'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import notificationApi from '@/lib/api/notification.api';

export const NOTIFICATION_KEYS = {
  all: ['notifications'],
  list: (params) => ['notifications', 'list', params ?? {}],
  unreadCount: ['notifications', 'unread-count'],
};

export function useNotifications(params, options = {}) {
  return useQuery({
    queryKey: NOTIFICATION_KEYS.list(params),
    queryFn: () => notificationApi.getNotifications(params).then((response) => response.data),
    enabled: options.enabled ?? true,
    refetchInterval: options.refetchInterval,
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: NOTIFICATION_KEYS.unreadCount,
    queryFn: () => notificationApi.getUnreadCount().then((response) => response.data),
    refetchInterval: 30_000,
  });
}

function invalidateNotifications(queryClient) {
  return queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => notificationApi.markAsRead(id).then((response) => response.data),
    onSuccess: () => invalidateNotifications(queryClient),
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationApi.markAllAsRead().then((response) => response.data),
    onSuccess: () => invalidateNotifications(queryClient),
  });
}
