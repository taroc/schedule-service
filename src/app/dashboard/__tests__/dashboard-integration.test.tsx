import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Dashboard from '../page';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/hooks/useNotification';
import { useRouter } from 'next/navigation';

// モック
vi.mock('@/contexts/AuthContext');
vi.mock('@/hooks/useNotification');
vi.mock('next/navigation');

const mockUseAuth = vi.mocked(useAuth);
const mockUseNotification = vi.mocked(useNotification);
const mockUseRouter = vi.mocked(useRouter);

const mockEvents = [
  {
    id: '1',
    name: 'Created Open Event',
    description: 'Test description',
    creatorId: 'user1',
    requiredParticipants: 2,
    requiredDays: 1,
    status: 'open',
    participants: [],
    creator: { id: 'user1', hashedPassword: 'hash' },
    createdAt: new Date(),
    updatedAt: new Date(),
    deadline: null,
    matchedDates: null
  },
  {
    id: '2',
    name: 'Created Matched Event',
    description: 'Test description',
    creatorId: 'user1',
    requiredParticipants: 2,
    requiredDays: 1,
    status: 'matched',
    participants: ['user2'],
    creator: { id: 'user1', hashedPassword: 'hash' },
    createdAt: new Date(),
    updatedAt: new Date(),
    deadline: null,
    matchedDates: [new Date()]
  },
  {
    id: '3',
    name: 'Participating Open Event',
    description: 'Test description',
    creatorId: 'user2',
    requiredParticipants: 2,
    requiredDays: 1,
    status: 'open',
    participants: ['user1'],
    creator: { id: 'user2', hashedPassword: 'hash' },
    createdAt: new Date(),
    updatedAt: new Date(),
    deadline: null,
    matchedDates: null
  },
  {
    id: '4',
    name: 'Participating Matched Event',
    description: 'Test description',
    creatorId: 'user3',
    requiredParticipants: 2,
    requiredDays: 1,
    status: 'matched',
    participants: ['user1'],
    creator: { id: 'user3', hashedPassword: 'hash' },
    createdAt: new Date(),
    updatedAt: new Date(),
    deadline: null,
    matchedDates: [new Date()]
  },
  {
    id: '5',
    name: 'Available Event',
    description: 'Test description',
    creatorId: 'user4',
    requiredParticipants: 2,
    requiredDays: 1,
    status: 'open',
    participants: [],
    creator: { id: 'user4', hashedPassword: 'hash' },
    createdAt: new Date(),
    updatedAt: new Date(),
    deadline: null,
    matchedDates: null
  }
];

describe('Dashboard Statistics Display', () => {
  const mockPush = vi.fn();
  
  beforeEach(() => {
    // localStorage のモック
    const localStorageMock = {
      getItem: vi.fn(() => 'mock-token'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    // fetch のモック
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockEvents),
      }) as Promise<Response>
    );

    mockUseAuth.mockReturnValue({
      user: { id: 'user1', hashedPassword: 'hash' },
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      token: 'mock-token'
    });

    mockUseNotification.mockReturnValue({
      notifications: [],
      showSuccess: vi.fn(),
      showError: vi.fn(),
      showInfo: vi.fn(),
      removeNotification: vi.fn()
    });

    mockUseRouter.mockReturnValue({
      push: mockPush,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn()
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('統計カードが正しい数値を表示する', async () => {
    render(<Dashboard />);

    // データが読み込まれるのを待つ
    await waitFor(() => {
      expect(screen.getByText('作成したイベント')).toBeInTheDocument();
      expect(screen.getByText('参加中のイベント')).toBeInTheDocument();
      expect(screen.getByText('成立済み')).toBeInTheDocument();
      expect(screen.getByText('調整中')).toBeInTheDocument();
    });

    // 各統計の数値を確認
    // - 作成したイベント: 2 (user1が作成した id:1, id:2)
    // - 参加中のイベント: 2 (user1が参加している id:3, id:4)
    // - 成立済み: 2 (作成した成立済み:1個 + 参加している成立済み:1個)
    // - 調整中: 2 (作成したopen:1個 + 参加しているopen:1個)
    
    const createdEventsCard = screen.getByText('作成したイベント').closest('div');
    const participatingEventsCard = screen.getByText('参加中のイベント').closest('div');
    const matchedEventsCard = screen.getByText('成立済み').closest('div');
    const pendingEventsCard = screen.getByText('調整中').closest('div');

    expect(createdEventsCard).toContainElement(screen.getAllByText('2')[0]);
    expect(participatingEventsCard).toContainElement(screen.getAllByText('2')[1]);
    expect(matchedEventsCard).toContainElement(screen.getAllByText('2')[2]);
    expect(pendingEventsCard).toContainElement(screen.getAllByText('2')[3]);
  });

  it('データ取得エラー時に適切なエラーメッセージを表示する', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
      }) as Promise<Response>
    );

    const showError = vi.fn();
    mockUseNotification.mockReturnValue({
      notifications: [],
      showSuccess: vi.fn(),
      showError,
      showInfo: vi.fn(),
      removeNotification: vi.fn()
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(showError).toHaveBeenCalledWith('データの読み込みに失敗しました');
    });
  });

  it('認証エラー時にログアウト処理が実行される', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 401,
      }) as Promise<Response>
    );

    const logout = vi.fn();
    const showError = vi.fn();
    
    mockUseAuth.mockReturnValue({
      user: { id: 'user1', hashedPassword: 'hash' },
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout,
      token: 'mock-token'
    });

    mockUseNotification.mockReturnValue({
      notifications: [],
      showSuccess: vi.fn(),
      showError,
      showInfo: vi.fn(),
      removeNotification: vi.fn()
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(showError).toHaveBeenCalledWith('認証エラーが発生しました。再ログインしてください。');
      expect(logout).toHaveBeenCalled();
    });
  });
});