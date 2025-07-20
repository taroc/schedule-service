'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserSchedule, MatchedEvent } from '@/types/schedule';
import MultiSelectCalendar from './MultiSelectCalendar';
import WeekdaySelector from './WeekdaySelector';
import QuickSelectButtons from './QuickSelectButtons';
import { getDatesByWeekdays } from '@/lib/weekdayUtils';

export default function AvailabilityManager() {
  const { token, isLoading: authLoading } = useAuth();
  const [schedules, setSchedules] = useState<UserSchedule[]>([]);
  const [matchedEvents, setMatchedEvents] = useState<MatchedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<'evening' | 'fullday'>('evening');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSchedulesToDelete, setSelectedSchedulesToDelete] = useState<Date[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [operationMode, setOperationMode] = useState<'add' | 'delete'>('add');
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const [individualSelectedDates, setIndividualSelectedDates] = useState<Date[]>([]); // 個別選択の日付
  const [weekdaySelectedDates, setWeekdaySelectedDates] = useState<Date[]>([]); // 曜日選択の日付
  const [calendarStartDate, setCalendarStartDate] = useState(new Date());
  const [calendarEndDate, setCalendarEndDate] = useState(new Date());

  // 個別選択と曜日選択を統合した選択日付
  const selectedDates = React.useMemo(() => {
    const allDates = [...individualSelectedDates, ...weekdaySelectedDates];
    // 重複を除去（日付文字列で比較）
    const uniqueDates = allDates.filter((date, index, self) => 
      self.findIndex(d => d.toDateString() === date.toDateString()) === index
    );
    return uniqueDates;
  }, [individualSelectedDates, weekdaySelectedDates]);

  // 個別選択で日付をクリックした時の処理（曜日選択の日付も考慮）
  const handleIndividualDateSelection = React.useCallback((dates: Date[]) => {
    setIndividualSelectedDates(dates);
    
    // 曜日選択の日付と重複しているものがあれば、曜日選択から除外
    const clickedDateStrings = dates.map(d => d.toDateString());
    
    setSelectedWeekdays(prevWeekdays => {
      // クリックされた日付が曜日選択に含まれている場合、該当する曜日を除外
      const updatedWeekdays = prevWeekdays.filter(weekday => {
        const weekdayDatesForThisWeekday = getDatesByWeekdays(
          calendarStartDate,
          calendarEndDate,
          [weekday]
        );
        const weekdayDateStringsForThisWeekday = weekdayDatesForThisWeekday.map(d => d.toDateString());
        
        // この曜日の日付のうち、個別選択でクリックされたものがあるかチェック
        const hasClickedDate = weekdayDateStringsForThisWeekday.some(dateStr => 
          clickedDateStrings.includes(dateStr)
        );
        
        return !hasClickedDate;
      });
      
      return updatedWeekdays;
    });
  }, [calendarStartDate, calendarEndDate]);

  useEffect(() => {
    if (!authLoading && token) {
      fetchSchedules();
      fetchMatchedEvents();
    } else if (!authLoading && !token) {
      setLoading(false);
    }
  }, [token, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSchedules = async () => {
    if (!token) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/schedules', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();

        // APIから返される日付文字列をDateオブジェクトに変換
        const schedulesWithDates = data.map((schedule: UserSchedule & { date: string; createdAt: string; updatedAt: string }) => ({
          ...schedule,
          date: new Date(schedule.date),
          createdAt: new Date(schedule.createdAt),
          updatedAt: new Date(schedule.updatedAt),
          // timeSlotsがない場合はデフォルト値を設定
          timeSlots: schedule.timeSlots || {
            evening: false,
            fullday: false
          }
        }));

        setSchedules(schedulesWithDates);
      }
    } catch {
      // エラーは無視（ユーザーには表示しない）
    } finally {
      setLoading(false);
    }
  };

  const fetchMatchedEvents = async () => {
    if (!token) {
      return;
    }

    try {
      const response = await fetch('/api/events/list?type=completedEvents', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();

        // APIから返される日付文字列をDateオブジェクトに変換
        const eventsWithDates = data.map((event: MatchedEvent & { matchedDates?: string[]; createdAt: string; updatedAt: string; deadline?: string | null; periodStart: string; periodEnd: string; }) => ({
          ...event,
          matchedDates: event.matchedDates?.map((d: string) => new Date(d)) || [],
          createdAt: new Date(event.createdAt),
          updatedAt: new Date(event.updatedAt),
          deadline: event.deadline ? new Date(event.deadline) : null,
          periodStart: new Date(event.periodStart),
          periodEnd: new Date(event.periodEnd)
        }));

        setMatchedEvents(eventsWithDates);
      }
    } catch {
      // エラーは無視（ユーザーには表示しない）
    }
  };

  const handleTimeSlotChange = (value: 'evening' | 'fullday') => {
    setSelectedTimeSlots(value);
  };

  const handleModeChange = (mode: 'add' | 'delete') => {
    setOperationMode(mode);
    // モード切り替え時に選択をクリア
    setIndividualSelectedDates([]);
    setWeekdaySelectedDates([]);
    setSelectedSchedulesToDelete([]);
    setSelectedWeekdays([]);
  };

  const handleWeekdaysChange = React.useCallback((weekdays: number[]) => {
    setSelectedWeekdays(weekdays);
  }, []);

  const handleCalendarRangeChange = React.useCallback((startDate: Date, endDate: Date) => {
    setCalendarStartDate(prev => {
      if (prev.getTime() !== startDate.getTime()) {
        return startDate;
      }
      return prev;
    });
    setCalendarEndDate(prev => {
      if (prev.getTime() !== endDate.getTime()) {
        return endDate;
      }
      return prev;
    });
  }, []);

  // 曜日選択やカレンダー範囲が変更された時に日付を更新
  React.useEffect(() => {
    if (selectedWeekdays.length > 0) {
      const dates = getDatesByWeekdays(calendarStartDate, calendarEndDate, selectedWeekdays);
      setWeekdaySelectedDates(dates);
    } else {
      setWeekdaySelectedDates([]);
    }
  }, [selectedWeekdays, calendarStartDate, calendarEndDate]);

  // クイック選択ハンドラー
  const handleQuickSelect = React.useCallback((quickSelectedDates: Date[]) => {
    // カレンダー範囲内の日付のみをフィルタ
    const filteredDates = quickSelectedDates.filter(date => 
      date >= calendarStartDate && date <= calendarEndDate
    );
    
    // 個別選択に設定（曜日選択はクリア）
    setIndividualSelectedDates(filteredDates);
    setSelectedWeekdays([]);
    setWeekdaySelectedDates([]);
  }, [calendarStartDate, calendarEndDate]);

  const handleSubmitAvailability = async () => {
    if (!token || selectedDates.length === 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const dateStrings = selectedDates.map(d => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      });

      const response = await fetch('/api/schedules/availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          dates: dateStrings,
          timeSlots: {
            evening: selectedTimeSlots === 'evening',
            fullday: selectedTimeSlots === 'fullday'
          }
        })
      });

      if (response.ok) {
        // 登録成功時の処理 - 全ての選択を解除
        setIndividualSelectedDates([]);
        setWeekdaySelectedDates([]);
        setSelectedWeekdays([]);

        // スケジュールのみ再取得
        await fetchSchedules();
      }
    } catch {
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleDeleteSchedules = async () => {
    if (!token || selectedSchedulesToDelete.length === 0) {
      return;
    }

    setIsDeleting(true);

    try {
      const dates = selectedSchedulesToDelete.map(d => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      });

      const response = await fetch('/api/schedules/availability', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ dates })
      });

      if (response.ok) {
        // 削除成功時の処理
        setSelectedSchedulesToDelete([]);
        setIndividualSelectedDates([]);
        setWeekdaySelectedDates([]);

        // スケジュールのみ再取得
        await fetchSchedules();
      }
    } catch {
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAllSchedules = async () => {
    if (!token) {
      return;
    }

    if (!confirm('全ての予定を未登録に戻しますか？この操作は取り消せません。')) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch('/api/schedules/availability', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ dates: [] }) // 空配列で全削除
      });

      if (response.ok) {
        // 削除成功時の処理
        setSelectedSchedulesToDelete([]);
        setIndividualSelectedDates([]);
        setWeekdaySelectedDates([]);

        // スケジュールのみ再取得
        await fetchSchedules();
      }
    } catch {
    } finally {
      setIsDeleting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">
          {authLoading ? '認証確認中...' : '予定を読み込み中...'}
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">認証が必要です</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          予定管理
        </h2>
        <div className="text-sm text-gray-600">
          {operationMode === 'add' 
            ? '曜日と日付を個別に選択して一括登録'
            : '削除したい日を選択'
          }
        </div>
      </div>

      {/* モード切り替え */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">操作モード</h3>
        <div className="flex gap-4">
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="operationMode"
              value="add"
              checked={operationMode === 'add'}
              onChange={(e) => handleModeChange(e.target.value as 'add' | 'delete')}
              className="mr-2 text-blue-500"
            />
            <span className="text-gray-900">予定を追加・更新</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="operationMode"
              value="delete"
              checked={operationMode === 'delete'}
              onChange={(e) => handleModeChange(e.target.value as 'add' | 'delete')}
              className="mr-2 text-red-500"
            />
            <span className="text-gray-900">予定を削除</span>
          </label>
        </div>

      </div>

      {/* 時間帯選択（追加モード時のみ表示） */}
      {operationMode === 'add' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">時間帯を選択</h3>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="timeSlot"
                value="evening"
                checked={selectedTimeSlots === 'evening'}
                onChange={(e) => handleTimeSlotChange(e.target.value as 'evening' | 'fullday')}
                className="mr-3 text-purple-500"
              />
              <div className="flex items-center">
                <div className="w-4 h-4 bg-purple-100 border-2 border-purple-400 rounded mr-2"></div>
                <span className="text-gray-900">夜のみ（3時間）</span>
              </div>
            </label>

            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="timeSlot"
                value="fullday"
                checked={selectedTimeSlots === 'fullday'}
                onChange={(e) => handleTimeSlotChange(e.target.value as 'evening' | 'fullday')}
                className="mr-3 text-blue-500"
              />
              <div className="flex items-center">
                <div className="w-4 h-4 bg-blue-100 border-2 border-blue-400 rounded mr-2"></div>
                <span className="text-gray-900">終日（10時間）</span>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* 曜日選択（追加モード時のみ表示） */}
      {operationMode === 'add' && (
        <WeekdaySelector
          selectedWeekdays={selectedWeekdays}
          onWeekdaysChange={handleWeekdaysChange}
        />
      )}

      {/* クイック選択ボタン（追加モード時のみ表示） */}
      {operationMode === 'add' && (
        <QuickSelectButtons
          onQuickSelect={handleQuickSelect}
          startDate={calendarStartDate}
          endDate={calendarEndDate}
          disabled={isSubmitting}
        />
      )}

      {/* カレンダー（削除モードまたは追加モード時に表示） */}
      {(operationMode === 'delete' || operationMode === 'add') && (
        <MultiSelectCalendar
          schedules={schedules}
          selectedDates={selectedDates}
          onDateSelectionChange={operationMode === 'add' ? handleIndividualDateSelection : () => {}}
          selectedSchedulesToDelete={selectedSchedulesToDelete}
          onScheduleDeleteSelectionChange={setSelectedSchedulesToDelete}
          operationMode={operationMode}
          matchedEvents={matchedEvents}
          readOnly={false}
          onCalendarRangeChange={handleCalendarRangeChange}
        />
      )}

      {/* 統合登録ボタン */}
      {operationMode === 'add' && selectedDates.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                空き時間を登録・更新
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                選択した{selectedDates.length}日に空き時間を設定します（既存の予定は上書きされます）
              </p>
            </div>
            <button
              onClick={handleSubmitAvailability}
              disabled={isSubmitting || selectedDates.length === 0}
              className="bg-green-500 text-white px-6 py-3 rounded-md hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer"
            >
              {isSubmitting ? '登録中...' : '空き時間登録'}
            </button>
          </div>
        </div>
      )}

      {/* 削除ボタン */}
      {operationMode === 'delete' && selectedSchedulesToDelete.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                予定を未登録に戻す
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                選択した{selectedSchedulesToDelete.length}日の予定を削除します
              </p>
            </div>
            <button
              onClick={handleDeleteSchedules}
              disabled={isDeleting || selectedSchedulesToDelete.length === 0}
              className="bg-red-500 text-white px-6 py-3 rounded-md hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer"
            >
              {isDeleting ? '削除中...' : '予定を削除'}
            </button>
          </div>
        </div>
      )}

      {/* 全削除ボタン */}
      {operationMode === 'delete' && schedules.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                全ての予定をリセット
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                登録済みの全ての予定を未登録状態に戻します
              </p>
            </div>
            <button
              onClick={handleDeleteAllSchedules}
              disabled={isDeleting}
              className="bg-red-600 text-white px-6 py-3 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer"
            >
              {isDeleting ? '削除中...' : '全ての予定を削除'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}