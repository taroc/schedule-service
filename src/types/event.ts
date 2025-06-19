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
  
  // 期間指定フィールド（必須）
  periodStart: Date;            // 期間開始
  periodEnd: Date;              // 期間終了
  reservationStatus: ReservationStatus; // 予約ステータス
}

export type EventStatus = 'open' | 'matched' | 'cancelled' | 'expired';

export type ReservationStatus = 'open' | 'tentative' | 'confirmed' | 'expired';

export interface CreateEventRequest {
  name: string;
  description: string;
  requiredParticipants: number;
  requiredDays: number;
  deadline?: Date;
  
  // 期間指定フィールド（必須）
  periodStart: Date;           // 期間開始
  periodEnd: Date;             // 期間終了
}

export interface UpdateEventRequest {
  name?: string;
  description?: string;
  requiredParticipants?: number;
  requiredDays?: number;
  deadline?: Date;
  
  // 期間指定フィールド
  periodStart?: Date;
  periodEnd?: Date;
}

export interface EventParticipation {
  eventId: string;
  userId: string;
  joinedAt: Date;
}

// EventWithCreator is now equivalent to Event since user names are not stored
export type EventWithCreator = Event;

// API レスポンス用の型（Date型が文字列として返される）
export interface EventResponse {
  id: string;
  name: string;
  description: string;
  requiredParticipants: number;
  requiredDays: number;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
  status: EventStatus;
  participants: string[];
  matchedDates?: string[];
  deadline?: string | null;
  periodStart: string;
  periodEnd: string;
  reservationStatus: ReservationStatus;
}