import axiosInstance from './axiosInstance';

const NOTIFICATIONS = '/notifications';

const notificationApi = {
  getNotifications: (params) => axiosInstance.get(NOTIFICATIONS, { params }),
  getUnreadCount: () => axiosInstance.get(`${NOTIFICATIONS}/unread-count`),
  markAsRead: (id) => axiosInstance.patch(`${NOTIFICATIONS}/${id}/read`),
  markAllAsRead: () => axiosInstance.patch(`${NOTIFICATIONS}/read-all`),
};

export default notificationApi;
