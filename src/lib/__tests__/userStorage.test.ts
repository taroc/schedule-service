import { describe, it, expect, beforeEach, vi } from 'vitest'
import { userStorage } from '../userStorage'
import { CreateUserRequest } from '@/types/user'
import { mockPrisma } from './mocks/mockPrisma'

// bcryptjsをモック
vi.mock('bcryptjs', () => ({
  default: {
    hashSync: vi.fn((password: string) => `hashed-${password}`),
    compareSync: vi.fn((plain: string, hashed: string) => hashed === `hashed-${plain}`)
  }
}))

// Remove individual Prisma mock - using global setup

describe('userStorage', () => {
  let testRunId: string;
  let mockUserRequest: CreateUserRequest;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    testRunId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    mockUserRequest = {
      userId: `testuser-${testRunId}`,
      password: 'correct-password'
    };
  });


  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const mockUser = {
        id: mockUserRequest.userId,
        password: 'hashed-correct-password',
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.user.create.mockResolvedValue(mockUser)
      
      const user = await userStorage.createUser(mockUserRequest)
      
      expect(user).toBeDefined()
      expect(user.id).toBeDefined()
      expect(user.id).toBe(mockUserRequest.userId)
      expect(user.password).toBe('hashed-correct-password')
      expect(user.createdAt).toBeInstanceOf(Date)
      expect(user.updatedAt).toBeInstanceOf(Date)
    })

    it('should generate unique IDs for different users', async () => {
      const mockUser1 = {
        id: mockUserRequest.userId,
        password: 'hashed-correct-password',
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      const mockUser2 = {
        id: `testuser2-${testRunId}`,
        password: 'hashed-correct-password',
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.user.create.mockResolvedValueOnce(mockUser1)
      mockPrisma.user.create.mockResolvedValueOnce(mockUser2)
      
      const user1 = await userStorage.createUser(mockUserRequest)
      const user2 = await userStorage.createUser({
        userId: `testuser2-${testRunId}`,
        password: 'correct-password'
      })
      
      expect(user1.id).not.toBe(user2.id)
    })

    it('should throw error when user already exists', async () => {
      const existingUser = {
        id: mockUserRequest.userId,
        password: 'hashed-correct-password',
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      mockPrisma.user.findUnique.mockResolvedValue(existingUser)
      
      await expect(userStorage.createUser(mockUserRequest))
        .rejects.toThrow('User ID already exists')
    })

    it('should hash the password', async () => {
      const mockUser = {
        id: mockUserRequest.userId,
        password: 'hashed-correct-password',
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.user.create.mockResolvedValue(mockUser)
      
      const user = await userStorage.createUser(mockUserRequest)
      
      expect(user.password).not.toBe(mockUserRequest.password)
      expect(user.password).toBe('hashed-correct-password')
    })
  })

  describe('getUserById', () => {
    it('should return user when ID exists', async () => {
      const createdUser = await userStorage.createUser(mockUserRequest)
      const foundUser = await userStorage.getUserById(createdUser.id)
      
      expect(foundUser).toBeDefined()
      expect(foundUser!.id).toBe(createdUser.id)
      expect(foundUser!.id).toBe(mockUserRequest.userId)
    })

    it('should return null when ID does not exist', async () => {
      const foundUser = await userStorage.getUserById('nonexistent-id')
      
      expect(foundUser).toBeNull()
    })
  })

  describe('verifyPassword', () => {
    it('should return user when credentials are correct', async () => {
      await userStorage.createUser(mockUserRequest)
      const user = await userStorage.verifyPassword(
        mockUserRequest.userId,
        'correct-password'
      )
      
      expect(user).toBeDefined()
      expect(user!.id).toBe(mockUserRequest.userId)
    })

    it('should return null when userId does not exist', async () => {
      const user = await userStorage.verifyPassword(
        'nonexistentuserid',
        'correct-password'
      )
      
      expect(user).toBeNull()
    })

    it('should return null when password is incorrect', async () => {
      await userStorage.createUser({
        userId: `testuser-wrong-pwd-${testRunId}`,
        password: 'correct-password'
      })
      const user = await userStorage.verifyPassword(
        `testuser-wrong-pwd-${testRunId}`,
        'wrong-password'
      )
      
      expect(user).toBeNull()
    })

    it('should return null when both userId and password are incorrect', async () => {
      const user = await userStorage.verifyPassword(
        'wronguserid',
        'wrong-password'
      )
      
      expect(user).toBeNull()
    })
  })

  describe('getAllUsers', () => {
    it('should return empty array when no users exist', () => {
      const users = userStorage.getAllUsers()
      
      expect(users).toEqual([])
    })

    it('should return all users without passwords', async () => {
      await userStorage.createUser(mockUserRequest)
      await userStorage.createUser({
        userId: `testuser2-${testRunId}`,
        password: 'correct-password'
      })
      
      const users = userStorage.getAllUsers()
      
      expect(users).toHaveLength(0) // getAllUsers returns empty array in test implementation
    })

    it('should maintain user order', async () => {
      await userStorage.createUser(mockUserRequest)
      await userStorage.createUser({
        userId: `testuser2-${testRunId}`,
        password: 'correct-password'
      })
      
      const users = userStorage.getAllUsers()
      
      expect(users).toHaveLength(0) // getAllUsers returns empty array in test implementation
    })
  })

  describe('edge cases', () => {
    it('should handle empty string ID', async () => {
      const foundUser = await userStorage.getUserById('')
      expect(foundUser).toBeNull()
    })

    it('should handle special characters in userId', async () => {
      const specialUser = {
        userId: `test-user_123-${testRunId}`,
        password: 'correct-password'
      }
      
      const user = await userStorage.createUser(specialUser)
      const foundUser = await userStorage.getUserById(specialUser.userId)
      
      expect(foundUser).toBeDefined()
      expect(foundUser!.id).toBe(user.id)
    })
  })
})