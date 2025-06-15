import { User, CreateUserRequest } from '@/types/user';
import bcrypt from 'bcryptjs';

class UserStorage {
  private users: User[] = [];

  async createUser(request: CreateUserRequest, providedId?: string): Promise<User> {
    const existingUser = this.users.find(u => u.email === request.email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    const hashedPassword = await bcrypt.hash(request.password, 10);
    const user: User = {
      id: providedId || Math.random().toString(36).substring(2, 15),
      email: request.email,
      password: hashedPassword,
      name: request.name,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.users.push(user);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.users.find(u => u.email === email) || null;
  }

  async getUserById(id: string): Promise<User | null> {
    return this.users.find(u => u.id === id) || null;
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }

  getAllUsers(): Omit<User, 'password'>[] {
    return this.users.map(({ password, ...user }) => user);
  }
}

export const userStorage = new UserStorage();