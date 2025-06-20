// 時間帯の種類
export type TimeSlot = 'daytime' | 'evening';

// 時間帯別の空き状況
export interface TimeSlotAvailability {
  daytime: boolean;    // 昼の空き状況
  evening: boolean;    // 夜の空き状況
}

// 日付と時間帯の組み合わせ（マッチング単位）
export interface TimeSlotWithDate {
  date: Date;
  timeSlot: TimeSlot;
}

// マッチング結果（時間帯情報を含む）
export interface MatchingTimeSlot {
  date: Date;
  timeSlot: TimeSlot;
}

export interface UserSchedule {
  id: string;
  userId: string;
  date: Date;
  timeSlots: TimeSlotAvailability;
  createdAt: Date;
  updatedAt: Date;
}

// 削除済み - 新しいシンプルな型定義に置き換える予定

export interface ScheduleCalendarDay {
  date: Date;
  timeSlots: TimeSlotAvailability | null;  // null means not set (defaults to all busy)
  hasSchedule: boolean;
  isSelected?: boolean;  // 複数選択用
  matchedEvents?: MatchedEventInfo[];  // 成立したイベント情報
}

export interface MatchedEventInfo {
  id: string;
  name: string;
  participantCount: number;
  isCreator: boolean;
}

export interface MatchedEvent {
  id: string;
  name: string;
  description: string;
  status: 'matched';
  participants: string[];
  matchedDates?: Date[]; // 後方互換性のため保持
  matchedTimeSlots?: MatchingTimeSlot[]; // 時間帯形式
  creatorId: string;
  createdAt: Date;
  updatedAt: Date;
  deadline?: Date | null;
  periodStart: Date;
  periodEnd: Date;
  requiredParticipants: number;
  requiredDays: number; // 後方互換性のため保持
  requiredTimeSlots: number; // 必要コマ数
  reservationStatus: string;
}

export interface ScheduleCalendarMonth {
  year: number;
  month: number;
  days: ScheduleCalendarDay[];
}