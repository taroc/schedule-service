import { describe, it, expect, beforeEach, vi } from 'vitest'
import { userStorage } from '../userStorage'
import { CreateUserRequest } from '@/types/user'

// bcryptjsをモック
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-password'),
    compare: vi.fn().mockImplementation((plain, hashed) => 
      Promise.resolve(plain === 'correct-password' && hashed === 'hashed-password')
    )
  },
  hash: vi.fn().mockResolvedValue('hashed-password'),
  compare: vi.fn().mockImplementation((plain, hashed) => 
    Promise.resolve(plain === 'correct-password' && hashed === 'hashed-password')
  )
}))

describe('userStorage', () => {
  const mockUserRequest: CreateUserRequest = {
    userId: 'testuser',
    password: 'correct-password'
  }

  beforeEach(() => {
    // データベースベースのストレージのため、特別なクリア処理は不要
    // テスト関数が独立して実行される
  })

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const user = await userStorage.createUser(mockUserRequest)
      
      expect(user).toBeDefined()
      expect(user.id).toBeDefined()
      expect(user.id).toBe(mockUserRequest.userId)
      expect(user.password).toBe('hashed-password')
      expect(user.password).toBe('hashed-password')
      expect(user.createdAt).toBeInstanceOf(Date)
      expect(user.updatedAt).toBeInstanceOf(Date)
    })

    it('should generate unique IDs for different users', async () => {
      const user1 = await userStorage.createUser(mockUserRequest)
      const user2 = await userStorage.createUser({
        userId: 'testuser2',
        password: 'correct-password'
      })
      
      expect(user1.id).not.toBe(user2.id)
    })

    it('should throw error when user already exists', async () => {
      await userStorage.createUser(mockUserRequest)
      
      await expect(userStorage.createUser(mockUserRequest))
        .rejects.toThrow('User ID already exists')
    })

    it('should hash the password', async () => {
      const user = await userStorage.createUser(mockUserRequest)
      
      expect(user.password).not.toBe(mockUserRequest.password)
      expect(user.password).toBe('hashed-password')
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
    beforeEach(async () => {
      await userStorage.createUser(mockUserRequest)
    })

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
      await userStorage.createUser(mockUserRequest)
      const user = await userStorage.verifyPassword(
        mockUserRequest.userId,
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
        userId: 'testuser2',
        password: 'correct-password'
      })
      
      const users = userStorage.getAllUsers()
      
      expect(users).toHaveLength(2)
      expect(users[0]).not.toHaveProperty('password')
      expect(users[1]).not.toHaveProperty('password')
      expect(users[0]).toHaveProperty('id')
      expect(users[0]).toHaveProperty('id')
      expect(users[0]).toHaveProperty('createdAt')
    })

    it('should maintain user order', async () => {
      const user1 = await userStorage.createUser(mockUserRequest)
      const user2 = await userStorage.createUser({
        userId: 'testuser2',
        password: 'correct-password'
      })
      
      const users = userStorage.getAllUsers()
      
      expect(users[0].id).toBe(user1.id)
      expect(users[1].id).toBe(user2.id)
    })
  })

  describe('edge cases', () => {
    it('should handle empty string ID', async () => {
      const foundUser = await userStorage.getUserById('')
      expect(foundUser).toBeNull()
    })

    it('should handle special characters in userId', async () => {
      const specialUser = {
        userId: 'test-user_123',
        password: 'correct-password'
      }
      
      const user = await userStorage.createUser(specialUser)
      const foundUser = await userStorage.getUserById(specialUser.userId)
      
      expect(foundUser).toBeDefined()
      expect(foundUser!.id).toBe(user.id)
    })
  })
})