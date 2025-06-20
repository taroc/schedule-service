'use client';

import React from 'react';

interface WeekdaySelectorProps {
  selectedWeekdays: number[];
  onWeekdaysChange: (weekdays: number[]) => void;
}

const WEEKDAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

export default function WeekdaySelector({
  selectedWeekdays,
  onWeekdaysChange
}: WeekdaySelectorProps) {
  const handleWeekdayToggle = (weekday: number) => {
    if (selectedWeekdays.includes(weekday)) {
      onWeekdaysChange(selectedWeekdays.filter(w => w !== weekday));
    } else {
      onWeekdaysChange([...selectedWeekdays, weekday].sort());
    }
  };


  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">曜日を選択して一括登録</h3>
      <p className="text-sm text-gray-600 mb-4">
        曜日を選択すると、カレンダーに表示されている範囲の対象日付が選択されます。カレンダーで個別に日付を追加・削除することも可能です。
      </p>
      
      <div className="space-y-4">
        <div className="grid grid-cols-7 gap-2">
          {WEEKDAY_NAMES.map((name, index) => {
            const isSelected = selectedWeekdays.includes(index);
            
            return (
              <button
                key={index}
                onClick={() => handleWeekdayToggle(index)}
                className={`
                  p-3 text-center rounded-lg border-2 transition-all cursor-pointer
                  ${isSelected 
                    ? 'bg-blue-100 border-blue-500 text-blue-700 ring-2 ring-blue-300' 
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                <div className="font-medium">{name}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}