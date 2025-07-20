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
    requiredHours: 1,
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    periodStart: tomorrow,
    periodEnd: twoWeeksLater,
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
    // 削除されたフィールドへの依存は削除
  }, [formData.requiredParticipants]);

  // バリデーション
  useEffect(() => {
    const errors: ValidationErrors = {};
    
    setValidationErrors(errors);
  }, [
    formData.requiredParticipants,
    formData.requiredHours
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
    resetForm,
  };
};