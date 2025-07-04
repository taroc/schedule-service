export interface Event {
  id: string;
  name: string;
  description: string;
  requiredParticipants: number;  // 必要人数
  requiredTimeSlots: number;     // 必要コマ数
  creatorId: string;
  createdAt: Date;
  updatedAt: Date;
  status: EventStatus;
  participants: string[];        // 参加者ID配列
  matchedTimeSlots?: { date: Date; timeSlot: 'daytime' | 'evening' }[]; // 成立した時間帯
  deadline: Date;                // 参加締切
  
  // 期間指定フィールド（必須）
  periodStart: Date;            // 期間開始
  periodEnd: Date;              // 期間終了
  reservationStatus: ReservationStatus; // 予約ステータス
  
  // 🟢 Green Phase: マッチング戦略設定
  matchingStrategy: MatchingStrategy;      // マッチング戦略
  timeSlotRestriction: TimeSlotRestriction; // 時間帯制限
  minimumConsecutive: number;               // 最低連続コマ数
}

export type EventStatus = 'open' | 'matched' | 'cancelled' | 'expired';

export type ReservationStatus = 'open' | 'tentative' | 'confirmed' | 'expired';

// 🟢 Green Phase: マッチング戦略関連の型定義
export type MatchingStrategy = 'consecutive' | 'flexible';
export type TimeSlotRestriction = 'both' | 'daytime_only' | 'evening_only';

export interface CreateEventRequest {
  name: string;
  description: string;
  requiredParticipants: number;
  requiredTimeSlots: number;     // 必要コマ数
  deadline: Date;
  
  // 期間指定フィールド（必須）
  periodStart: Date;           // 期間開始
  periodEnd: Date;             // 期間終了
  
  // 🟢 Green Phase: マッチング戦略設定（オプション）
  matchingStrategy?: MatchingStrategy;      // マッチング戦略
  timeSlotRestriction?: TimeSlotRestriction; // 時間帯制限
  minimumConsecutive?: number;               // 最低連続コマ数
}

export interface UpdateEventRequest {
  name?: string;
  description?: string;
  requiredParticipants?: number;
  requiredTimeSlots?: number;    // 必要コマ数
  deadline?: Date;
  
  // 期間指定フィールド
  periodStart?: Date;
  periodEnd?: Date;
  
  // 🟢 Green Phase: マッチング戦略設定
  matchingStrategy?: MatchingStrategy;
  timeSlotRestriction?: TimeSlotRestriction;
  minimumConsecutive?: number;
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
  requiredTimeSlots: number;     // 必要コマ数
  creatorId: string;
  createdAt: string;
  updatedAt: string;
  status: EventStatus;
  participants: string[];
  matchedTimeSlots?: { date: string; timeSlot: 'daytime' | 'evening' }[]; // 成立した時間帯
  deadline: string;
  periodStart: string;
  periodEnd: string;
  reservationStatus: ReservationStatus;
  
  // 🟢 Green Phase: マッチング戦略設定
  matchingStrategy: MatchingStrategy;
  timeSlotRestriction: TimeSlotRestriction;
  minimumConsecutive: number;
}