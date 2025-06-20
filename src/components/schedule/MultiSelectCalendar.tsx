'use client';

import React, { useState, useEffect } from 'react';
import { UserSchedule, ScheduleCalendarDay } from '@/types/schedule';

interface MultiSelectCalendarProps {
  schedules: UserSchedule[];
  selectedDates: Date[];
  onDateSelectionChange: (selectedDates: Date[]) => void;
  selectedSchedulesToDelete?: Date[];
  onScheduleDeleteSelectionChange?: (selectedDates: Date[]) => void;
  operationMode?: 'add' | 'delete';
}

export default function MultiSelectCalendar({
  schedules,
  selectedDates,
  onDateSelectionChange,
  selectedSchedulesToDelete = [],
  onScheduleDeleteSelectionChange,
  operationMode = 'add'
}: MultiSelectCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<ScheduleCalendarDay[]>([]);

  const monthNames = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ];

  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];

  useEffect(() => {
    console.log('MultiSelectCalendar useEffect triggered with:', {
      schedulesCount: schedules.length,
      selectedDatesCount: selectedDates.length,
      currentMonth: currentDate.getMonth() + 1
    });
    generateCalendarDays();
  }, [currentDate, schedules, selectedDates]); // eslint-disable-line react-hooks/exhaustive-deps

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // 月の最初の日と最後の日
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // カレンダーの開始日（前月の日曜日から）
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    // カレンダーの終了日（次月の土曜日まで）
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

    const days: ScheduleCalendarDay[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const dateStr = current.toDateString();
      const schedule = schedules.find(s => s.date.toDateString() === dateStr);
      const isSelected = selectedDates.some(d => d.toDateString() === dateStr);

      // 現在月の日付のみログ出力
      if (current.getMonth() === month && schedule) {
        console.log(`Calendar day ${current.getDate()}: schedule found`, {
          hasSchedule: !!schedule,
          timeSlots: schedule.timeSlots,
          dateStr: dateStr
        });
      }

      days.push({
        date: new Date(current),
        hasSchedule: !!schedule,
        timeSlots: schedule?.timeSlots || null,
        isSelected
      });

      current.setDate(current.getDate() + 1);
    }

    setCalendarDays(days);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleDateClick = (date: Date) => {
    const dateStr = date.toDateString();
    const schedule = schedules.find(s => s.date.toDateString() === dateStr);

    if (operationMode === 'delete') {
      // 削除モード：登録済みの日付のみ選択可能
      if (!schedule || !onScheduleDeleteSelectionChange) {
        return; // 登録済みでない日付は選択不可
      }
      
      const isCurrentlySelectedForDelete = selectedSchedulesToDelete.some(d => d.toDateString() === dateStr);
      
      let newSelectedDates: Date[];
      if (isCurrentlySelectedForDelete) {
        // 削除選択解除
        newSelectedDates = selectedSchedulesToDelete.filter(d => d.toDateString() !== dateStr);
      } else {
        // 削除選択追加
        newSelectedDates = [...selectedSchedulesToDelete, date];
      }
      
      onScheduleDeleteSelectionChange(newSelectedDates);
    } else {
      // 追加モード：すべての日付を選択可能（登録済みは上書き）
      const isCurrentlySelected = selectedDates.some(d => d.toDateString() === dateStr);
      
      let newSelectedDates: Date[];
      if (isCurrentlySelected) {
        // 選択解除
        newSelectedDates = selectedDates.filter(d => d.toDateString() !== dateStr);
      } else {
        // 選択追加
        newSelectedDates = [...selectedDates, date];
      }
      
      onDateSelectionChange(newSelectedDates);
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const getDayClassName = (day: ScheduleCalendarDay) => {
    let className = 'w-10 h-10 flex items-center justify-center text-sm rounded-lg transition-colors font-medium border-2 ';
    const isSelectedForDelete = selectedSchedulesToDelete.some(d => d.toDateString() === day.date.toDateString());
    const hasSchedule = day.hasSchedule && day.timeSlots;

    // 削除モードで登録済みでない日付はクリック不可
    if (operationMode === 'delete' && !hasSchedule) {
      className += 'cursor-not-allowed opacity-50 ';
    } else {
      className += 'cursor-pointer ';
    }

    if (!isCurrentMonth(day.date)) {
      className += 'text-gray-400 ';
    }

    if (isToday(day.date)) {
      className += 'font-bold ring-2 ring-orange-300 ';
    }

    if (isSelectedForDelete) {
      // 削除選択中の日は赤いボーダー
      className += 'bg-red-100 text-red-700 border-red-500 ring-2 ring-red-300 ';
    } else if (day.isSelected) {
      className += 'bg-blue-600 text-white border-blue-600 shadow-lg ';
    } else if (hasSchedule) {
      // 時間帯別の色分け（昼・夜ベース）
      if (day.timeSlots!.daytime && day.timeSlots!.evening) {
        // 昼と夜両方空き - 緑系（一日空きと同等）
        className += 'bg-green-500 text-white border-green-500 ';
      } else if (day.timeSlots!.daytime && !day.timeSlots!.evening) {
        // 昼のみ空き - 青系
        className += 'bg-blue-400 text-white border-blue-400 ';
      } else if (day.timeSlots!.evening && !day.timeSlots!.daytime) {
        // 夜のみ空き - 紫系
        className += 'bg-purple-500 text-white border-purple-500 ';
      } else {
        // エラー状態（両方false）
        className += 'bg-red-400 text-white border-red-400 ';
      }
    } else {
      // 未登録の日（デフォルトで忙しい）
      if (operationMode === 'add') {
        className += 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200 ';
      } else {
        className += 'bg-gray-100 text-gray-400 border-gray-200 ';
      }
    }

    return className.trim();
  };


  const clearSelection = () => {
    onDateSelectionChange([]);
  };

  const clearDeleteSelection = () => {
    if (onScheduleDeleteSelectionChange) {
      onScheduleDeleteSelectionChange([]);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* カレンダーヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigateMonth('prev')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors hover:cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <h2 className="text-lg font-semibold text-gray-900">
          {currentDate.getFullYear()}年 {monthNames[currentDate.getMonth()]}
        </h2>

        <button
          onClick={() => navigateMonth('next')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors hover:cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 選択状況 */}
      {selectedDates.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">
              {selectedDates.length}日選択中（新規登録）
            </span>
            <button
              onClick={clearSelection}
              className="text-xs text-blue-600 hover:text-blue-800 underline hover:cursor-pointer"
            >
              選択解除
            </button>
          </div>
        </div>
      )}

      {/* 削除選択状況 */}
      {selectedSchedulesToDelete.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-red-700">
              {selectedSchedulesToDelete.length}日選択中（削除対象）
            </span>
            <button
              onClick={clearDeleteSelection}
              className="text-xs text-red-600 hover:text-red-800 underline hover:cursor-pointer"
            >
              選択解除
            </button>
          </div>
        </div>
      )}

      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((day, index) => (
          <div key={day} className="w-10 h-8 flex items-center justify-center text-sm font-medium text-gray-600">
            <span className={index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : ''}>
              {day}
            </span>
          </div>
        ))}
      </div>

      {/* カレンダーグリッド */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => (
          <div
            key={index}
            className={getDayClassName(day)}
            onClick={() => handleDateClick(day.date)}
          >
            {day.date.getDate()}
          </div>
        ))}
      </div>

      {/* 凡例 */}
      <div className="mt-6 space-y-3 text-sm">
        <h3 className="font-medium text-gray-900">カレンダーの見方</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-blue-600 text-white border-2 border-blue-600 rounded-lg flex items-center justify-center text-xs font-bold">15</div>
            <span className="text-gray-700">選択中（新規登録）</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-red-100 text-red-700 border-2 border-red-500 rounded-lg flex items-center justify-center text-xs font-bold ring-1 ring-red-300">15</div>
            <span className="text-gray-700">選択中（削除対象）</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-green-500 text-white border-2 border-green-500 rounded-lg flex items-center justify-center text-xs font-bold">15</div>
            <span className="text-gray-700">一日空き（全体または昼夜）</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-blue-400 text-white border-2 border-blue-400 rounded-lg flex items-center justify-center text-xs font-bold">15</div>
            <span className="text-gray-700">昼のみ空き</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-purple-500 text-white border-2 border-purple-500 rounded-lg flex items-center justify-center text-xs font-bold">15</div>
            <span className="text-gray-700">夜のみ空き</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-gray-100 text-gray-600 border-2 border-gray-200 rounded-lg flex items-center justify-center text-xs font-medium">15</div>
            <span className="text-gray-700">未登録（忙しい）</span>
          </div>
        </div>
        <div className="text-xs text-gray-500 mt-2 p-2 bg-yellow-50 rounded-lg">
          💡 <strong>ヒント:</strong> {operationMode === 'add' ? '空き時間の登録・更新ができます。既存の予定は上書きされます。' : '登録済みの予定のみ削除できます。未登録の日付は選択できません。'}
        </div>
      </div>
    </div>
  );
}