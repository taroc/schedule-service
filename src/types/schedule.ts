// 時間帯の種類
export type TimeSlot = 'daytime' | 'evening' | 'fullday';

// 時間帯別の空き状況
export interface TimeSlotAvailability {
  daytime: boolean;    // 昼の空き状況
  evening: boolean;    // 夜の空き状況
  fullday: boolean;    // 一日中の空き状況
}

export interface UserSchedule {
  id: string;
  userId: string;
  date: Date;
  timeSlots: TimeSlotAvailability;
  createdAt: Date;
  updatedAt: Date;
}

// 複数日の空き時間一括登録用
export interface BulkAvailabilityRequest {
  dates: string[];  // ISO string format dates
  timeSlots: TimeSlotAvailability;  // 指定した時間帯を空きとして登録
}

export interface ScheduleCalendarDay {
  date: Date;
  timeSlots: TimeSlotAvailability | null;  // null means not set (defaults to all busy)
  hasSchedule: boolean;
  isSelected?: boolean;  // 複数選択用
}

export interface ScheduleCalendarMonth {
  year: number;
  month: number;
  days: ScheduleCalendarDay[];
}