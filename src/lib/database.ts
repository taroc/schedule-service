import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// データベースファイルのパス
const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'app.db');

// データベースディレクトリが存在しない場合は作成
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// データベース接続を作成
export const db = new Database(DB_PATH);

// WALモードを有効にして並行性を向上
db.pragma('journal_mode = WAL');

// 外部キー制約を有効化
db.pragma('foreign_keys = ON');

/**
 * データベーススキーマの初期化
 */
export function initializeDatabase() {
  // Users テーブル
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Events テーブル
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      required_participants INTEGER NOT NULL,
      required_days INTEGER NOT NULL,
      creator_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      matched_dates TEXT, -- JSON array of dates
      deadline DATETIME, -- 参加締切
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (creator_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // Event participants 中間テーブル
  db.exec(`
    CREATE TABLE IF NOT EXISTS event_participants (
      event_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (event_id, user_id),
      FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // User schedules テーブル
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_schedules (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date DATE NOT NULL,
      time_slots_morning BOOLEAN NOT NULL DEFAULT FALSE,
      time_slots_afternoon BOOLEAN NOT NULL DEFAULT FALSE,
      time_slots_fullday BOOLEAN NOT NULL DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, date),
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // インデックスの作成
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_events_creator_id ON events (creator_id);
    CREATE INDEX IF NOT EXISTS idx_events_status ON events (status);
    CREATE INDEX IF NOT EXISTS idx_event_participants_event_id ON event_participants (event_id);
    CREATE INDEX IF NOT EXISTS idx_event_participants_user_id ON event_participants (user_id);
    CREATE INDEX IF NOT EXISTS idx_user_schedules_user_id ON user_schedules (user_id);
    CREATE INDEX IF NOT EXISTS idx_user_schedules_date ON user_schedules (date);
    CREATE INDEX IF NOT EXISTS idx_user_schedules_user_date ON user_schedules (user_id, date);
  `);

  // deadlineカラムを追加するマイグレーション
  try {
    // 既存のeventsテーブルにdeadlineカラムがあるかチェック
    const eventColumns = db.prepare("PRAGMA table_info(events)").all() as { name: string }[];
    const hasDeadlineColumn = eventColumns.some(col => col.name === 'deadline');
    
    if (!hasDeadlineColumn) {
      console.log('Adding deadline column to events table...');
      db.exec('ALTER TABLE events ADD COLUMN deadline DATETIME');
      console.log('Deadline column added successfully');
    }
  } catch {
    console.log('Deadline column migration not needed or already completed');
  }

  // nameカラムを削除するマイグレーション
  try {
    // 既存のusersテーブルのnameカラムをチェック
    const columns = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
    const hasNameColumn = columns.some(col => col.name === 'name');
    
    if (hasNameColumn) {
      console.log('Removing name column from users table...');
      
      // 1. 新しいテーブルを作成
      db.exec(`
        CREATE TABLE users_new (
          id TEXT PRIMARY KEY,
          password TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // 2. データをコピー（nameカラムを除く）
      db.exec(`
        INSERT INTO users_new (id, password, created_at, updated_at)
        SELECT id, password, created_at, updated_at
        FROM users
      `);
      
      // 3. 旧テーブルを削除し、新テーブルをリネーム
      db.exec('DROP TABLE users');
      db.exec('ALTER TABLE users_new RENAME TO users');
      
      console.log('Name column removed successfully');
    }
  } catch {
    console.log('Name column migration not needed or already completed');
  }

  console.log('Database schema initialized successfully');
}

/**
 * トランザクション内でクエリを実行
 */
export function runInTransaction<T>(fn: () => T): T {
  const transaction = db.transaction(fn);
  return transaction();
}

/**
 * データベース接続を閉じる
 */
export function closeDatabase() {
  db.close();
}

// SQLiteからPrismaに移行済み - この初期化は無効化
// if (process.env.NODE_ENV !== 'test') {
//   initializeDatabase();
// }