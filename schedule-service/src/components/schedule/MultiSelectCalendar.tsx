'use client';

import React, { useState, useEffect } from 'react';
import { UserSchedule, ScheduleCalendarDay } from '@/types/schedule';

interface MultiSelectCalendarProps {
  schedules: UserSchedule[];
  selectedDates: Date[];
  onDateSelectionChange: (selectedDates: Date[]) => void;
}

export default function MultiSelectCalendar({ 
  schedules, 
  selectedDates, 
  onDateSelectionChange 
}: MultiSelectCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<ScheduleCalendarDay[]>([]);

  const monthNames = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ];

  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];

  useEffect(() => {
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
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const getDayClassName = (day: ScheduleCalendarDay) => {
    let className = 'w-10 h-10 flex items-center justify-center text-sm cursor-pointer rounded-full transition-colors relative ';
    
    if (!isCurrentMonth(day.date)) {
      className += 'text-gray-400 ';
    } else {
      className += 'text-gray-900 ';
    }
    
    if (isToday(day.date)) {
      className += 'font-bold ';
    }
    
    if (day.isSelected) {
      className += 'bg-blue-500 text-white ring-2 ring-blue-300 ';
    } else if (day.hasSchedule && day.timeSlots) {
      // 時間帯別の表示
      if (day.timeSlots.fullday) {
        className += 'bg-green-200 border-2 border-green-500 ';
      } else if (day.timeSlots.morning || day.timeSlots.afternoon) {
        className += 'bg-green-100 border-2 border-green-400 ';
      } else {
        className += 'bg-red-100 border-2 border-red-400 ';
      }
    } else {
      // 未登録の日（デフォルトで忙しい）
      className += 'bg-gray-50 border border-gray-200 hover:bg-gray-100 ';
    }
    
    return className.trim();
  };

  const getTimeSlotIndicators = (day: ScheduleCalendarDay) => {
    if (!day.hasSchedule || !day.timeSlots) return null;
    
    const indicators = [];
    
    if (day.timeSlots.morning) {
      indicators.push(
        <div key="morning" className="absolute top-0 left-0 w-1 h-1 bg-green-500 rounded-full"></div>
      );
    }
    
    if (day.timeSlots.afternoon) {
      indicators.push(
        <div key="afternoon" className="absolute top-0 right-0 w-1 h-1 bg-green-500 rounded-full"></div>
      );
    }
    
    if (day.timeSlots.fullday) {
      indicators.push(
        <div key="fullday" className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-green-600 rounded-full"></div>
      );
    }
    
    return indicators;
  };

  const clearSelection = () => {
    onDateSelectionChange([]);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* カレンダーヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigateMonth('prev')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
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
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
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
              {selectedDates.length}日選択中
            </span>
            <button
              onClick={clearSelection}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
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
            {getTimeSlotIndicators(day)}
          </div>
        ))}
      </div>

      {/* 凡例 */}
      <div className="mt-6 space-y-2 text-sm">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
            <span className="text-gray-700">選択中</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-200 border-2 border-green-500 rounded"></div>
            <span className="text-gray-700">一日空き</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border-2 border-green-400 rounded relative">
              <div className="absolute top-0 left-0 w-1 h-1 bg-green-500 rounded-full"></div>
              <div className="absolute top-0 right-0 w-1 h-1 bg-green-500 rounded-full"></div>
            </div>
            <span className="text-gray-700">部分的に空き</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-50 border border-gray-200 rounded"></div>
            <span className="text-gray-700">未登録（忙しい扱い）</span>
          </div>
        </div>
        <div className="text-xs text-gray-500 mt-2">
          ※ 左上：午前、右上：午後、下中央：一日中の空き状況を表示
        </div>
      </div>
    </div>
  );
}