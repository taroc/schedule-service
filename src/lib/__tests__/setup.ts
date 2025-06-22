import { vi } from 'vitest';
import { mockPrisma } from './mocks/mockPrisma';

// Mock Prisma client globally
vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  default: {
    hashSync: vi.fn((password: string) => `hashed-${password}`),
    compareSync: vi.fn((plain: string, hashed: string) => hashed === `hashed-${plain}`),
  },
}));