// 🔵 Refactor Phase: Basic Settings Section Component
import React from 'react';

interface BasicSettingsSectionProps {
  formData: {
    name: string;
    description: string;
    requiredParticipants: number;
    requiredHours: number;
  };
  deadlineDate: string;
  periodStartDate: string;
  periodEndDate: string;
  onFieldChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onDeadlineDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPeriodStartDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPeriodEndDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const BasicSettingsSection: React.FC<BasicSettingsSectionProps> = ({
  formData,
  deadlineDate,
  periodStartDate,
  periodEndDate,
  onFieldChange,
  onDeadlineDateChange,
  onPeriodStartDateChange,
  onPeriodEndDateChange,
}) => {
  return (
    <div className="mb-6 p-4 border border-gray-200 rounded-md">
      <h3 className="text-lg font-semibold mb-4">基本設定</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">
            イベント名 *
          </label>
          <input
            id="name"
            type="text"
            name="name"
            value={formData.name}
            onChange={onFieldChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            required
            placeholder="例: チーム飲み会"
          />
        </div>

        <div>
          <label htmlFor="requiredParticipants" className="block text-gray-700 text-sm font-bold mb-2">
            必要人数 *
          </label>
          <input
            id="requiredParticipants"
            type="number"
            name="requiredParticipants"
            value={formData.requiredParticipants}
            onChange={onFieldChange}
            min="1"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            required
          />
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="description" className="block text-gray-700 text-sm font-bold mb-2">
          イベント概要 *
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={onFieldChange}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          required
          placeholder="イベントの詳細を記載してください"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div>
          <label htmlFor="requiredHours" className="block text-gray-700 text-sm font-bold mb-2">
            必要時間数 *
          </label>
          <input
            id="requiredHours"
            type="number"
            name="requiredHours"
            value={formData.requiredHours}
            onChange={onFieldChange}
            min="1"
            step="1"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            required
          />
          <div className="text-xs text-gray-500 mt-1">
            夜: 3時間、終日: 10時間（例: 6時間 = 夜×2日）
          </div>
        </div>

        <div>
          <label htmlFor="deadline" className="block text-gray-700 text-sm font-bold mb-2">
            参加締切日 *
          </label>
          <input
            id="deadline"
            type="date"
            value={deadlineDate}
            onChange={onDeadlineDateChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            required
          />
        </div>
      </div>

      {/* 実施期間設定 */}
      <div className="mt-4 p-4 border border-blue-200 rounded-md bg-blue-50">
        <h4 className="text-sm font-bold text-blue-800 mb-3">実施期間設定 *</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="periodStart" className="block text-gray-700 text-sm font-bold mb-2">
              開始可能日 *
            </label>
            <input
              id="periodStart"
              type="date"
              value={periodStartDate}
              onChange={onPeriodStartDateChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              required
            />
          </div>
          
          <div>
            <label htmlFor="periodEnd" className="block text-gray-700 text-sm font-bold mb-2">
              終了可能日 *
            </label>
            <input
              id="periodEnd"
              type="date"
              value={periodEndDate}
              onChange={onPeriodEndDateChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              required
            />
          </div>
        </div>
      </div>
    </div>
  );
};