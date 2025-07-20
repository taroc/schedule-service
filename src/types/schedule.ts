// 時間帯の種類（夜3時間、終日10時間）
export type TimeSlot = 'evening' | 'fullday';

// 時間帯別の空き状況
export interface TimeSlotAvailability {
  evening: boolean;    // 夜の空き状況（3時間）
  fullday: boolean;    // 終日の空き状況（10時間）
}

// 時間帯の時間数を取得する関数
export function getTimeSlotHours(timeSlot: TimeSlot): number {
  switch (timeSlot) {
    case 'evening':
      return 3;
    case 'fullday':
      return 10;
    default:
      throw new Error(`Unknown time slot: ${timeSlot}`);
  }
}

// TimeSlotの妥当性チェック関数
export function isValidTimeSlot(value: string): value is TimeSlot {
  return value === 'evening' || value === 'fullday';
}

// TimeSlotAvailabilityの妥当性チェック関数（同時選択防止）
export function isValidTimeSlotAvailability(availability: TimeSlotAvailability): boolean {
  // 夜と終日は同時に選択できない
  return !(availability.evening && availability.fullday);
}

// TimeSlotAvailabilityを正規化（両方trueの場合はfulldayを優先）
export function normalizeTimeSlotAvailability(availability: TimeSlotAvailability): TimeSlotAvailability {
  if (availability.evening && availability.fullday) {
    // 両方trueの場合は終日を優先
    return { evening: false, fullday: true };
  }
  return availability;
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
  matchedTimeSlots?: MatchingTimeSlot[]; // 時間帯形式
  creatorId: string;
  createdAt: Date;
  updatedAt: Date;
  deadline?: Date | null;
  periodStart: Date;
  periodEnd: Date;
  requiredParticipants: number;
  requiredHours: number; // 必要時間数
  reservationStatus: string;
}

export interface ScheduleCalendarMonth {
  year: number;
  month: number;
  days: ScheduleCalendarDay[];
}