export interface Event {
  id: string;
  name: string;
  description: string;
  requiredParticipants: number;  // 必要人数
  requiredDays: number;          // 必要日数
  creatorId: string;
  createdAt: Date;
  updatedAt: Date;
  status: EventStatus;
  participants: string[];        // 参加者ID配列
  matchedDates?: Date[];         // 成立した日程
}

export type EventStatus = 'open' | 'matched' | 'cancelled';

export interface CreateEventRequest {
  name: string;
  description: string;
  requiredParticipants: number;
  requiredDays: number;
}

export interface UpdateEventRequest {
  name?: string;
  description?: string;
  requiredParticipants?: number;
  requiredDays?: number;
}

export interface EventParticipation {
  eventId: string;
  userId: string;
  joinedAt: Date;
}

export interface EventWithCreator extends Event {
  creatorName: string;
}