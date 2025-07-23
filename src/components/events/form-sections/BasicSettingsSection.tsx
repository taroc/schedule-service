// 🔵 Refactor Phase: Basic Settings Section Component
import React from 'react';

interface BasicSettingsSectionProps {
  formData: {
    name: string;
    description: string;
    requiredParticipants: number;
    minParticipants: number;
    maxParticipants: number | null;
    requiredHours: number;
  };
  deadlineDate: string;
  periodStartDate: string;
  periodEndDate: string;
  validationErrors: { [key: string]: string };
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
  validationErrors,
  onFieldChange,
  onDeadlineDateChange,
  onPeriodStartDateChange,
  onPeriodEndDateChange,
}) => {
  return (
    <div className="mb-6 p-4 border border-gray-200 dark:border-gray-600 rounded-md">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">基本設定</h3>
      
      <div>
        <label htmlFor="name" className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
          イベント名 *
        </label>
        <input
          id="name"
          type="text"
          name="name"
          value={formData.name}
          onChange={onFieldChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
          required
          placeholder="例: チーム飲み会"
        />
      </div>

      <div className="mt-4">
        <label htmlFor="description" className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
          イベント概要 *
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={onFieldChange}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
          required
          placeholder="イベントの詳細を記載してください"
        />
      </div>

      {/* 参加人数設定 */}
      <div className="mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="minParticipants" className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
              最小参加人数 *
            </label>
            <input
              id="minParticipants"
              type="number"
              name="minParticipants"
              value={formData.minParticipants}
              onChange={onFieldChange}
              min="1"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 ${
                validationErrors.minParticipants ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              required
            />
            {validationErrors.minParticipants && (
              <p className="text-red-500 text-xs mt-1">{validationErrors.minParticipants}</p>
            )}
          </div>

          <div>
            <label htmlFor="maxParticipants" className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
              最大参加人数（任意）
            </label>
            <input
              id="maxParticipants"
              type="number"
              name="maxParticipants"
              value={formData.maxParticipants || ''}
              onChange={onFieldChange}
              min="1"
              placeholder="無制限の場合は空欄"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 ${
                validationErrors.maxParticipants ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {validationErrors.maxParticipants && (
              <p className="text-red-500 text-xs mt-1">{validationErrors.maxParticipants}</p>
            )}
          </div>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          空欄の場合は無制限になります。参加人数が多い方が優先してマッチングされます。
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div>
          <label htmlFor="requiredHours" className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
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
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
            required
          />
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            夜: 3時間、終日: 10時間（例: 6時間 = 夜×2日）
          </div>
        </div>

        <div>
          <label htmlFor="deadline" className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
            参加締切日 *
          </label>
          <input
            id="deadline"
            type="date"
            value={deadlineDate}
            onChange={onDeadlineDateChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
            required
          />
        </div>
      </div>

      {/* 実施期間設定 */}
      <div className="mt-4 p-4 border border-blue-200 dark:border-blue-600 rounded-md bg-blue-50 dark:bg-blue-900/20">
        <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-3">実施期間設定 *</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="periodStart" className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
              開始可能日 *
            </label>
            <input
              id="periodStart"
              type="date"
              value={periodStartDate}
              onChange={onPeriodStartDateChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
              required
            />
          </div>
          
          <div>
            <label htmlFor="periodEnd" className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
              終了可能日 *
            </label>
            <input
              id="periodEnd"
              type="date"
              value={periodEndDate}
              onChange={onPeriodEndDateChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
              required
            />
          </div>
        </div>
      </div>
    </div>
  );
};