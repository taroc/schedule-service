// 🔵 Refactor Phase: Advanced Conditions Section Component
import React from 'react';

interface AdvancedConditionsSectionProps {
  formData: {
    allowPartialMatching: boolean;
    minimumTimeSlots?: number;
    suggestMultipleOptions: boolean;
    maxSuggestions?: number;
    requireAllParticipants: boolean;
  };
  validationErrors: Record<string, string>;
  onFieldChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

export const AdvancedConditionsSection: React.FC<AdvancedConditionsSectionProps> = ({
  formData,
  validationErrors,
  onFieldChange,
}) => {
  return (
    <div className="p-4 border border-purple-200 rounded-md bg-purple-50">
      <h3 className="text-lg font-semibold mb-4 text-purple-800">成立条件詳細設定</h3>
      
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <input
                id="allowPartialMatching"
                type="checkbox"
                name="allowPartialMatching"
                checked={formData.allowPartialMatching}
                onChange={onFieldChange}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <label htmlFor="allowPartialMatching" className="text-gray-700 text-sm font-bold">
                  部分成立を許可
                </label>
                <p className="text-xs text-gray-500">
                  必要コマ数を満たさなくても成立を許可
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <input
                id="suggestMultipleOptions"
                type="checkbox"
                name="suggestMultipleOptions"
                checked={formData.suggestMultipleOptions}
                onChange={onFieldChange}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <label htmlFor="suggestMultipleOptions" className="text-gray-700 text-sm font-bold">
                  複数候補提示
                </label>
                <p className="text-xs text-gray-500">
                  可能な日程パターンを複数提示
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <input
                id="requireAllParticipants"
                type="checkbox"
                name="requireAllParticipants"
                checked={formData.requireAllParticipants}
                onChange={onFieldChange}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <label htmlFor="requireAllParticipants" className="text-gray-700 text-sm font-bold">
                  全参加者必須
                </label>
                <p className="text-xs text-gray-500">
                  登録した全参加者の都合を必須とする
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="minimumTimeSlots" className="block text-gray-700 text-sm font-bold mb-2">
                最小必要コマ数
              </label>
              <input
                id="minimumTimeSlots"
                type="number"
                name="minimumTimeSlots"
                value={formData.minimumTimeSlots || ''}
                onChange={onFieldChange}
                min="1"
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                  validationErrors.minimumTimeSlots ? 'border-red-500' : ''
                }`}
                placeholder="必要コマ数と同じ"
                aria-invalid={!!validationErrors.minimumTimeSlots}
              />
              {validationErrors.minimumTimeSlots && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.minimumTimeSlots}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                部分成立時の最低コマ数
              </p>
            </div>

            {formData.suggestMultipleOptions && (
              <div>
                <label htmlFor="maxSuggestions" className="block text-gray-700 text-sm font-bold mb-2">
                  最大提案数
                </label>
                <input
                  id="maxSuggestions"
                  type="number"
                  name="maxSuggestions"
                  value={formData.maxSuggestions || ''}
                  onChange={onFieldChange}
                  min="1"
                  max="10"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="3"
                />
                <p className="text-xs text-gray-500 mt-1">
                  提示する候補パターンの数（1-10）
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};