'use client';

import React from 'react';

interface QuickSelectButtonsProps {
  onQuickSelect: (dates: Date[]) => void;
  startDate: Date;
  endDate: Date;
  disabled?: boolean;
}

export default function QuickSelectButtons({
  onQuickSelect,
  startDate,
  endDate,
  disabled = false
}: QuickSelectButtonsProps) {
  
  // 日付範囲内の全日程を取得
  const getAllDatesInRange = (start: Date, end: Date): Date[] => {
    const dates: Date[] = [];
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  };

  // 平日のみを取得 (月曜日=1, 火曜日=2, ..., 金曜日=5)
  const getWeekdaysInRange = (start: Date, end: Date): Date[] => {
    return getAllDatesInRange(start, end).filter(date => {
      const dayOfWeek = date.getDay();
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    });
  };

  // 週末のみを取得 (土曜日=6, 日曜日=0)
  const getWeekendsInRange = (start: Date, end: Date): Date[] => {
    return getAllDatesInRange(start, end).filter(date => {
      const dayOfWeek = date.getDay();
      return dayOfWeek === 0 || dayOfWeek === 6;
    });
  };

  // 今週末を取得
  const getThisWeekend = (): Date[] => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    // 今週の土曜日を計算
    const daysUntilSaturday = (6 - dayOfWeek) % 7;
    const saturday = new Date(today);
    saturday.setDate(today.getDate() + daysUntilSaturday);
    
    // 今週の日曜日を計算
    const sunday = new Date(saturday);
    sunday.setDate(saturday.getDate() + 1);
    
    const weekend = [];
    if (saturday >= startDate && saturday <= endDate) {
      weekend.push(new Date(saturday));
    }
    if (sunday >= startDate && sunday <= endDate) {
      weekend.push(new Date(sunday));
    }
    
    return weekend;
  };

  // 来週末を取得
  const getNextWeekend = (): Date[] => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    // 来週の土曜日を計算
    const daysUntilNextSaturday = (6 - dayOfWeek) % 7 + 7;
    const saturday = new Date(today);
    saturday.setDate(today.getDate() + daysUntilNextSaturday);
    
    // 来週の日曜日を計算
    const sunday = new Date(saturday);
    sunday.setDate(saturday.getDate() + 1);
    
    const weekend = [];
    if (saturday >= startDate && saturday <= endDate) {
      weekend.push(new Date(saturday));
    }
    if (sunday >= startDate && sunday <= endDate) {
      weekend.push(new Date(sunday));
    }
    
    return weekend;
  };

  // 今月末の週末を取得
  const getEndOfMonthWeekends = (): Date[] => {
    const today = new Date();
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    // 今月の最後の週の週末を探す
    const endOfMonthWeekends = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(lastDayOfMonth);
      date.setDate(lastDayOfMonth.getDate() - i);
      
      if (date.getDay() === 0 || date.getDay() === 6) {
        if (date >= startDate && date <= endDate) {
          endOfMonthWeekends.push(new Date(date));
        }
      }
    }
    
    return endOfMonthWeekends;
  };

  const quickSelectOptions = [
    {
      label: '今週末',
      action: () => onQuickSelect(getThisWeekend()),
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      label: '来週末',
      action: () => onQuickSelect(getNextWeekend()),
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      label: '今月末の週末',
      action: () => onQuickSelect(getEndOfMonthWeekends()),
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      label: '平日全て',
      action: () => onQuickSelect(getWeekdaysInRange(startDate, endDate)),
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      label: '週末全て',
      action: () => onQuickSelect(getWeekendsInRange(startDate, endDate)),
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      label: '全ての日',
      action: () => onQuickSelect(getAllDatesInRange(startDate, endDate)),
      color: 'bg-gray-500 hover:bg-gray-600'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">クイック選択</h3>
      <p className="text-sm text-gray-600 mb-4">
        よく使う日付パターンを一括選択できます
      </p>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {quickSelectOptions.map((option, index) => (
          <button
            key={index}
            onClick={option.action}
            disabled={disabled}
            className={`${option.color} text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}