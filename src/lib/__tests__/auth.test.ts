import { describe, it, expect, beforeEach, vi } from 'vitest'
import { UserSession } from '@/types/user'

describe('auth utilities', () => {
  let generateToken: (user: UserSession) => string
  let verifyToken: (token: string) => UserSession | null

  beforeEach(async () => {
    vi.resetModules()
    // 毎回新しいモジュールをインポート
    const authModule = await import('../auth')
    generateToken = authModule.generateToken
    verifyToken = authModule.verifyToken
  })

  const mockUser: UserSession = {
    id: 'test-user-id'
  }

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken(mockUser)
      
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(0)
      // JWT形式かチェック（3つの部分がドットで区切られている）
      expect(token.split('.')).toHaveLength(3)
    })

    it('should generate different tokens for different users', () => {
      const user1: UserSession = { ...mockUser, id: 'user1' }
      const user2: UserSession = { ...mockUser, id: 'user2' }
      
      const token1 = generateToken(user1)
      const token2 = generateToken(user2)
      
      expect(token1).not.toBe(token2)
    })
  })

  describe('verifyToken', () => {
    it('should verify a valid token and return user data', () => {
      const token = generateToken(mockUser)
      const result = verifyToken(token)
      
      expect(result).toBeDefined()
      expect(result!.id).toBe(mockUser.id)
    })

    it('should return null for invalid token', () => {
      const invalidToken = 'invalid.token.here'
      const result = verifyToken(invalidToken)
      
      expect(result).toBeNull()
    })

    it('should return null for malformed token', () => {
      const malformedToken = 'not-a-jwt-token'
      const result = verifyToken(malformedToken)
      
      expect(result).toBeNull()
    })

    it('should return null for empty token', () => {
      const result = verifyToken('')
      
      expect(result).toBeNull()
    })
  })

  describe('token lifecycle', () => {
    it('should create and verify token successfully', () => {
      // トークン生成
      const token = generateToken(mockUser)
      expect(token).toBeDefined()
      
      // トークン検証
      const verifiedUser = verifyToken(token)
      expect(verifiedUser).toEqual(
        expect.objectContaining({
          id: mockUser.id
        })
      )
    })

    it('should include expiration in token', () => {
      const token = generateToken(mockUser)
      const verifiedUser = verifyToken(token)
      
      // JWTには通常 iat (issued at) と exp (expiration) が含まれる
      expect(verifiedUser).toHaveProperty('iat')
      expect(verifiedUser).toHaveProperty('exp')
    })
  })
})