// 🔵 Refactor Phase: Matching Strategy Section Component
import React from 'react';
import type { MatchingStrategy, TimeSlotRestriction } from '@/types/event';

interface MatchingStrategySectionProps {
  formData: {
    matchingStrategy: MatchingStrategy;
    timeSlotRestriction: TimeSlotRestriction;
    minimumConsecutive: number;
  };
  onFieldChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

export const MatchingStrategySection: React.FC<MatchingStrategySectionProps> = ({
  formData,
  onFieldChange,
}) => {
  return (
    <div className="p-4 border border-green-200 rounded-md bg-green-50">
      <h3 className="text-lg font-semibold mb-4 text-green-800">マッチング戦略設定</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="matchingStrategy" className="block text-gray-700 text-sm font-bold mb-2">
            マッチング方法
          </label>
          <select
            id="matchingStrategy"
            name="matchingStrategy"
            value={formData.matchingStrategy}
            onChange={onFieldChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          >
            <option value="consecutive">連続優先</option>
            <option value="flexible">柔軟</option>
            <option value="scattered">分散</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            連続優先: 連続した時間帯を優先<br/>
            柔軟: バランス重視<br/>
            分散: 分散した時間帯も許可
          </p>
        </div>

        <div>
          <label htmlFor="timeSlotRestriction" className="block text-gray-700 text-sm font-bold mb-2">
            時間帯制限
          </label>
          <select
            id="timeSlotRestriction"
            name="timeSlotRestriction"
            value={formData.timeSlotRestriction}
            onChange={onFieldChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          >
            <option value="both">制限なし</option>
            <option value="daytime_only">昼間のみ</option>
            <option value="evening_only">夜間のみ</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            マッチング対象の時間帯を制限
          </p>
        </div>

        <div>
          <label htmlFor="minimumConsecutive" className="block text-gray-700 text-sm font-bold mb-2">
            連続必要コマ数
          </label>
          <input
            id="minimumConsecutive"
            type="number"
            name="minimumConsecutive"
            value={formData.minimumConsecutive}
            onChange={onFieldChange}
            min="1"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
          <p className="text-xs text-gray-500 mt-1">
            最低何コマ連続で確保したいか
          </p>
        </div>
      </div>
    </div>
  );
};