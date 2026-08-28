'use server';

import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

async function checkAuth() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error('Non authentifié');
  }

  return session.user;
}

export async function getUserNotificationsAction() {
  try {
    const user = await checkAuth();

    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, read: false },
    });

    return {
      success: true,
      notifications,
      unreadCount,
    };
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return { success: false, error: error.message, notifications: [], unreadCount: 0 };
  }
}

export async function markNotificationAsReadAction(id: string) {
  try {
    const user = await checkAuth();

    await prisma.notification.updateMany({
      where: { id, userId: user.id },
      data: { read: true },
    });

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    return { success: false, error: error.message };
  }
}

export async function markAllNotificationsAsReadAction() {
  try {
    const user = await checkAuth();

    await prisma.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    return { success: false, error: error.message };
  }
}
