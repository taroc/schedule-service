/**
 * 指定された期間内で特定の曜日に該当する日付をすべて取得する
 * @param startDate 開始日
 * @param endDate 終了日
 * @param weekdays 曜日の配列 (0=日曜日, 1=月曜日, ..., 6=土曜日)
 * @returns 該当する日付の配列
 */
export function getDatesByWeekdays(
  startDate: Date,
  endDate: Date,
  weekdays: number[]
): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    if (weekdays.includes(current.getDay())) {
      dates.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

/**
 * 現在日から指定された期間の日付範囲を取得する
 * @param weeksAhead 何週間先まで
 * @returns { startDate, endDate }
 */
export function getDateRange(weeksAhead: number = 8): { startDate: Date; endDate: Date } {
  const today = new Date();
  const startDate = new Date(today);
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + (weeksAhead * 7));
  
  return { startDate, endDate };
}

/**
 * 曜日名を取得する
 * @param weekday 曜日番号 (0=日曜日, 1=月曜日, ..., 6=土曜日)
 * @returns 曜日名
 */
export function getWeekdayName(weekday: number): string {
  const names = ['日', '月', '火', '水', '木', '金', '土'];
  return names[weekday] || '';
}

/**
 * 曜日番号の配列を曜日名の文字列に変換する
 * @param weekdays 曜日番号の配列
 * @returns 曜日名を「、」で区切った文字列
 */
export function formatWeekdays(weekdays: number[]): string {
  return weekdays.map(w => getWeekdayName(w)).join('、');
}