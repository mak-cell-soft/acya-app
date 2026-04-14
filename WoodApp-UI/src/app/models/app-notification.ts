export enum NotificationType {
  Info = 0,
  Success = 1,
  Warning = 2,
  Error = 3,
  Email = 4
}

export enum NotificationPriority {
  Low = 0,
  Normal = 1,
  High = 2,
  Urgent = 3
}

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  targetUserId?: number;
  targetRole?: string;
  targetSiteId?: number;
  isRead: boolean;
  createdAt: Date;
  viewedAt?: Date;
  relatedEntityId?: string;
  relatedEntityType?: string;
  emailRecipient?: string;
  emailSent?: boolean;
}
