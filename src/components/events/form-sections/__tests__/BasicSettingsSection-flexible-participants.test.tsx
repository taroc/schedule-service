// 🔴 Red Phase: Flexible Participants UI Component Tests
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BasicSettingsSection } from '../BasicSettingsSection';

describe('🔴 Red Phase: Flexible Participants Basic Settings Section', () => {
  const mockProps = {
    formData: {
      name: 'テストイベント',
      description: 'テスト用のイベントです',
      requiredParticipants: 3,
      minParticipants: 3,
      maxParticipants: null as number | null,
      requiredHours: 3,
    },
    deadlineDate: '2024-01-15',
    periodStartDate: '2024-01-16',
    periodEndDate: '2024-01-30',
    validationErrors: {},
    onFieldChange: vi.fn(),
    onDeadlineDateChange: vi.fn(),
    onPeriodStartDateChange: vi.fn(),
    onPeriodEndDateChange: vi.fn(),
  };

  describe('UI表示', () => {
    it('最小参加人数フィールドが表示されるべき', () => {
      // Act
      render(<BasicSettingsSection {...mockProps} />);

      // Assert
      const minParticipantsInput = screen.getByLabelText('最小参加人数 *') as HTMLInputElement;
      expect(minParticipantsInput).toBeInTheDocument();
      expect(minParticipantsInput.value).toBe('3'); // minParticipantsの値
    });

    it('最大参加人数フィールドが表示されるべき', () => {
      // Act
      render(<BasicSettingsSection {...mockProps} />);

      // Assert
      expect(screen.getByLabelText('最大参加人数（任意）')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('無制限の場合は空欄')).toBeInTheDocument();
    });

    it('優先マッチングのヒントが表示されるべき', () => {
      // Act
      render(<BasicSettingsSection {...mockProps} />);

      // Assert
      expect(screen.getByText(/参加人数が多い方が優先してマッチングされます/)).toBeInTheDocument();
    });

    it('理想的な参加人数フィールドが表示されないべき', () => {
      // Act
      render(<BasicSettingsSection {...mockProps} />);

      // Assert
      expect(screen.queryByText(/理想的な参加人数/)).not.toBeInTheDocument();
    });
  });

  describe('フィールドの値表示', () => {
    it('maxParticipantsがnullの場合は空の値が表示されるべき', () => {
      // Arrange
      const propsWithNullMax = {
        ...mockProps,
        formData: {
          ...mockProps.formData,
          maxParticipants: null,
        },
      };

      // Act
      render(<BasicSettingsSection {...propsWithNullMax} />);

      // Assert
      const maxParticipantsInput = screen.getByLabelText('最大参加人数（任意）') as HTMLInputElement;
      expect(maxParticipantsInput.value).toBe('');
    });

    it('maxParticipantsに値がある場合はその値が表示されるべき', () => {
      // Arrange
      const propsWithMaxValue = {
        ...mockProps,
        formData: {
          ...mockProps.formData,
          maxParticipants: 10,
        },
      };

      // Act
      render(<BasicSettingsSection {...propsWithMaxValue} />);

      // Assert
      const maxParticipantsInput = screen.getByLabelText('最大参加人数（任意）') as HTMLInputElement;
      expect(maxParticipantsInput.value).toBe('10');
    });
  });

  describe('バリデーションエラー表示', () => {
    it('minParticipantsのエラーが表示されるべき', () => {
      // Arrange
      const propsWithError = {
        ...mockProps,
        validationErrors: {
          minParticipants: '最小参加人数は1人以上である必要があります',
        },
      };

      // Act
      render(<BasicSettingsSection {...propsWithError} />);

      // Assert
      expect(screen.getByText('最小参加人数は1人以上である必要があります')).toBeInTheDocument();
      const minParticipantsInput = screen.getByLabelText('最小参加人数 *');
      expect(minParticipantsInput).toHaveClass('border-red-500');
    });

    it('maxParticipantsのエラーが表示されるべき', () => {
      // Arrange
      const propsWithError = {
        ...mockProps,
        validationErrors: {
          maxParticipants: '最大参加人数は最小参加人数以上である必要があります',
        },
      };

      // Act
      render(<BasicSettingsSection {...propsWithError} />);

      // Assert
      expect(screen.getByText('最大参加人数は最小参加人数以上である必要があります')).toBeInTheDocument();
      const maxParticipantsInput = screen.getByLabelText('最大参加人数（任意）');
      expect(maxParticipantsInput).toHaveClass('border-red-500');
    });

    it('エラーがない場合は通常のボーダー色が表示されるべき', () => {
      // Act
      render(<BasicSettingsSection {...mockProps} />);

      // Assert
      const minParticipantsInput = screen.getByLabelText('最小参加人数 *');
      const maxParticipantsInput = screen.getByLabelText('最大参加人数（任意）');
      
      expect(minParticipantsInput).toHaveClass('border-gray-300');
      expect(maxParticipantsInput).toHaveClass('border-gray-300');
    });
  });

  describe('ユーザー操作', () => {
    it('minParticipantsの値変更時にonFieldChangeが呼ばれるべき', () => {
      // Arrange
      const mockOnFieldChange = vi.fn();
      const props = { ...mockProps, onFieldChange: mockOnFieldChange };

      render(<BasicSettingsSection {...props} />);
      const minParticipantsInput = screen.getByLabelText('最小参加人数 *');

      // Act
      fireEvent.change(minParticipantsInput, { target: { value: '5' } });

      // Assert
      expect(mockOnFieldChange).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({
            name: 'minParticipants',
            value: '5',
          }),
        })
      );
    });

    it('maxParticipantsの値変更時にonFieldChangeが呼ばれるべき', () => {
      // Arrange
      const mockOnFieldChange = vi.fn();
      const props = { ...mockProps, onFieldChange: mockOnFieldChange };

      render(<BasicSettingsSection {...props} />);
      const maxParticipantsInput = screen.getByLabelText('最大参加人数（任意）');

      // Act
      fireEvent.change(maxParticipantsInput, { target: { value: '8' } });

      // Assert
      expect(mockOnFieldChange).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({
            name: 'maxParticipants',
            value: '8',
          }),
        })
      );
    });
  });

  describe('アクセシビリティ', () => {
    it('必須フィールドが適切にマークされるべき', () => {
      // Act
      render(<BasicSettingsSection {...mockProps} />);

      // Assert
      const minParticipantsInput = screen.getByLabelText('最小参加人数 *');
      expect(minParticipantsInput).toBeRequired();
      
      const maxParticipantsInput = screen.getByLabelText('最大参加人数（任意）');
      expect(maxParticipantsInput).not.toBeRequired();
    });

    it('フィールドの説明が適切に設定されるべき', () => {
      // Act
      render(<BasicSettingsSection {...mockProps} />);

      // Assert
      expect(screen.getByText('空欄の場合は無制限になります。参加人数が多い方が優先してマッチングされます。')).toBeInTheDocument();
    });
  });

  describe('レイアウト', () => {
    it('最大参加者数フィールドが単独の行に配置されるべき', () => {
      // Act
      render(<BasicSettingsSection {...mockProps} />);

      // Assert
      const maxParticipantsContainer = screen.getByLabelText('最大参加人数（任意）').closest('div.mt-4');
      expect(maxParticipantsContainer).toBeInTheDocument();
      
      // grid-cols-2ではなく単独のdivになっているかチェック
      expect(maxParticipantsContainer).not.toHaveClass('grid-cols-2');
    });
  });

  describe('入力制限', () => {
    it('数値フィールドに適切な制限が設定されるべき', () => {
      // Act
      render(<BasicSettingsSection {...mockProps} />);

      // Assert
      const minParticipantsInput = screen.getByLabelText('最小参加人数 *') as HTMLInputElement;
      const maxParticipantsInput = screen.getByLabelText('最大参加人数（任意）') as HTMLInputElement;
      
      expect(minParticipantsInput.type).toBe('number');
      expect(minParticipantsInput.min).toBe('1');
      
      expect(maxParticipantsInput.type).toBe('number');
      expect(maxParticipantsInput.min).toBe('1');
    });
  });
});