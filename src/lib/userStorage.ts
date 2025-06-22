import { User, CreateUserRequest } from '@/types/user';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

class UserStoragePrisma {
  async createUser(request: CreateUserRequest, providedId?: string): Promise<User> {
    const userId = providedId || request.userId;
    
    // 既存ユーザーIDチェック
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (existingUser) {
      throw new Error('User ID already exists');
    }

    // パスワードハッシュ化
    const hashedPassword = bcrypt.hashSync(request.password, 10);

    // ユーザー作成
    const user = await prisma.user.create({
      data: {
        id: userId,
        password: hashedPassword,
      }
    });

    return {
      id: user.id,
      password: user.password,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  async getUserById(id: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { id }
    });
    
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      password: user.password,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
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
    // このメソッドは同期的に実装されているため空配列を返す
    // 実際のアプリケーションでは使用されていない
    return [];
  }

  async touchUser(id: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: { updatedAt: new Date() }
    });
  }
}

export const userStorage = new UserStoragePrisma();