import { User, CreateUserRequest } from '@/types/user';
import { db, runInTransaction } from './database';
import bcrypt from 'bcryptjs';

class UserStorageDB {
  private insertUser = db.prepare(`
    INSERT INTO users (id, email, password, name, created_at, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  private selectUserByEmail = db.prepare(`
    SELECT * FROM users WHERE email = ?
  `);

  private selectUserById = db.prepare(`
    SELECT * FROM users WHERE id = ?
  `);

  private selectAllUsers = db.prepare(`
    SELECT id, email, name, created_at, updated_at FROM users
  `);

  private updateUserUpdatedAt = db.prepare(`
    UPDATE users SET updated_at = datetime('now') WHERE id = ?
  `);

  async createUser(request: CreateUserRequest, providedId?: string): Promise<User> {
    return runInTransaction(() => {
      // 既存ユーザーチェック
      const existingUser = this.selectUserByEmail.get(request.email) as User | undefined;
      if (existingUser) {
        throw new Error('User already exists');
      }

      // パスワードハッシュ化
      const hashedPassword = bcrypt.hashSync(request.password, 10);
      const userId = providedId || Math.random().toString(36).substring(2, 15);

      // ユーザー作成
      this.insertUser.run(userId, request.email, hashedPassword, request.name);

      // 作成されたユーザーを取得
      const user = this.selectUserById.get(userId) as User;
      
      return {
        ...user,
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.updatedAt)
      };
    });
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const user = this.selectUserByEmail.get(email) as User | undefined;
    
    if (!user) {
      return null;
    }

    return {
      ...user,
      createdAt: new Date(user.createdAt),
      updatedAt: new Date(user.updatedAt)
    };
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

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
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