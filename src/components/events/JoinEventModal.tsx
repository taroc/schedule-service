'use client';

interface JoinEventModalProps {
  isOpen: boolean;
  eventName: string;
  onClose: () => void;
  onJoin: () => void;
  isLoading?: boolean;
}

export default function JoinEventModal({
  isOpen,
  eventName,
  onClose,
  onJoin,
  isLoading = false
}: JoinEventModalProps) {
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onJoin();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          イベント参加確認
        </h2>
        
        <div className="mb-6">
          <p className="text-gray-700 mb-2">
            <span className="font-medium">イベント:</span> {eventName}
          </p>
          <p className="text-sm text-gray-600">
            このイベントに参加しますか？<br />
            ※ 成立済みの他のイベントと日程が重複する場合は参加できません。
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '参加中...' : '参加する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}