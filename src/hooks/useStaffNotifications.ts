import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Order = Tables<'orders'>;
type Complaint = Tables<'complaints'>;

interface Notification {
  id: string;
  type: 'new_order' | 'order_ready' | 'new_complaint' | 'complaint_critical';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: {
    orderId?: string;
    orderNumber?: string;
    complaintId?: string;
    complaintNumber?: string;
    roomNumber?: string;
  };
}

export function useStaffNotifications() {
  const { isStaff, hasRole } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playNotificationSound = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleF4OQ5vU0qmDPQo8ltHSqJBNGDyT0NKqlFkfPZHO0aqbZCs8j87RqaVzPUGNzNGorIMmOovL0aq3mTU4iMvQq9KnSjKFytCt3bZfL4LK0K7ttXYri8rQr+a1ijOFzNGw3rKYQoPN0bHRrKVNgc7SsdCrr1p/z9Kyz6yzZ33Q0rPOq7dze9HSs86qunN50tO0zam6cnfT07XMqLtwddTTtsyou3B109O2zKi7b3PV1LfLqLxvcdXUt8uovHBw1tS4y6i8cW7W1LjLqLxxbdfVucqovHJr19W5yqi8cmrY1brJqL1zadnVusiovXNp2dW7yKi9c2ja1bvHqL10adrWu8eovXRo2ta8x6i9dGja1rzHqL10aNrWvMeovXRo2ta8x6i9dGja1rzHqL10aNrWvMeovXRo2ta8xqi9dWjb17zGp712Z9vXvMWnvnZn29e8xae+dmfb17zFp752Z9vXvMWnvnZn29e8xae+dmfb17zFp752Z9vXvMWnvnZn29e8xae+dmfb17zFp752Z9vXvMWnvnZn29e9xae+dmbb173Fpr93Ztzavsenw3pj3dzQqMd/X9vp0KnIfVvb79Cqy4Ba2fTRq8x/WNf60azNf1fW/9Ktzn9W1QDTrtB/VNMC1K/Rf1LSBNS00n9Q0QTUtNJ/UNEE1LTSf1DRBNS00n9Q0QTUtNJ/UNEE1LTSf1DRBNS00n9Q0QTUtNJ/UNEE1LTSf1DRBNS00n9Q0QTUtNJ/UNEE1LTSf1DRBNS00n9Q0QTUtNJ/UNEE1LTSf1DRBNS00n9Q0QTUtNJ/UNEE1LTSf1DRBNS00n9Q0QTUtNJ/UNEE1LTSf1DQ');
    }
    audioRef.current.play().catch(() => {});
  }, []);

  const addNotification = useCallback((notif: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: Notification = {
      ...notif,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      read: false,
    };

    setNotifications(prev => [newNotif, ...prev].slice(0, 50));
    setUnreadCount(prev => prev + 1);
    playNotificationSound();

    toast({
      title: notif.title,
      description: notif.message,
    });
  }, [toast, playNotificationSound]);

  useEffect(() => {
    if (!isStaff) return;

    // Listen for new orders
    const ordersChannel = supabase
      .channel('staff-orders-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const order = payload.new as Order;
          addNotification({
            type: 'new_order',
            title: 'New Order',
            message: `Order #${order.order_number} from Room ${order.room_id?.slice(0, 8) || 'N/A'}`,
            data: { orderId: order.id, orderNumber: order.order_number },
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          const order = payload.new as Order;
          const oldOrder = payload.old as Order;
          
          if (order.status === 'ready' && oldOrder.status !== 'ready') {
            addNotification({
              type: 'order_ready',
              title: 'Order Ready',
              message: `Order #${order.order_number} is ready for pickup`,
              data: { orderId: order.id, orderNumber: order.order_number },
            });
          }
        }
      )
      .subscribe();

    // Listen for complaints (for managers)
    const complaintsChannel = supabase
      .channel('staff-complaints-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'complaints' },
        (payload) => {
          const complaint = payload.new as Complaint;
          
          if (complaint.priority === 'critical') {
            addNotification({
              type: 'complaint_critical',
              title: '⚠️ Critical Complaint',
              message: `${complaint.complaint_number}: ${complaint.description.slice(0, 50)}...`,
              data: { complaintId: complaint.id, complaintNumber: complaint.complaint_number },
            });
          } else {
            addNotification({
              type: 'new_complaint',
              title: 'New Complaint',
              message: `${complaint.complaint_number}: ${complaint.category}`,
              data: { complaintId: complaint.id, complaintNumber: complaint.complaint_number },
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(complaintsChannel);
    };
  }, [isStaff, addNotification]);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  };
}
