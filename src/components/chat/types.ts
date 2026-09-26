export type ClientMeta =
  | { custom: boolean; name?: string }
  | {
      platform?: string;
      pageUrl?: string;
      previewAvailable?: boolean;
      title?: string;
      thumbnail?: string;
      embedUrl?: string | null;
    }
  | null;

export type ClientMessage = {
  id: string;
  type: string;
  body: string | null;
  mediaUrl: string | null;
  mediaMime: string | null;
  mediaName: string | null;
  mediaDuration: number | null;
  meta: string | null;
  workId: string | null;
  createdAt: string;
  sender: {
    id: string;
    username: string;
    displayName: string | null;
    profile: { avatarUrl: string | null } | null;
  };
  work: {
    id: string;
    title: string;
    type: string;
    coverUrl: string | null;
    year: number | null;
    status: string;
    rating: number | null;
  } | null;
  seenCount: number;
  mine: boolean;
  metaParsed: ClientMeta;
};

export type ClientConversation = {
  id: string;
  type: "DIRECT" | "GROUP";
  name: string | null;
  otherUser: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
  memberCount: number;
  groupName: string | null;
  unreadCount: number;
  lastMessage: {
    id: string;
    type: string;
    preview: string;
    sender: string;
    createdAt: string;
  } | null;
  updatedAt: string;
};

export type ClientRoom = {
  id: string;
  type: "DIRECT" | "GROUP";
  name: string | null;
  members: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  }[];
};

export function formatClock(dateInput: string | Date): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateSeparator(dateInput: string | Date): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const today = new Date();
  const sameDay =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
  if (sameDay) return "Hoje";

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const sameYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();
  if (sameYesterday) return "Ontem";

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDuration(seconds: number | null | undefined): string {
  const value = Math.round(seconds ?? 0);
  if (!Number.isFinite(value) || value < 0) return "0:00";
  const minutes = Math.floor(value / 60);
  const rest = String(value % 60).padStart(2, "0");
  return `${minutes}:${rest}`;
}