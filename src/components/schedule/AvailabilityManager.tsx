'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserSchedule, TimeSlotAvailability } from '@/types/schedule';
import MultiSelectCalendar from './MultiSelectCalendar';

export default function AvailabilityManager() {
  const { token, isLoading: authLoading } = useAuth();
  const [schedules, setSchedules] = useState<UserSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<TimeSlotAvailability>({
    daytime: true,  // デフォルトは昼と夜両方
    evening: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && token) {
      fetchSchedules();
    } else if (!authLoading && !token) {
      setLoading(false);
    }
  }, [token, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSchedules = async () => {
    if (!token) {
      console.log('No token available for fetching schedules');
      return;
    }

    try {
      console.log('Fetching schedules with token:', token.substring(0, 10) + '...');
      setLoading(true);
      const response = await fetch('/api/schedules', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Fetched schedule data:', data);

        // APIから返される日付文字列をDateオブジェクトに変換
        const schedulesWithDates = data.map((schedule: UserSchedule & { date: string; createdAt: string; updatedAt: string }) => ({
          ...schedule,
          date: new Date(schedule.date),
          createdAt: new Date(schedule.createdAt),
          updatedAt: new Date(schedule.updatedAt),
          // timeSlotsがない場合はデフォルト値を設定
          timeSlots: schedule.timeSlots || {
            daytime: false,
            evening: false
          }
        }));

        console.log('Processed schedules with dates:', schedulesWithDates);
        setSchedules(schedulesWithDates);
      } else {
        console.error('Failed to fetch schedules:', response.status, response.statusText);
        const errorData = await response.json().catch(() => ({}));
        console.error('Error details:', errorData);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeSlotChange = (slot: keyof TimeSlotAvailability) => {
    setSelectedTimeSlots({
      ...selectedTimeSlots,
      [slot]: !selectedTimeSlots[slot]
    });
  };

  const handleSubmitAvailability = async () => {
    if (!token || selectedDates.length === 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const dates = selectedDates.map(d => d.toISOString().split('T')[0]);

      const response = await fetch('/api/schedules/availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          dates,
          timeSlots: selectedTimeSlots
        })
      });

      if (response.ok) {
        // 登録成功時の処理
        setSelectedDates([]);

        // スケジュールを再取得
        await fetchSchedules();
      } else {
        const errorData = await response.json();
        console.error('空き時間登録エラー:', errorData);
      }
    } catch (error) {
      console.error('空き時間登録エラー:', error);
    } finally {
      setIsSubmitting(false);
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
          空き時間登録
        </h2>
        <div className="text-sm text-gray-600">
          空いている日を選択して一括登録
        </div>
      </div>

      {/* 時間帯選択 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">時間帯を選択</h3>
        <div className="grid grid-cols-3 gap-4">
          <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              checked={selectedTimeSlots.daytime}
              onChange={() => handleTimeSlotChange('daytime')}
              className="mr-3 text-blue-500"
            />
            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-100 border-2 border-blue-400 rounded mr-2"></div>
              <span className="text-gray-900">昼</span>
            </div>
          </label>

          <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              checked={selectedTimeSlots.evening}
              onChange={() => handleTimeSlotChange('evening')}
              className="mr-3 text-purple-500"
            />
            <div className="flex items-center">
              <div className="w-4 h-4 bg-purple-100 border-2 border-purple-400 rounded mr-2"></div>
              <span className="text-gray-900">夜</span>
            </div>
          </label>

        </div>
      </div>

      {/* カレンダー */}
      <MultiSelectCalendar
        schedules={schedules}
        selectedDates={selectedDates}
        onDateSelectionChange={setSelectedDates}
      />

      {/* 登録ボタン */}
      {selectedDates.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                空き時間を登録
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                選択した{selectedDates.length}日に空き時間を設定します
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
    </div>
  );
}