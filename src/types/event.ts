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
  deadline?: Date;               // 参加締切
}

export type EventStatus = 'open' | 'matched' | 'cancelled' | 'expired';

export interface CreateEventRequest {
  name: string;
  description: string;
  requiredParticipants: number;
  requiredDays: number;
  deadline?: Date;
}

export interface UpdateEventRequest {
  name?: string;
  description?: string;
  requiredParticipants?: number;
  requiredDays?: number;
  deadline?: Date;
}

export interface EventParticipation {
  eventId: string;
  userId: string;
  joinedAt: Date;
}

// EventWithCreator is now equivalent to Event since user names are not stored
export type EventWithCreator = Event;