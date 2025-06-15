import { User, CreateUserRequest } from '@/types/user';
import { db, runInTransaction } from './database';
import bcrypt from 'bcryptjs';

class UserStorageDB {
  private insertUser = db.prepare(`
    INSERT INTO users (id, password, created_at, updated_at)
    VALUES (?, ?, datetime('now'), datetime('now'))
  `);

  private selectUserById = db.prepare(`
    SELECT * FROM users WHERE id = ?
  `);

  private selectAllUsers = db.prepare(`
    SELECT id, created_at, updated_at FROM users
  `);

  private updateUserUpdatedAt = db.prepare(`
    UPDATE users SET updated_at = datetime('now') WHERE id = ?
  `);

  async createUser(request: CreateUserRequest, providedId?: string): Promise<User> {
    return runInTransaction(() => {
      // 既存ユーザーIDチェック
      const userId = providedId || request.userId;
      const existingUser = this.selectUserById.get(userId) as User | undefined;
      if (existingUser) {
        throw new Error('User ID already exists');
      }

      // パスワードハッシュ化
      const hashedPassword = bcrypt.hashSync(request.password, 10);

      // ユーザー作成
      this.insertUser.run(userId, hashedPassword);

      // 作成されたユーザーを取得
      const user = this.selectUserById.get(userId) as User;
      
      return {
        ...user,
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.updatedAt)
      };
    });
  }


  async getUserById(id: string): Promise<User | null> {
    const user = this.selectUserById.get(id) as User | undefined;
    
    if (!user) {
      return null;
    }

    return {
      ...user,
      createdAt: new Date(user.createdAt),
      updatedAt: new Date(user.updatedAt)
    };
  }

  async verifyPassword(userId: string, password: string): Promise<User | null> {
    const user = await this.getUserById(userId);
    if (!user) {
      return null;
    }

    const isValid = bcrypt.compareSync(password, user.password);
    return isValid ? user : null;
  }

  getAllUsers(): Omit<User, 'password'>[] {
    const users = this.selectAllUsers.all() as Omit<User, 'password'>[];
    
    return users.map(user => ({
      ...user,
      createdAt: new Date(user.createdAt),
      updatedAt: new Date(user.updatedAt)
    }));
  }

  /**
   * ユーザーの更新日時を更新（アクティビティ追跡用）
   */
  async touchUser(id: string): Promise<void> {
    this.updateUserUpdatedAt.run(id);
  }
}

export const userStorageDB = new UserStorageDB();
export const userStorage = userStorageDB;