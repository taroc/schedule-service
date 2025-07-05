// 🔵 Refactor Phase: Custom Hook for Create Event Form
import { useState, useEffect, useCallback } from 'react';
import { CreateEventRequest } from '@/types/event';

interface ValidationErrors {
  [key: string]: string;
}

interface UseCreateEventFormReturn {
  formData: CreateEventRequest;
  deadlineDate: string;
  periodStartDate: string;
  periodEndDate: string;
  validationErrors: ValidationErrors;
  isFormValid: boolean;
  handleFieldChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleDeadlineDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handlePeriodStartDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handlePeriodEndDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDiscordSettingChange: (key: string, value: boolean | string) => void;
  resetForm: () => void;
}

const createInitialFormData = (): CreateEventRequest => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const twoWeeksLater = new Date();
  twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);
  
  return {
    name: '',
    description: '',
    requiredParticipants: 1,
    requiredTimeSlots: 1,
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    periodStart: tomorrow,
    periodEnd: twoWeeksLater,
    
    // Phase 1: マッチング戦略設定（デフォルト値）
    matchingStrategy: 'consecutive',
    timeSlotRestriction: 'both',
    minimumConsecutive: 1,
    
    // Phase 2: 参加者選択戦略設定（デフォルト値）
    participantSelectionStrategy: 'first_come',
    minParticipants: 1,
    maxParticipants: undefined,
    optimalParticipants: undefined,
    selectionDeadline: undefined,
    lotterySeed: undefined,
    
    // Phase 3: 成立条件詳細設定（デフォルト値）
    allowPartialMatching: false,
    minimumTimeSlots: undefined,
    suggestMultipleOptions: false,
    maxSuggestions: undefined,
    preferredDates: undefined,
    dateWeights: undefined,
    requireAllParticipants: false,
    fallbackStrategy: undefined,
    
    // Phase 4: 確認・通知システム設定（デフォルト値）
    requireCreatorConfirmation: false,
    confirmationTimeout: 60,
    requireParticipantConfirmation: false,
    minimumConfirmations: 1,
    confirmationMode: 'creator_only',
    confirmationDeadline: undefined,
    gracePeriod: 30,
    discordNotificationSettings: {
      enabled: true,
      webhookUrl: 'https://discord.com/api/webhooks/test/webhook',
      notifyOnMatching: true,
      notifyOnDeadlineApproaching: true,
      notifyOnConfirmationRequired: true,
      notifyOnConfirmationReceived: true,
      notifyOnCancellation: true,
      mentionRoles: [],
      channelOverrides: []
    },
    reminderSchedule: [],
    customMessages: undefined,
  };
};

const createInitialDateStrings = () => {
  const oneWeekLater = new Date();
  oneWeekLater.setDate(oneWeekLater.getDate() + 7);
  const today = new Date();
  today.setDate(today.getDate() + 1);
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 14);
  
  return {
    deadlineDate: oneWeekLater.toISOString().split('T')[0],
    periodStartDate: today.toISOString().split('T')[0],
    periodEndDate: endDate.toISOString().split('T')[0],
  };
};

export const useCreateEventForm = (): UseCreateEventFormReturn => {
  const [formData, setFormData] = useState<CreateEventRequest>(createInitialFormData);
  const [dateStrings, setDateStrings] = useState(createInitialDateStrings);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  const { deadlineDate, periodStartDate, periodEndDate } = dateStrings;

  // 日付フィールドの更新処理
  useEffect(() => {
    if (deadlineDate) {
      const deadline = new Date(`${deadlineDate}T23:59:59`);
      setFormData(prev => ({ ...prev, deadline }));
    }
  }, [deadlineDate]);

  useEffect(() => {
    if (periodStartDate) {
      const periodStart = new Date(`${periodStartDate}T00:00:00`);
      setFormData(prev => ({ ...prev, periodStart }));
    }
  }, [periodStartDate]);

  useEffect(() => {
    if (periodEndDate) {
      const periodEnd = new Date(`${periodEndDate}T23:59:59`);
      setFormData(prev => ({ ...prev, periodEnd }));
    }
  }, [periodEndDate]);

  // 必要人数変更時の関連フィールド更新
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      minParticipants: Math.min(prev.minParticipants || prev.requiredParticipants, prev.requiredParticipants),
      minimumConfirmations: prev.requiredParticipants
    }));
  }, [formData.requiredParticipants]);

  // バリデーション
  useEffect(() => {
    const errors: ValidationErrors = {};
    
    if (formData.minParticipants && formData.minParticipants > formData.requiredParticipants) {
      errors.minParticipants = '最低参加者数は必要人数以下である必要があります';
    }
    
    if (formData.minimumTimeSlots && formData.minimumTimeSlots > formData.requiredTimeSlots) {
      errors.minimumTimeSlots = '最小必要コマ数は必要コマ数以下である必要があります';
    }

    if (formData.maxParticipants && formData.maxParticipants < formData.requiredParticipants) {
      errors.maxParticipants = '最大参加者数は必要人数以上である必要があります';
    }

    if (formData.optimalParticipants && formData.optimalParticipants < formData.requiredParticipants) {
      errors.optimalParticipants = '最適参加者数は必要人数以上である必要があります';
    }

    if (formData.maxSuggestions && (formData.maxSuggestions < 1 || formData.maxSuggestions > 10)) {
      errors.maxSuggestions = '最大提案数は1-10の範囲で設定してください';
    }

    setValidationErrors(errors);
  }, [
    formData.requiredParticipants,
    formData.requiredTimeSlots,
    formData.minParticipants,
    formData.minimumTimeSlots,
    formData.maxParticipants,
    formData.optimalParticipants,
    formData.maxSuggestions
  ]);

  const handleFieldChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let processedValue: string | number | boolean = value;
    
    if (type === 'number') {
      processedValue = parseInt(value) || 0;
    } else if (type === 'checkbox') {
      processedValue = (e.target as HTMLInputElement).checked;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
  }, []);

  const handleDeadlineDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDateStrings(prev => ({ ...prev, deadlineDate: e.target.value }));
  }, []);

  const handlePeriodStartDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDateStrings(prev => ({ ...prev, periodStartDate: e.target.value }));
  }, []);

  const handlePeriodEndDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDateStrings(prev => ({ ...prev, periodEndDate: e.target.value }));
  }, []);

  const handleDiscordSettingChange = useCallback((key: string, value: boolean | string) => {
    setFormData(prev => ({
      ...prev,
      discordNotificationSettings: {
        ...prev.discordNotificationSettings!,
        [key]: value
      }
    }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData(createInitialFormData());
    setDateStrings(createInitialDateStrings());
    setValidationErrors({});
  }, []);

  const isFormValid = Object.keys(validationErrors).length === 0 && 
                     formData.name.trim() !== '' && 
                     formData.description.trim() !== '';

  return {
    formData,
    deadlineDate,
    periodStartDate,
    periodEndDate,
    validationErrors,
    isFormValid,
    handleFieldChange,
    handleDeadlineDateChange,
    handlePeriodStartDateChange,
    handlePeriodEndDateChange,
    handleDiscordSettingChange,
    resetForm,
  };
};