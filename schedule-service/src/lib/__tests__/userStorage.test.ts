import { describe, it, expect, beforeEach, vi } from 'vitest'
import { userStorageDB as userStorage } from '../userStorage'
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
    email: 'test@example.com',
    password: 'correct-password',
    name: 'Test User'
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
      expect(user.email).toBe(mockUserRequest.email)
      expect(user.name).toBe(mockUserRequest.name)
      expect(user.password).toBe('hashed-password')
      expect(user.createdAt).toBeInstanceOf(Date)
      expect(user.updatedAt).toBeInstanceOf(Date)
    })

    it('should generate unique IDs for different users', async () => {
      const user1 = await userStorage.createUser(mockUserRequest)
      const user2 = await userStorage.createUser({
        ...mockUserRequest,
        email: 'test2@example.com'
      })
      
      expect(user1.id).not.toBe(user2.id)
    })

    it('should throw error when user already exists', async () => {
      await userStorage.createUser(mockUserRequest)
      
      await expect(userStorage.createUser(mockUserRequest))
        .rejects.toThrow('User already exists')
    })

    it('should hash the password', async () => {
      const user = await userStorage.createUser(mockUserRequest)
      
      expect(user.password).not.toBe(mockUserRequest.password)
      expect(user.password).toBe('hashed-password')
    })
  })

  describe('getUserByEmail', () => {
    it('should return user when email exists', async () => {
      const createdUser = await userStorage.createUser(mockUserRequest)
      const foundUser = await userStorage.getUserByEmail(mockUserRequest.email)
      
      expect(foundUser).toBeDefined()
      expect(foundUser!.id).toBe(createdUser.id)
      expect(foundUser!.email).toBe(mockUserRequest.email)
    })

    it('should return null when email does not exist', async () => {
      const foundUser = await userStorage.getUserByEmail('nonexistent@example.com')
      
      expect(foundUser).toBeNull()
    })

    it('should be case sensitive', async () => {
      await userStorage.createUser(mockUserRequest)
      const foundUser = await userStorage.getUserByEmail('TEST@EXAMPLE.COM')
      
      expect(foundUser).toBeNull()
    })
  })

  describe('getUserById', () => {
    it('should return user when ID exists', async () => {
      const createdUser = await userStorage.createUser(mockUserRequest)
      const foundUser = await userStorage.getUserById(createdUser.id)
      
      expect(foundUser).toBeDefined()
      expect(foundUser!.id).toBe(createdUser.id)
      expect(foundUser!.email).toBe(mockUserRequest.email)
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
      const user = await userStorage.verifyPassword(
        mockUserRequest.email,
        'correct-password'
      )
      
      expect(user).toBeDefined()
      expect(user!.email).toBe(mockUserRequest.email)
    })

    it('should return null when email does not exist', async () => {
      const user = await userStorage.verifyPassword(
        'nonexistent@example.com',
        'correct-password'
      )
      
      expect(user).toBeNull()
    })

    it('should return null when password is incorrect', async () => {
      const user = await userStorage.verifyPassword(
        mockUserRequest.email,
        'wrong-password'
      )
      
      expect(user).toBeNull()
    })

    it('should return null when both email and password are incorrect', async () => {
      const user = await userStorage.verifyPassword(
        'wrong@example.com',
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
        ...mockUserRequest,
        email: 'test2@example.com',
        name: 'Test User 2'
      })
      
      const users = userStorage.getAllUsers()
      
      expect(users).toHaveLength(2)
      expect(users[0]).not.toHaveProperty('password')
      expect(users[1]).not.toHaveProperty('password')
      expect(users[0]).toHaveProperty('id')
      expect(users[0]).toHaveProperty('email')
      expect(users[0]).toHaveProperty('name')
    })

    it('should maintain user order', async () => {
      const user1 = await userStorage.createUser(mockUserRequest)
      const user2 = await userStorage.createUser({
        ...mockUserRequest,
        email: 'test2@example.com'
      })
      
      const users = userStorage.getAllUsers()
      
      expect(users[0].id).toBe(user1.id)
      expect(users[1].id).toBe(user2.id)
    })
  })

  describe('edge cases', () => {
    it('should handle empty string email', async () => {
      const foundUser = await userStorage.getUserByEmail('')
      expect(foundUser).toBeNull()
    })

    it('should handle empty string ID', async () => {
      const foundUser = await userStorage.getUserById('')
      expect(foundUser).toBeNull()
    })

    it('should handle special characters in email', async () => {
      const specialEmailUser = {
        ...mockUserRequest,
        email: 'test+special@example.com'
      }
      
      const user = await userStorage.createUser(specialEmailUser)
      const foundUser = await userStorage.getUserByEmail(specialEmailUser.email)
      
      expect(foundUser).toBeDefined()
      expect(foundUser!.id).toBe(user.id)
    })
  })
})