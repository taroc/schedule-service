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
  
  // 🟢 Green Phase: 参加者選択戦略設定
  participantSelectionStrategy: ParticipantSelectionStrategy; // 参加者選択戦略
  minParticipants: number;                  // 最小人数
  maxParticipants?: number;                 // 最大人数（無制限の場合はundefined）
  optimalParticipants?: number;             // 理想人数
  selectionDeadline?: Date;                 // 手動選択の締切
  lotterySeed?: number;                     // 抽選用シード値
  
  // 🔴 Red Phase: 成立条件詳細設定
  allowPartialMatching: boolean;            // 部分成立許可
  minimumTimeSlots?: number;                // 部分成立時の最低コマ数
  suggestMultipleOptions: boolean;          // 複数候補提示
  maxSuggestions?: number;                  // 最大候補数
  preferredDates?: string[];                // 優先日程（ISO文字列配列）
  dateWeights?: Record<string, number>;     // 日程別重み（日付文字列 → スコア）
  requireAllParticipants: boolean;          // 全参加者合意必須
  fallbackStrategy?: FallbackStrategy;      // 代替戦略
}

export type EventStatus = 'open' | 'matched' | 'cancelled' | 'expired';

export type ReservationStatus = 'open' | 'tentative' | 'confirmed' | 'expired';

// 🟢 Green Phase: マッチング戦略関連の型定義
export type MatchingStrategy = 'consecutive' | 'flexible';
export type TimeSlotRestriction = 'both' | 'daytime_only' | 'evening_only';

// 🟢 Green Phase: 参加者選択戦略関連の型定義
export type ParticipantSelectionStrategy = 'first_come' | 'lottery' | 'manual';

// 🔴 Red Phase: 成立条件詳細設定関連の型定義
export type FallbackStrategy = 'lower_requirements' | 'extend_period' | 'split_event' | 'cancel';

export interface DateWeight {
  date: string;    // ISO date string
  weight: number;  // 1.0 = normal, >1.0 = preferred, <1.0 = avoided
}

export interface MatchingSuggestion {
  timeSlots: { date: Date; timeSlot: 'daytime' | 'evening' }[];
  participants: string[];
  score: number;
  completeness: number; // 0.0-1.0 (要求に対する充足率)
}

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
  
  // 🟢 Green Phase: 参加者選択戦略設定（オプション）
  participantSelectionStrategy?: ParticipantSelectionStrategy; // 参加者選択戦略
  minParticipants?: number;                 // 最小人数
  maxParticipants?: number;                 // 最大人数
  optimalParticipants?: number;             // 理想人数
  selectionDeadline?: Date;                 // 手動選択の締切
  lotterySeed?: number;                     // 抽選用シード値
  
  // 🔴 Red Phase: 成立条件詳細設定（オプション）
  allowPartialMatching?: boolean;           // 部分成立許可
  minimumTimeSlots?: number;                // 部分成立時の最低コマ数
  suggestMultipleOptions?: boolean;         // 複数候補提示
  maxSuggestions?: number;                  // 最大候補数
  preferredDates?: string[];                // 優先日程（ISO文字列配列）
  dateWeights?: Record<string, number>;     // 日程別重み（日付文字列 → スコア）
  requireAllParticipants?: boolean;         // 全参加者合意必須
  fallbackStrategy?: FallbackStrategy;      // 代替戦略
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
  
  // 🟢 Green Phase: 参加者選択戦略設定
  participantSelectionStrategy?: ParticipantSelectionStrategy;
  minParticipants?: number;
  maxParticipants?: number;
  optimalParticipants?: number;
  selectionDeadline?: Date;
  lotterySeed?: number;
  
  // 🔴 Red Phase: 成立条件詳細設定
  allowPartialMatching?: boolean;
  minimumTimeSlots?: number;
  suggestMultipleOptions?: boolean;
  maxSuggestions?: number;
  preferredDates?: string[];
  dateWeights?: Record<string, number>;
  requireAllParticipants?: boolean;
  fallbackStrategy?: FallbackStrategy;
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
  
  // 🟢 Green Phase: 参加者選択戦略設定
  participantSelectionStrategy: ParticipantSelectionStrategy;
  minParticipants: number;
  maxParticipants?: number;
  optimalParticipants?: number;
  selectionDeadline?: string; // API レスポンスではstring
  lotterySeed?: number;
  
  // 🔴 Red Phase: 成立条件詳細設定
  allowPartialMatching: boolean;
  minimumTimeSlots?: number;
  suggestMultipleOptions: boolean;
  maxSuggestions?: number;
  preferredDates?: string[];
  dateWeights?: Record<string, number>;
  requireAllParticipants: boolean;
  fallbackStrategy?: FallbackStrategy;
}