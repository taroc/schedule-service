# イベント設定柔軟化計画

## 概要

現在のスケジュール調整サービスのイベント成立システムをより柔軟で多様なニーズに対応できるよう拡張する。t-wadaさんのTDD方法論に従い、段階的に実装を進める。

## 現在の制限事項

### 既存のイベント設定
- **固定的なマッチング**: 連続コマ優先、昼→夜優先の固定ロジック
- **先着順のみ**: 参加者選択が先着順のみ
- **単一成立条件**: 必要人数・必要コマ数の固定値
- **自動成立**: 条件を満たすと即座に成立

### 制限による問題
1. **多様なイベント形式に対応できない**
   - 連続でなくても良いイベント（週1の定期ミーティング等）
   - 昼間のみ/夜間のみのイベント
   - 抽選で参加者を決めたいイベント

2. **運営の自由度が低い**
   - 成立前の確認ができない
   - 部分的な成立を認められない
   - 複数の日程候補を提示できない

## 改善目標

### Phase 1: 基本的なマッチング戦略選択
**目標**: イベント作成時にマッチング戦略を選択可能にする

#### 実装項目
1. **マッチングモード選択**
   - `consecutive`: 連続優先（現在のデフォルト）
   - `flexible`: 分散許可
   
2. **時間帯制限**
   - `both`: 昼・夜両方（現在のデフォルト）
   - `daytime_only`: 昼間のみ
   - `evening_only`: 夜間のみ

3. **連続性設定**
   - `minimum_consecutive`: 最低連続コマ数

#### データベーススキーマ変更
```sql
-- Eventテーブルに追加するフィールド
ALTER TABLE events ADD COLUMN matching_strategy TEXT DEFAULT 'consecutive';
ALTER TABLE events ADD COLUMN time_slot_restriction TEXT DEFAULT 'both';
ALTER TABLE events ADD COLUMN minimum_consecutive INT DEFAULT 1;
```

#### TypeScript型定義
```typescript
export type MatchingStrategy = 'consecutive' | 'flexible';
export type TimeSlotRestriction = 'both' | 'daytime_only' | 'evening_only';

export interface Event {
  // 既存フィールド...
  matchingStrategy: MatchingStrategy;
  timeSlotRestriction: TimeSlotRestriction;
  minimumConsecutive: number;
}
```

### Phase 2: 参加者選択戦略
**目標**: 参加者の選択方法を柔軟にする

#### 実装項目
1. **選択戦略**
   - `first_come`: 先着順（現在のデフォルト）
   - `lottery`: 抽選
   - `manual`: 作成者指定

2. **人数設定の柔軟化**
   - `min_participants`: 最低人数
   - `max_participants`: 最大人数

### Phase 3: 成立条件の詳細設定
**目標**: より細かい成立条件を設定可能にする

#### 実装項目
1. **部分成立許可**
   - `allow_partial_matching`: 必要コマ数未満での成立許可

2. **複数候補提示**
   - `suggest_multiple_options`: 複数日程案の提示

3. **優先日程設定**
   - `preferred_dates`: 特定日程への重み付け

### Phase 4: 通知・確認設定
**目標**: 成立プロセスの制御を強化する

#### 実装項目
1. **成立確認**
   - `require_confirmation`: 成立前の作成者確認
   - `auto_confirmation`: 自動成立（現在のデフォルト）

2. **通知設定**
   - `reminder_settings`: リマインダー設定
   - `notification_preferences`: 通知方法の設定

## 実装戦略

### TDD方法論の適用

#### 🔴 Red Phase（失敗するテストの作成）
各機能について、期待する動作を表現する失敗するテストを先に作成する。

```typescript
// 例: マッチング戦略のテスト
describe('🔴 Red Phase: マッチング戦略選択', () => {
  it('連続優先モードで連続したコマが選ばれるべき', async () => {
    // 失敗するテストを先に書く
    expect(result.matchedTimeSlots).toHaveConsecutiveDates();
  });
  
  it('分散許可モードで非連続でも成立すべき', async () => {
    // 失敗するテストを先に書く
    expect(result.isMatched).toBe(true);
    expect(result.matchedTimeSlots).not.toHaveConsecutiveDates();
  });
});
```

#### 🟢 Green Phase（最小限の実装）
テストが通るための最小限のコードのみを実装する。

#### 🔵 Refactor Phase（品質向上）
テストを保持しながら、コードの品質を向上させる。

### 段階的実装スケジュール

#### Week 1: Phase 1 基本的なマッチング戦略
- Day 1-2: 失敗するテストの作成
- Day 3-4: 最小限の実装
- Day 5-7: リファクタリングと統合

#### Week 2: Phase 2 参加者選択戦略
- Day 1-2: 失敗するテストの作成
- Day 3-4: 最小限の実装
- Day 5-7: リファクタリングと統合

#### Week 3-4: Phase 3, 4 の実装
- 同様のTDDサイクルを適用

## 技術的考慮事項

### 後方互換性
- 既存のイベントは現在の動作を維持
- 新しいフィールドはデフォルト値で互換性確保
- 段階的なマイグレーション戦略

### パフォーマンス
- 複雑なマッチングロジックによる処理時間増加の対策
- データベースインデックスの最適化
- キャッシュ戦略の検討

### UI/UX
- 設定項目の増加による複雑性の管理
- プリセット機能による使いやすさの確保
- 段階的な機能公開

### テスト戦略
- 各フェーズで包括的なテストカバレッジ
- 統合テストによる全体動作の検証
- パフォーマンステストの実施

## リスク管理

### 技術的リスク
- **複雑性の増大**: 段階的実装で管理
- **パフォーマンス劣化**: 事前のベンチマーク測定
- **バグの混入**: TDDによる品質確保

### 運用リスク
- **ユーザーの混乱**: 段階的な機能公開とドキュメント整備
- **既存機能の破綻**: 後方互換性の厳格な維持

## 成功指標

### 技術指標
- テストカバレッジ: 90%以上
- 処理時間: 現在の1.5倍以内
- バグ発生率: Phase毎に前フェーズより減少

### ビジネス指標
- イベント作成数の増加
- ユーザー満足度の向上
- 多様なイベント形式の活用

## 実装進捗

### ✅ Phase 1完了: 基本的なマッチング戦略選択（2025年7月4日）

#### 実装された機能
1. **マッチング戦略選択**
   - `consecutive`: 連続優先モード（同日昼→夜、隣接日を優先）
   - `flexible`: 分散許可モード（早い日程を優先、連続性不問）

2. **時間帯制限**
   - `both`: 昼・夜両方（デフォルト）
   - `daytime_only`: 昼間のみ
   - `evening_only`: 夜間のみ

3. **連続性設定**
   - `minimumConsecutive`: 最低連続コマ数（デフォルト: 1）

4. **型定義拡張**
   - `Event`, `CreateEventRequest`, `UpdateEventRequest`, `EventResponse`に新フィールド追加
   - 後方互換性確保（オプションフィールド、デフォルト値）

#### TDD実装結果
- **テスト数**: 7個（新規）+ 16個（既存）= 23個のテスト
- **全テスト成功**: 回帰なし
- **実装方針**: t-wadaさんのTDD方法論（🔴→🟢→🔵）を厳格適用

#### 技術的成果
- カスタムマッチャー（`toHaveConsecutiveTimeSlots`, `toAllowNonConsecutiveTimeSlots`）
- 新しいマッチングエンジンアーキテクチャの基盤構築
- 戦略パターンの適用による拡張性向上

## 次のステップ

### ✅ Phase 2完了: 参加者選択戦略（2025年7月4日）

#### 実装された機能

1. **選択戦略の種類**
   - `first_come`: 先着順（作成者を含む参加順で選択）
   - `lottery`: 抽選（決定論的なハッシュベース、シード値による再現可能な選択）
   - `manual`: 作成者による手動選択（期限切れ時は先着順フォールバック）

2. **人数設定の柔軟化**
   - `minParticipants`: 最小人数（後方互換性のためrequiredParticipantsのデフォルト値として使用）
   - `maxParticipants`: 最大人数（未設定時は無制限）
   - `optimalParticipants`: 理想人数（設定時は理想人数に近い数を選択）

3. **抽選機能の詳細**
   - 決定論的ハッシュベースの選択アルゴリズム
   - イベントIDベースのシード値生成（再現可能）
   - 外部シード値指定対応（`lotterySeed`フィールド）

4. **手動選択機能**
   - 選択期限（`selectionDeadline`）の設定
   - 期限前は成立しない仕組み
   - 期限切れ時の先着順フォールバック

#### TDD実装結果
- **テスト数**: 8個（新規）+ 7個（Phase 1）+ 16個（既存）= 31個のテスト
- **全テスト成功**: 回帰なし
- **実装方針**: t-wadaさんのTDD方法論（🔴→🟢→🔵）を厳格適用

#### 技術的成果
- 決定論的抽選アルゴリズムの実装
- 柔軟な人数制限システムの構築
- 手動選択フローの基盤実装
- 後方互換性を保持した型定義拡張

#### データベーススキーマ変更（実装済み）
```typescript
// Event インターフェースに追加されたフィールド
participantSelectionStrategy: ParticipantSelectionStrategy; // 参加者選択戦略
minParticipants: number;                  // 最小人数
maxParticipants?: number;                 // 最大人数（無制限の場合はundefined）
optimalParticipants?: number;             // 理想人数
selectionDeadline?: Date;                 // 手動選択の締切
lotterySeed?: number;                     // 抽選用シード値
```

#### TypeScript型定義（実装済み）
```typescript
export type ParticipantSelectionStrategy = 'first_come' | 'lottery' | 'manual';

export interface Event {
  // Phase 1 フィールド...
  matchingStrategy: MatchingStrategy;
  timeSlotRestriction: TimeSlotRestriction;
  minimumConsecutive: number;
  
  // Phase 2 フィールド...
  participantSelectionStrategy: ParticipantSelectionStrategy;
  minParticipants: number;
  maxParticipants?: number;
  optimalParticipants?: number;
  selectionDeadline?: Date;
  lotterySeed?: number;
}
```

## 次のステップ

### Phase 3: 成立条件の詳細設定（実装開始）

#### 目標
より細かい成立条件を設定可能にし、多様なイベント形式に対応する

#### 実装予定項目

1. **部分成立許可システム**
   - `allowPartialMatching`: 必要コマ数未満での成立許可
   - `minimumTimeSlots`: 部分成立時の最低コマ数
   - 段階的な成立レベル（例：50%, 75%, 100%）

2. **複数候補提示機能**
   - `suggestMultipleOptions`: 複数日程案の提示モード
   - `maxSuggestions`: 提示する候補数の上限
   - スコアベースのランキング表示

3. **優先日程設定**
   - `preferredDates`: 特定日程への重み付け
   - `dateWeights`: 日程別の優先度スコア
   - 優先度を考慮したマッチング

4. **高度なマッチング条件**
   - `requireAllParticipants`: 全参加者の合意が必要
   - `fallbackStrategy`: 第一希望が不成立時の代替戦略
   - `escalationRules`: 段階的な条件緩和

#### データベーススキーマ追加予定
```typescript
// Event インターフェースに追加するフィールド
allowPartialMatching: boolean;           // 部分成立許可
minimumTimeSlots?: number;              // 部分成立時の最低コマ数
suggestMultipleOptions: boolean;        // 複数候補提示
maxSuggestions?: number;                // 最大候補数
preferredDates?: string[];              // 優先日程（ISO文字列配列）
dateWeights?: Record<string, number>;   // 日程別重み（日付文字列 → スコア）
requireAllParticipants: boolean;        // 全参加者合意必須
fallbackStrategy?: FallbackStrategy;    // 代替戦略
```

#### 新しい型定義
```typescript
export type FallbackStrategy = 'lower_requirements' | 'extend_period' | 'split_event' | 'cancel';

export interface DateWeight {
  date: string;    // ISO date string
  weight: number;  // 1.0 = normal, >1.0 = preferred, <1.0 = avoided
}

export interface MatchingSuggestion {
  timeSlots: MatchingTimeSlot[];
  participants: string[];
  score: number;
  completeness: number; // 0.0-1.0 (要求に対する充足率)
}
```

### Phase 4: 通知・確認設定（実装開始）

#### 目標
イベント成立プロセスの制御を強化し、より柔軟な確認・通知システムを構築する

#### 実装予定項目

1. **成立確認システム**
   - `requireCreatorConfirmation`: 成立前の作成者確認必須
   - `confirmationTimeout`: 確認タイムアウト期間
   - `autoConfirmation`: 自動成立（現在のデフォルト）
   - `confirmationDeadline`: 確認期限の設定

2. **段階的確認フロー**
   - `requireParticipantConfirmation`: 参加者個別確認
   - `minimumConfirmations`: 必要確認数の設定
   - `confirmationMode`: 確認モード（全員/過半数/指定数）
   - `gracePeriod`: 確認猶予期間

3. **通知設定**
   - `notificationSettings`: 通知方法の詳細設定
   - `reminderSchedule`: リマインダースケジュール
   - `escalationRules`: エスカレーションルール
   - `customNotificationMessages`: カスタム通知メッセージ

4. **イベントライフサイクル管理**
   - `eventStates`: 新しいイベント状態の追加
   - `stateTransitions`: 状態遷移ルールの定義
   - `rollbackSupport`: 成立取り消し機能
   - `historyTracking`: 状態変更履歴の記録

#### データベーススキーマ追加予定
```typescript
// Event インターフェースに追加するフィールド
requireCreatorConfirmation: boolean;        // 作成者確認必須
confirmationTimeout: number;                // 確認タイムアウト（分）
requireParticipantConfirmation: boolean;    // 参加者確認必須
minimumConfirmations: number;               // 必要確認数
confirmationMode: ConfirmationMode;         // 確認モード
confirmationDeadline?: Date;                // 確認期限
gracePeriod: number;                        // 猶予期間（分）
notificationSettings: NotificationSettings; // 通知設定
reminderSchedule: ReminderSchedule[];       // リマインダー設定
customMessages?: CustomNotificationMessages; // カスタムメッセージ
```

#### 新しい型定義
```typescript
export type ConfirmationMode = 'all' | 'majority' | 'minimum_count' | 'creator_only';

export type EventState = 'open' | 'matched' | 'pending_confirmation' | 'confirmed' | 'cancelled' | 'expired' | 'rolled_back';

export interface NotificationSettings {
  enableEmailNotifications: boolean;
  enablePushNotifications: boolean;
  notifyOnMatching: boolean;
  notifyOnDeadlineApproaching: boolean;
  notifyOnConfirmationRequired: boolean;
  notifyOnConfirmationReceived: boolean;
}

export interface ReminderSchedule {
  triggerBefore: number;  // minutes before deadline
  message: string;
  recipients: 'all' | 'creator' | 'participants' | 'unconfirmed';
}

export interface CustomNotificationMessages {
  matchingNotification?: string;
  confirmationRequest?: string;
  reminderMessage?: string;
  cancellationNotice?: string;
}

export interface EventConfirmation {
  id: string;
  eventId: string;
  userId: string;
  confirmationType: 'creator' | 'participant';
  status: 'pending' | 'confirmed' | 'declined' | 'expired';
  confirmedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventStateHistory {
  id: string;
  eventId: string;
  previousState: EventState;
  newState: EventState;
  triggeredBy: string;  // userId
  reason: string;
  timestamp: Date;
  additionalData?: Record<string, any>;
}
```

#### TDD実装計画

##### 🔴 Red Phase: 確認・通知システムのテスト作成
1. **成立確認システムのテスト**
   ```typescript
   describe('🔴 Red Phase: 成立確認システム', () => {
     it('作成者確認が必要な場合、確認前は成立しないべき', async () => {
       // 失敗するテストを作成
     });
     
     it('確認期限を過ぎた場合、自動的にキャンセルされるべき', async () => {
       // 失敗するテストを作成
     });
   });
   ```

2. **段階的確認フローのテスト**
   ```typescript
   describe('🔴 Red Phase: 段階的確認フロー', () => {
     it('参加者確認が必要な場合、最低確認数に達するまで保留状態を維持すべき', async () => {
       // 失敗するテストを作成
     });
   });
   ```

3. **通知システムのテスト**
   ```typescript
   describe('🔴 Red Phase: 通知システム', () => {
     it('リマインダースケジュールに従って通知が送信されるべき', async () => {
       // 失敗するテストを作成
     });
   });
   ```

##### 🟢 Green Phase: 最小限の実装
- 確認システムの基本ロジック実装
- 新しいイベント状態の追加
- 通知トリガーの基本実装

##### 🔵 Refactor Phase: アーキテクチャ改善
- 状態管理パターンの最適化
- 通知システムの抽象化
- パフォーマンス最適化

#### 実装の段階的アプローチ

##### Step 1: 基本確認システム (Week 1-2)
- 作成者確認機能の実装
- `pending_confirmation`状態の追加
- 確認タイムアウト機能

##### Step 2: 参加者確認システム (Week 3-4)
- 参加者個別確認機能
- 確認モードの実装
- 最低確認数の検証

##### Step 3: 通知システム (Week 5-6)
- 基本通知機能の実装
- リマインダースケジューリング
- カスタムメッセージ対応

##### Step 4: 高度な機能 (Week 7-8)
- ロールバック機能
- 履歴追跡
- エスカレーションルール

#### 技術的考慮事項

##### データベース設計
- 新しい`event_confirmations`テーブルの追加
- `event_state_history`テーブルの追加
- 既存`events`テーブルへのフィールド追加

##### パフォーマンス考慮
- 通知処理の非同期化
- バッチ処理でのリマインダー送信
- 状態変更のイベント駆動アーキテクチャ

##### セキュリティ
- 確認権限の検証
- 通知データの暗号化
- 不正な状態変更の防止

#### 期待される効果

##### 運営面での改善
- **柔軟な確認フロー**: 事前確認による参加品質の向上
- **自動化された通知**: 手動リマインダーの削減
- **透明性の向上**: 状態変更履歴による説明責任

##### ユーザー体験の向上
- **明確な状態表示**: 現在の状況がわかりやすい
- **適切なタイミングでの通知**: スパムを避けた効果的な連絡
- **カスタマイズ可能**: 用途に応じた設定調整

##### システム信頼性
- **確実な合意形成**: 全参加者の明示的確認
- **履歴の保持**: トラブル時の調査支援
- **ロールバック対応**: 誤成立の修正

### Phase 5以降: 将来の拡張
- **外部連携**: カレンダーアプリとの同期
- **AI機能**: 最適日程の予測・提案
- **分析機能**: イベント成立パターンの分析

---

*このドキュメントは実装の進行に合わせて継続的に更新される。最終更新: 2025年7月4日 - Phase 4詳細設計追加*