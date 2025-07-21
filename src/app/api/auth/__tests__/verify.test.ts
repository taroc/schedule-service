import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../verify/route'

// モジュールのモック
vi.mock('@/lib/auth', () => ({
  verifyToken: vi.fn()
}))

vi.mock('@/lib/userStorage', () => ({
  userStorage: {
    getUserById: vi.fn(),
  }
}))

import { verifyToken } from '@/lib/auth'
import { userStorage } from '@/lib/userStorage'

describe('/api/auth/verify', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashed-password',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockRequest = (authHeader?: string) => {
    const headers: Record<string, string> = {}
    if (authHeader) {
      headers['authorization'] = authHeader
    }
    
    return new NextRequest('http://localhost:3000/api/auth/verify', {
      method: 'GET',
      headers,
    })
  }

  describe('successful verification', () => {
    it('should return user data when valid token provided', async () => {
      vi.mocked(verifyToken).mockReturnValue(mockUser)
      vi.mocked(userStorage.getUserById).mockResolvedValue(mockUser)
      
      const request = createMockRequest('Bearer valid-jwt-token')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        user: mockUser
      })
      
      expect(verifyToken).toHaveBeenCalledWith('valid-jwt-token')
      expect(userStorage.getUserById).toHaveBeenCalledWith(mockUser.id)
    })

    it('should handle token with extra spaces', async () => {
      vi.mocked(verifyToken).mockReturnValue(mockUser)
      vi.mocked(userStorage.getUserById).mockResolvedValue(mockUser)
      
      const request = createMockRequest('Bearer  valid-jwt-token  ')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user).toEqual(mockUser)
      expect(verifyToken).toHaveBeenCalledWith('valid-jwt-token')
      expect(userStorage.getUserById).toHaveBeenCalledWith(mockUser.id)
    })
  })

  describe('missing authorization header', () => {
    it('should return 401 when no authorization header provided', async () => {
      const request = createMockRequest()
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('No token provided')
      expect(verifyToken).not.toHaveBeenCalled()
    })

    it('should return 401 when authorization header is empty', async () => {
      const request = createMockRequest('')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('No token provided')
      expect(verifyToken).not.toHaveBeenCalled()
    })
  })

  describe('invalid authorization format', () => {
    it('should return 401 when authorization header does not start with "Bearer "', async () => {
      const request = createMockRequest('Basic dGVzdDp0ZXN0')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('No token provided')
      expect(verifyToken).not.toHaveBeenCalled()
    })

    it('should return 401 when authorization header only contains "Bearer"', async () => {
      const request = createMockRequest('Bearer')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('No token provided')
      expect(verifyToken).not.toHaveBeenCalled()
    })

    it('should return 401 when authorization header contains "Bearer " but no token', async () => {
      const request = createMockRequest('Bearer ')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('No token provided')
      expect(verifyToken).not.toHaveBeenCalled()
    })

    it('should handle case-sensitive Bearer keyword', async () => {
      const request = createMockRequest('bearer valid-jwt-token')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('No token provided')
      expect(verifyToken).not.toHaveBeenCalled()
    })
  })

  describe('invalid tokens', () => {
    it('should return 401 when token is invalid', async () => {
      vi.mocked(verifyToken).mockReturnValue(null)
      
      const request = createMockRequest('Bearer invalid-token')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid token')
      expect(verifyToken).toHaveBeenCalledWith('invalid-token')
    })

    it('should return 401 when token is expired', async () => {
      vi.mocked(verifyToken).mockReturnValue(null)
      
      const request = createMockRequest('Bearer expired-token')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid token')
      expect(verifyToken).toHaveBeenCalledWith('expired-token')
    })

    it('should return 401 when token is malformed', async () => {
      vi.mocked(verifyToken).mockReturnValue(null)
      
      const request = createMockRequest('Bearer not-a-jwt-token')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid token')
      expect(verifyToken).toHaveBeenCalledWith('not-a-jwt-token')
    })

    it('should return 401 when user not found in database', async () => {
      vi.mocked(verifyToken).mockReturnValue(mockUser)
      vi.mocked(userStorage.getUserById).mockResolvedValue(null)
      
      const request = createMockRequest('Bearer valid-token-but-user-deleted')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('User not found in database')
      expect(verifyToken).toHaveBeenCalledWith('valid-token-but-user-deleted')
      expect(userStorage.getUserById).toHaveBeenCalledWith(mockUser.id)
    })
  })

  describe('server errors', () => {
    it('should return 500 when verifyToken throws an error', async () => {
      vi.mocked(verifyToken).mockImplementation(() => {
        throw new Error('Token verification failed')
      })
      
      const request = createMockRequest('Bearer valid-token')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
      expect(verifyToken).toHaveBeenCalledWith('valid-token')
    })

    it('should handle unexpected errors gracefully', async () => {
      vi.mocked(verifyToken).mockImplementation(() => {
        throw new TypeError('Unexpected error')
      })
      
      const request = createMockRequest('Bearer valid-token')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('edge cases', () => {
    it('should handle very long tokens', async () => {
      const longToken = 'a'.repeat(10000)
      vi.mocked(verifyToken).mockReturnValue(mockUser)
      vi.mocked(userStorage.getUserById).mockResolvedValue(mockUser)
      
      const request = createMockRequest(`Bearer ${longToken}`)
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user).toEqual(mockUser)
      expect(verifyToken).toHaveBeenCalledWith(longToken)
      expect(userStorage.getUserById).toHaveBeenCalledWith(mockUser.id)
    })

    it('should handle special characters in token', async () => {
      const specialToken = 'abc.123+def/ghi='
      vi.mocked(verifyToken).mockReturnValue(mockUser)
      vi.mocked(userStorage.getUserById).mockResolvedValue(mockUser)
      
      const request = createMockRequest(`Bearer ${specialToken}`)
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user).toEqual(mockUser)
      expect(verifyToken).toHaveBeenCalledWith(specialToken)
      expect(userStorage.getUserById).toHaveBeenCalledWith(mockUser.id)
    })

    it('should handle multiple authorization headers (takes first one)', async () => {
      vi.mocked(verifyToken).mockReturnValue(mockUser)
      vi.mocked(userStorage.getUserById).mockResolvedValue(mockUser)
      
      const request = new NextRequest('http://localhost:3000/api/auth/verify', {
        method: 'GET',
        headers: new Headers([
          ['authorization', 'Bearer first-token'],
          ['authorization', 'Bearer second-token'],
        ]),
      })
      
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user).toEqual(mockUser)
      expect(verifyToken).toHaveBeenCalledWith('first-token, Bearer second-token')
      expect(userStorage.getUserById).toHaveBeenCalledWith(mockUser.id)
    })
  })
})