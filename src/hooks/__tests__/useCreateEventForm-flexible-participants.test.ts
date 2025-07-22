// 🔴 Red Phase: Flexible Participants Form Validation Tests
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCreateEventForm } from '../useCreateEventForm';

describe('🔴 Red Phase: Flexible Participants Form Validation', () => {
  describe('初期状態', () => {
    it('初期状態でminParticipantsが1に設定されるべき', () => {
      // Act
      const { result } = renderHook(() => useCreateEventForm());

      // Assert
      expect(result.current.formData.minParticipants).toBe(1);
      expect(result.current.formData.requiredParticipants).toBe(1); // 同期される
      expect(result.current.formData.maxParticipants).toBe(null);
    });

    it('初期状態ではvalidationErrorsが空であるべき', () => {
      // Act
      const { result } = renderHook(() => useCreateEventForm());

      // Assert
      expect(result.current.validationErrors).toEqual({});
    });
  });

  describe('minParticipantsのバリデーション', () => {
    it('minParticipantsが1未満の場合はエラーを表示すべき', () => {
      // Arrange
      const { result } = renderHook(() => useCreateEventForm());

      // Act
      act(() => {
        result.current.handleFieldChange({
          target: {
            name: 'minParticipants',
            value: '0',
            type: 'number'
          }
        } as React.ChangeEvent<HTMLInputElement>);
      });

      // Assert
      expect(result.current.validationErrors.minParticipants).toBe(
        '最小参加人数は1人以上である必要があります'
      );
    });

    it('minParticipantsが1以上の場合はエラーが出ないべき', () => {
      // Arrange
      const { result } = renderHook(() => useCreateEventForm());

      // Act
      act(() => {
        result.current.handleFieldChange({
          target: {
            name: 'minParticipants',
            value: '3',
            type: 'number'
          }
        } as React.ChangeEvent<HTMLInputElement>);
      });

      // Assert
      expect(result.current.validationErrors.minParticipants).toBeUndefined();
      expect(result.current.formData.minParticipants).toBe(3);
    });

    it('minParticipantsが変更されるとrequiredParticipantsも同期されるべき', () => {
      // Arrange
      const { result } = renderHook(() => useCreateEventForm());

      // Act
      act(() => {
        result.current.handleFieldChange({
          target: {
            name: 'minParticipants',
            value: '5',
            type: 'number'
          }
        } as React.ChangeEvent<HTMLInputElement>);
      });

      // Assert
      expect(result.current.formData.minParticipants).toBe(5);
      expect(result.current.formData.requiredParticipants).toBe(5);
    });
  });

  describe('maxParticipantsのバリデーション', () => {
    it('maxParticipantsが空の場合はnullに設定されるべき', () => {
      // Arrange
      const { result } = renderHook(() => useCreateEventForm());

      // Act
      act(() => {
        result.current.handleFieldChange({
          target: {
            name: 'maxParticipants',
            value: '',
            type: 'number'
          }
        } as React.ChangeEvent<HTMLInputElement>);
      });

      // Assert
      expect(result.current.formData.maxParticipants).toBe(null);
      expect(result.current.validationErrors.maxParticipants).toBeUndefined();
    });

    it('maxParticipantsがminParticipants未満の場合はエラーを表示すべき', () => {
      // Arrange
      const { result } = renderHook(() => useCreateEventForm());
      
      // 最初にminParticipantsを5に設定
      act(() => {
        result.current.handleFieldChange({
          target: {
            name: 'minParticipants',
            value: '5',
            type: 'number'
          }
        } as React.ChangeEvent<HTMLInputElement>);
      });

      // Act - maxParticipantsを3（minより小さい値）に設定
      act(() => {
        result.current.handleFieldChange({
          target: {
            name: 'maxParticipants',
            value: '3',
            type: 'number'
          }
        } as React.ChangeEvent<HTMLInputElement>);
      });

      // Assert
      expect(result.current.validationErrors.maxParticipants).toBe(
        '最大参加人数は最小参加人数以上である必要があります'
      );
    });

    it('maxParticipantsがminParticipants以上の場合はエラーが出ないべき', () => {
      // Arrange
      const { result } = renderHook(() => useCreateEventForm());
      
      act(() => {
        result.current.handleFieldChange({
          target: {
            name: 'minParticipants',
            value: '3',
            type: 'number'
          }
        } as React.ChangeEvent<HTMLInputElement>);
      });

      // Act
      act(() => {
        result.current.handleFieldChange({
          target: {
            name: 'maxParticipants',
            value: '5',
            type: 'number'
          }
        } as React.ChangeEvent<HTMLInputElement>);
      });

      // Assert
      expect(result.current.validationErrors.maxParticipants).toBeUndefined();
      expect(result.current.formData.maxParticipants).toBe(5);
    });

    it('maxParticipantsが1未満の場合はエラーを表示すべき', () => {
      // Arrange
      const { result } = renderHook(() => useCreateEventForm());

      // Act
      act(() => {
        result.current.handleFieldChange({
          target: {
            name: 'maxParticipants',
            value: '-1',
            type: 'number'
          }
        } as React.ChangeEvent<HTMLInputElement>);
      });

      // Assert
      expect(result.current.validationErrors.maxParticipants).toBe(
        '最大参加人数は1人以上である必要があります'
      );
    });
  });

  describe('フォーム全体のバリデーション', () => {
    it('必須フィールドがすべて入力され、バリデーションエラーがない場合isFormValidがtrueになるべき', () => {
      // Arrange
      const { result } = renderHook(() => useCreateEventForm());

      // Act - 必須フィールドを入力
      act(() => {
        result.current.handleFieldChange({
          target: { name: 'name', value: 'テストイベント' }
        } as React.ChangeEvent<HTMLInputElement>);
      });

      act(() => {
        result.current.handleFieldChange({
          target: { name: 'description', value: 'テスト用イベントです' }
        } as React.ChangeEvent<HTMLTextAreaElement>);
      });

      act(() => {
        result.current.handleFieldChange({
          target: { name: 'minParticipants', value: '3', type: 'number' }
        } as React.ChangeEvent<HTMLInputElement>);
      });

      act(() => {
        result.current.handleFieldChange({
          target: { name: 'maxParticipants', value: '10', type: 'number' }
        } as React.ChangeEvent<HTMLInputElement>);
      });

      // Assert
      expect(result.current.isFormValid).toBe(true);
    });

    it('バリデーションエラーがある場合isFormValidがfalseになるべき', () => {
      // Arrange
      const { result } = renderHook(() => useCreateEventForm());

      // Act - 有効でない値を入力
      act(() => {
        result.current.handleFieldChange({
          target: { name: 'name', value: 'テストイベント' }
        } as React.ChangeEvent<HTMLInputElement>);
      });

      act(() => {
        result.current.handleFieldChange({
          target: { name: 'description', value: 'テスト用イベントです' }
        } as React.ChangeEvent<HTMLTextAreaElement>);
      });

      act(() => {
        result.current.handleFieldChange({
          target: { name: 'minParticipants', value: '5', type: 'number' }
        } as React.ChangeEvent<HTMLInputElement>);
      });

      act(() => {
        result.current.handleFieldChange({
          target: { name: 'maxParticipants', value: '2', type: 'number' } // minより小さい
        } as React.ChangeEvent<HTMLInputElement>);
      });

      // Assert
      expect(result.current.isFormValid).toBe(false);
      expect(result.current.validationErrors.maxParticipants).toBeTruthy();
    });
  });

  describe('フィールドの型変換', () => {
    it('maxParticipantsに0を入力するとnullに変換されるべき', () => {
      // Arrange
      const { result } = renderHook(() => useCreateEventForm());

      // Act
      act(() => {
        result.current.handleFieldChange({
          target: {
            name: 'maxParticipants',
            value: '0',
            type: 'number'
          }
        } as React.ChangeEvent<HTMLInputElement>);
      });

      // Assert
      expect(result.current.formData.maxParticipants).toBe(null);
    });

    it('通常の数値フィールドに0を入力すると0に変換されるべき', () => {
      // Arrange
      const { result } = renderHook(() => useCreateEventForm());

      // Act
      act(() => {
        result.current.handleFieldChange({
          target: {
            name: 'minParticipants',
            value: '0',
            type: 'number'
          }
        } as React.ChangeEvent<HTMLInputElement>);
      });

      // Assert
      expect(result.current.formData.minParticipants).toBe(0);
    });
  });

  describe('フォームのリセット', () => {
    it('resetFormを呼ぶと初期値に戻るべき', () => {
      // Arrange
      const { result } = renderHook(() => useCreateEventForm());
      
      // フィールドを変更
      act(() => {
        result.current.handleFieldChange({
          target: { name: 'minParticipants', value: '10', type: 'number' }
        } as React.ChangeEvent<HTMLInputElement>);
      });

      act(() => {
        result.current.handleFieldChange({
          target: { name: 'maxParticipants', value: '20', type: 'number' }
        } as React.ChangeEvent<HTMLInputElement>);
      });

      // Act
      act(() => {
        result.current.resetForm();
      });

      // Assert
      expect(result.current.formData.minParticipants).toBe(1);
      expect(result.current.formData.maxParticipants).toBe(null);
      expect(result.current.validationErrors).toEqual({});
    });
  });
});