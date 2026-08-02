export type AdminMetricFormat = 'number' | 'currency' | 'percent';

export interface AdminMetric {
  id: string;
  label: string;
  value: number | null;
  previous: number | null;
  changePercent: number | null;
  format: AdminMetricFormat;
  explanation: string;
  status: 'available' | 'unavailable';
}

export interface AdminPeriodSelection {
  period: string;
  start?: string;
  end?: string;
}

export interface AdminSeriesPoint {
  date: string;
  value: number;
}

export interface AdminOverview {
  period: { key: string; start: string; end: string; previousStart: string; previousEnd: string };
  instrumentation: { activityAvailableSince: string; payments: boolean; paymentsReason: string };
  metrics: AdminMetric[];
  subscriptionStatus: Record<string, number>;
  resources: { flashcards: number; mentalMaps: number; quizzes: number; reviews: number };
  userGrowth: AdminSeriesPoint[];
}

export interface AdminUserListItem {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  accountStatus: string;
  createdAt: string;
  lastLoginAt: string | null;
  plan: string;
  subscriptionStatus: string;
  studySets: number;
  flashcards: number;
  mentalMaps: number;
  quizzes: number;
  reviews: number;
  sessions: number;
  progressPercentage: number;
}

export interface AdminPaginatedUsers {
  page: number;
  pageSize: number;
  total: number;
  users: AdminUserListItem[];
}

export interface AdminSubscriptionItem {
  id: string;
  userId: string;
  userName: string;
  email: string;
  planName: string;
  amount: number;
  currency: string;
  status: string;
  externalId: string | null;
  startedAt: string | null;
  nextPaymentAt: string | null;
  cancelledAt: string | null;
  updatedAt: string;
}

export interface AdminPaginatedSubscriptions {
  page: number;
  pageSize: number;
  total: number;
  subscriptions: AdminSubscriptionItem[];
}

export interface AdminUserDetail {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  accountStatus: string;
  stats: Record<string, number>;
  subscription: null | {
    id: string;
    status: string;
    planName: string;
    amount: number;
    currency: string;
    externalId: string | null;
    startedAt: string | null;
    nextPaymentAt: string | null;
    cancelledAt: string | null;
  };
  payments: { available: boolean; reason: string };
  activity: Array<{
    type: string;
    resourceType: string | null;
    resourceId: string | null;
    metadata: unknown;
    createdAt: string;
  }>;
}

export interface AdminErrorItem {
  id: string;
  category: string;
  message: string;
  page: string | null;
  userId: string | null;
  browser: string | null;
  device: string | null;
  status: string;
  occurrences: number;
  firstOccurredAt: string;
  lastOccurredAt: string;
  details: unknown;
}
