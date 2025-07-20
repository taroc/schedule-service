import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CreateEventFormEnhanced from '../CreateEventFormEnhanced';

// 🔴 Red Phase: Enhanced Create Event Form Tests
describe('🔴 Red Phase: CreateEventFormEnhanced', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
    mockOnCancel.mockClear();
  });

  describe('基本レンダリング', () => {
    it('すべての基本フィールドが表示されるべき', () => {
      render(
        <CreateEventFormEnhanced 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      // 基本フィールド
      expect(screen.getByLabelText(/イベント名/)).toBeInTheDocument();
      expect(screen.getByLabelText(/イベント概要/)).toBeInTheDocument();
      expect(screen.getByLabelText(/必要人数/)).toBeInTheDocument();
      expect(screen.getByLabelText(/必要時間数/)).toBeInTheDocument();
    });

    it('Phase 1: 詳細設定展開後にマッチング戦略設定セクションが表示されるべき', async () => {
      render(
        <CreateEventFormEnhanced 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      // 詳細設定を展開
      const detailsButton = screen.getByText('詳細設定を表示');
      fireEvent.click(detailsButton);

      await waitFor(() => {
        expect(screen.getByText('マッチング戦略設定')).toBeInTheDocument();
        expect(screen.getByLabelText(/マッチング方法/)).toBeInTheDocument();
        expect(screen.getByLabelText(/時間帯制限/)).toBeInTheDocument();
        expect(screen.getByLabelText(/連続必要時間数/)).toBeInTheDocument();
      });
    });

    it('Phase 2: 詳細設定展開後に参加者選択戦略設定セクションが表示されるべき', async () => {
      render(
        <CreateEventFormEnhanced 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      // 詳細設定を展開
      const detailsButton = screen.getByText('詳細設定を表示');
      fireEvent.click(detailsButton);

      await waitFor(() => {
        expect(screen.getByText('参加者選択戦略設定')).toBeInTheDocument();
        expect(screen.getByLabelText(/参加者選択方法/)).toBeInTheDocument();
        expect(screen.getByLabelText(/最低参加者数/)).toBeInTheDocument();
        expect(screen.getByLabelText(/最大参加者数/)).toBeInTheDocument();
      });
    });

    it('Phase 3: 詳細設定展開後に成立条件詳細設定セクションが表示されるべき', async () => {
      render(
        <CreateEventFormEnhanced 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      // 詳細設定を展開
      const detailsButton = screen.getByText('詳細設定を表示');
      fireEvent.click(detailsButton);

      await waitFor(() => {
        expect(screen.getByText('成立条件詳細設定')).toBeInTheDocument();
        expect(screen.getByLabelText(/部分成立を許可/)).toBeInTheDocument();
        expect(screen.getByLabelText(/複数候補提示/)).toBeInTheDocument();
        expect(screen.getByLabelText(/最小必要時間数/)).toBeInTheDocument();
      });
    });

    it('Phase 4: 詳細設定展開後に確認・通知システム設定セクションが表示されるべき', async () => {
      render(
        <CreateEventFormEnhanced 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      // 詳細設定を展開
      const detailsButton = screen.getByText('詳細設定を表示');
      fireEvent.click(detailsButton);

      await waitFor(() => {
        expect(screen.getByText('確認・通知システム設定')).toBeInTheDocument();
        expect(screen.getByLabelText(/作成者確認を必須にする/)).toBeInTheDocument();
        expect(screen.getByLabelText(/参加者確認を必須にする/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Discord通知を有効にする/)).toBeInTheDocument();
      });
    });
  });

  describe('折りたたみ機能', () => {
    it('詳細設定セクションは初期状態で折りたたまれているべき', () => {
      render(
        <CreateEventFormEnhanced 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      // 詳細設定ボタンをクリックする前は詳細フィールドが見えない
      expect(screen.queryByLabelText(/マッチング方法/)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/参加者選択方法/)).not.toBeInTheDocument();
    });

    it('詳細設定ボタンクリックで設定セクションが展開されるべき', async () => {
      render(
        <CreateEventFormEnhanced 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      const detailsButton = screen.getByText('詳細設定を表示');
      fireEvent.click(detailsButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/マッチング方法/)).toBeInTheDocument();
        expect(screen.getByLabelText(/参加者選択方法/)).toBeInTheDocument();
      });
    });

    it('詳細設定を非表示にできるべき', async () => {
      render(
        <CreateEventFormEnhanced 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      // 詳細設定を表示
      const showButton = screen.getByText('詳細設定を表示');
      fireEvent.click(showButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/マッチング方法/)).toBeInTheDocument();
      });

      // 詳細設定を非表示
      const hideButton = screen.getByText('詳細設定を非表示');
      fireEvent.click(hideButton);

      await waitFor(() => {
        expect(screen.queryByLabelText(/マッチング方法/)).not.toBeInTheDocument();
      });
    });
  });

  describe('フォーム送信', () => {
    it('基本設定のみでもフォーム送信が可能であるべき', async () => {
      render(
        <CreateEventFormEnhanced 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      // 必須フィールドを入力
      fireEvent.change(screen.getByLabelText(/イベント名/), {
        target: { value: 'テストイベント' }
      });
      fireEvent.change(screen.getByLabelText(/イベント概要/), {
        target: { value: 'テストの概要' }
      });

      // フォーム送信
      const submitButton = screen.getByRole('button', { name: 'イベント作成' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'テストイベント',
            description: 'テストの概要',
            // デフォルト値が設定されていることを確認
            matchingStrategy: 'consecutive',
            participantSelectionStrategy: 'first_come',
            confirmationMode: 'creator_only'
          })
        );
      });
    });

    it('詳細設定の値がフォーム送信に含まれるべき', async () => {
      render(
        <CreateEventFormEnhanced 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      // 詳細設定を展開
      const detailsButton = screen.getByText('詳細設定を表示');
      fireEvent.click(detailsButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/マッチング方法/)).toBeInTheDocument();
      });

      // 基本フィールドを入力
      fireEvent.change(screen.getByLabelText(/イベント名/), {
        target: { value: 'テストイベント' }
      });
      fireEvent.change(screen.getByLabelText(/イベント概要/), {
        target: { value: 'テストの概要' }
      });

      // 詳細設定を変更
      fireEvent.change(screen.getByLabelText(/マッチング方法/), {
        target: { value: 'flexible' }
      });
      fireEvent.change(screen.getByLabelText(/参加者選択方法/), {
        target: { value: 'lottery' }
      });

      // チェックボックスを変更
      const partialMatchingCheckbox = screen.getByLabelText(/部分成立を許可/);
      fireEvent.click(partialMatchingCheckbox);

      // フォーム送信
      const submitButton = screen.getByRole('button', { name: 'イベント作成' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'テストイベント',
            description: 'テストの概要',
            matchingStrategy: 'flexible',
            participantSelectionStrategy: 'lottery',
            allowPartialMatching: true
          })
        );
      });
    });
  });

  describe('条件付きフィールド表示', () => {
    it('抽選選択時にシード値フィールドが表示されるべき', async () => {
      render(
        <CreateEventFormEnhanced 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      // 詳細設定を展開
      const detailsButton = screen.getByText('詳細設定を表示');
      fireEvent.click(detailsButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/参加者選択方法/)).toBeInTheDocument();
      });

      // 抽選を選択
      fireEvent.change(screen.getByLabelText(/参加者選択方法/), {
        target: { value: 'lottery' }
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/抽選シード値/)).toBeInTheDocument();
      });
    });

    it('複数候補提示を有効にすると最大提案数フィールドが表示されるべき', async () => {
      render(
        <CreateEventFormEnhanced 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      // 詳細設定を展開
      const detailsButton = screen.getByText('詳細設定を表示');
      fireEvent.click(detailsButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/複数候補提示/)).toBeInTheDocument();
      });

      // 複数候補提示を有効化
      const multipleSuggestionsCheckbox = screen.getByLabelText(/複数候補提示/);
      fireEvent.click(multipleSuggestionsCheckbox);

      await waitFor(() => {
        expect(screen.getByLabelText(/最大提案数/)).toBeInTheDocument();
      });
    });

    it('確認システムを有効にすると関連フィールドが表示されるべき', async () => {
      render(
        <CreateEventFormEnhanced 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      // 詳細設定を展開
      const detailsButton = screen.getByText('詳細設定を表示');
      fireEvent.click(detailsButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/参加者確認を必須にする/)).toBeInTheDocument();
      });

      // 参加者確認を有効化
      const participantConfirmationCheckbox = screen.getByLabelText(/参加者確認を必須にする/);
      fireEvent.click(participantConfirmationCheckbox);

      await waitFor(() => {
        expect(screen.getByLabelText(/確認モード/)).toBeInTheDocument();
        expect(screen.getByLabelText(/必要確認数/)).toBeInTheDocument();
      });
    });
  });

  describe('バリデーション', () => {
    it('最低参加者数が必要人数より大きい場合エラーを表示すべき', async () => {
      render(
        <CreateEventFormEnhanced 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      // 詳細設定を展開
      const detailsButton = screen.getByText('詳細設定を表示');
      fireEvent.click(detailsButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/最低参加者数/)).toBeInTheDocument();
      });

      // 必要人数を2に設定
      fireEvent.change(screen.getByLabelText(/必要人数/), {
        target: { value: '2' }
      });

      // 最低参加者数を3に設定（エラー条件）
      fireEvent.change(screen.getByLabelText(/最低参加者数/), {
        target: { value: '3' }
      });

      await waitFor(() => {
        expect(screen.getByText(/最低参加者数は必要人数以下である必要があります/)).toBeInTheDocument();
      });
    });

    it('最小必要時間数が必要時間数より大きい場合エラーを表示すべき', async () => {
      render(
        <CreateEventFormEnhanced 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      // 詳細設定を展開
      const detailsButton = screen.getByText('詳細設定を表示');
      fireEvent.click(detailsButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/最小必要時間数/)).toBeInTheDocument();
      });

      // 必要時間数を2に設定
      const requiredTimeSlotsField = document.getElementById('requiredTimeSlots');
      fireEvent.change(requiredTimeSlotsField!, {
        target: { value: '2' }
      });

      // 最小必要時間数を3に設定（エラー条件）
      fireEvent.change(screen.getByLabelText(/最小必要時間数/), {
        target: { value: '3' }
      });

      await waitFor(() => {
        expect(screen.getByText(/最小必要時間数は必要時間数以下である必要があります/)).toBeInTheDocument();
      });
    });
  });

  describe('アクセシビリティ', () => {
    it('すべてのフォームフィールドに適切なラベルが関連付けられているべき', () => {
      render(
        <CreateEventFormEnhanced 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      // 詳細設定を展開
      const detailsButton = screen.getByText('詳細設定を表示');
      fireEvent.click(detailsButton);

      // 基本フィールド
      expect(screen.getByLabelText(/イベント名/)).toHaveAttribute('name', 'name');
      expect(screen.getByLabelText(/イベント概要/)).toHaveAttribute('name', 'description');
      expect(screen.getByLabelText(/必要人数/)).toHaveAttribute('name', 'requiredParticipants');
    });

    it('無効な状態のフィールドにaria-invalid属性が設定されるべき', async () => {
      render(
        <CreateEventFormEnhanced 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      // 詳細設定を展開
      const detailsButton = screen.getByText('詳細設定を表示');
      fireEvent.click(detailsButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/最低参加者数/)).toBeInTheDocument();
      });

      // エラー条件を作成
      fireEvent.change(screen.getByLabelText(/必要人数/), {
        target: { value: '2' }
      });
      fireEvent.change(screen.getByLabelText(/最低参加者数/), {
        target: { value: '3' }
      });

      await waitFor(() => {
        const minParticipantsField = screen.getByLabelText(/最低参加者数/);
        expect(minParticipantsField).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('折りたたみセクションに適切なaria属性が設定されるべき', () => {
      render(
        <CreateEventFormEnhanced 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      const detailsButton = screen.getByText('詳細設定を表示');
      expect(detailsButton).toHaveAttribute('aria-expanded', 'false');
      
      fireEvent.click(detailsButton);
      
      expect(detailsButton).toHaveAttribute('aria-expanded', 'true');
    });
  });
});