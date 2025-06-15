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
    morning: false,
    afternoon: false,
    fullday: true  // デフォルトは一日中
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
        // APIから返される日付文字列をDateオブジェクトに変換
        const schedulesWithDates = data.map((schedule: UserSchedule & { date: string; createdAt: string; updatedAt: string }) => ({
          ...schedule,
          date: new Date(schedule.date),
          createdAt: new Date(schedule.createdAt),
          updatedAt: new Date(schedule.updatedAt),
          // timeSlotsがない場合はデフォルト値を設定
          timeSlots: schedule.timeSlots || {
            morning: false,
            afternoon: false,
            fullday: false
          }
        }));
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
    if (slot === 'fullday') {
      // 一日中が選択された場合、他を無効にする
      setSelectedTimeSlots({
        morning: false,
        afternoon: false,
        fullday: true
      });
    } else {
      // 午前や午後が選択された場合、一日中を無効にする
      const newTimeSlots = {
        ...selectedTimeSlots,
        fullday: false,
        [slot]: !selectedTimeSlots[slot]
      };
      setSelectedTimeSlots(newTimeSlots);
    }
  };

  const handleSubmitAvailability = async () => {
    if (!token || selectedDates.length === 0) {
      alert('日付を選択してください');
      return;
    }

    const hasAnyTimeSlot = selectedTimeSlots.morning || selectedTimeSlots.afternoon || selectedTimeSlots.fullday;
    if (!hasAnyTimeSlot) {
      alert('時間帯を選択してください');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/schedules/availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          dates: selectedDates.map(d => d.toISOString()),
          timeSlots: selectedTimeSlots,
        }),
      });

      if (response.ok) {
        await fetchSchedules();
        setSelectedDates([]);
        alert(`${selectedDates.length}日の空き時間を登録しました`);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to register availability');
      }
    } catch (error) {
      console.error('Error registering availability:', error);
      alert('空き時間の登録に失敗しました');
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
              checked={selectedTimeSlots.morning}
              onChange={() => handleTimeSlotChange('morning')}
              className="mr-3 text-green-500"
            />
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-100 border-2 border-green-400 rounded mr-2"></div>
              <span className="text-gray-900">午前中</span>
            </div>
          </label>

          <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              checked={selectedTimeSlots.afternoon}
              onChange={() => handleTimeSlotChange('afternoon')}
              className="mr-3 text-green-500"
            />
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-100 border-2 border-green-400 rounded mr-2"></div>
              <span className="text-gray-900">午後</span>
            </div>
          </label>

          <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              checked={selectedTimeSlots.fullday}
              onChange={() => handleTimeSlotChange('fullday')}
              className="mr-3 text-green-500"
            />
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-200 border-2 border-green-500 rounded mr-2"></div>
              <span className="text-gray-900">一日中</span>
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
              className="bg-green-500 text-white px-6 py-3 rounded-md hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '登録中...' : '空き時間登録'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}