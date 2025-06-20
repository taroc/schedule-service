// 時間帯の種類
export type TimeSlot = 'daytime' | 'evening';

// 時間帯別の空き状況
export interface TimeSlotAvailability {
  daytime: boolean;    // 昼の空き状況
  evening: boolean;    // 夜の空き状況
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
  matchedDates?: Date[];
  creatorId: string;
  createdAt: Date;
  updatedAt: Date;
  deadline?: Date | null;
  periodStart: Date;
  periodEnd: Date;
  requiredParticipants: number;
  requiredDays: number;
  reservationStatus: string;
}

export interface ScheduleCalendarMonth {
  year: number;
  month: number;
  days: ScheduleCalendarDay[];
}