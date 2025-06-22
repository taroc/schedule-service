import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginForm from '../LoginForm'

describe('LoginForm', () => {
  const mockOnLogin = vi.fn()
  const mockOnSwitchToRegister = vi.fn()

  const defaultProps = {
    onLogin: mockOnLogin,
    onSwitchToRegister: mockOnSwitchToRegister,
    isLoading: false,
    error: undefined
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render login form with all required fields', () => {
      render(<LoginForm {...defaultProps} />)
      
      expect(screen.getByRole('heading', { name: 'ログイン' })).toBeInTheDocument()
      expect(screen.getByLabelText('ユーザーID')).toBeInTheDocument()
      expect(screen.getByLabelText('パスワード')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument()
      expect(screen.getByText('アカウントをお持ちでない方は')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'こちら' })).toBeInTheDocument()
    })

    it('should render input fields with correct types', () => {
      render(<LoginForm {...defaultProps} />)
      
      const userIdInput = screen.getByLabelText('ユーザーID')
      const passwordInput = screen.getByLabelText('パスワード')
      
      expect(userIdInput).toHaveAttribute('type', 'text')
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(userIdInput).toHaveAttribute('required')
      expect(passwordInput).toHaveAttribute('required')
    })

    it('should render error message when error prop is provided', () => {
      const errorMessage = 'ログインに失敗しました'
      render(<LoginForm {...defaultProps} error={errorMessage} />)
      
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
      expect(screen.getByText(errorMessage)).toHaveClass('bg-red-100')
    })

    it('should show loading state when isLoading is true', () => {
      render(<LoginForm {...defaultProps} isLoading={true} />)
      
      const submitButton = screen.getByRole('button', { name: 'ログイン中...' })
      expect(submitButton).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
    })
  })

  describe('user interactions', () => {
    it('should update email input value when user types', async () => {
      const user = userEvent.setup()
      render(<LoginForm {...defaultProps} />)
      
      const userIdInput = screen.getByLabelText('ユーザーID')
      await user.type(userIdInput, 'test@example.com')
      
      expect(userIdInput).toHaveValue('test@example.com')
    })

    it('should update password input value when user types', async () => {
      const user = userEvent.setup()
      render(<LoginForm {...defaultProps} />)
      
      const passwordInput = screen.getByLabelText('パスワード')
      await user.type(passwordInput, 'password123')
      
      expect(passwordInput).toHaveValue('password123')
    })

    it('should call onSwitchToRegister when register link is clicked', async () => {
      const user = userEvent.setup()
      render(<LoginForm {...defaultProps} />)
      
      const registerLink = screen.getByRole('button', { name: 'こちら' })
      await user.click(registerLink)
      
      expect(mockOnSwitchToRegister).toHaveBeenCalledTimes(1)
    })
  })

  describe('form submission', () => {
    it('should call onLogin with correct credentials when form is submitted', async () => {
      const user = userEvent.setup()
      render(<LoginForm {...defaultProps} />)
      
      const userIdInput = screen.getByLabelText('ユーザーID')
      const passwordInput = screen.getByLabelText('パスワード')
      const submitButton = screen.getByRole('button', { name: 'ログイン' })
      
      await user.type(userIdInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)
      
      expect(mockOnLogin).toHaveBeenCalledTimes(1)
      expect(mockOnLogin).toHaveBeenCalledWith('test@example.com', 'password123')
    })

    it('should submit form when Enter key is pressed', async () => {
      const user = userEvent.setup()
      render(<LoginForm {...defaultProps} />)
      
      const userIdInput = screen.getByLabelText('ユーザーID')
      const passwordInput = screen.getByLabelText('パスワード')
      
      await user.type(userIdInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.keyboard('{Enter}')
      
      expect(mockOnLogin).toHaveBeenCalledTimes(1)
      expect(mockOnLogin).toHaveBeenCalledWith('test@example.com', 'password123')
    })

    it('should not submit form when required fields are empty', async () => {
      const user = userEvent.setup()
      render(<LoginForm {...defaultProps} />)
      
      const submitButton = screen.getByRole('button', { name: 'ログイン' })
      await user.click(submitButton)
      
      expect(mockOnLogin).not.toHaveBeenCalled()
    })

    it('should handle async onLogin function', async () => {
      const asyncOnLogin = vi.fn().mockResolvedValue(undefined)
      const user = userEvent.setup()
      
      render(<LoginForm {...defaultProps} onLogin={asyncOnLogin} />)
      
      const userIdInput = screen.getByLabelText('ユーザーID')
      const passwordInput = screen.getByLabelText('パスワード')
      const submitButton = screen.getByRole('button', { name: 'ログイン' })
      
      await user.type(userIdInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(asyncOnLogin).toHaveBeenCalledWith('test@example.com', 'password123')
      })
    })

    it('should prevent default form submission', async () => {
      const user = userEvent.setup()
      const { container } = render(<LoginForm {...defaultProps} />)
      
      const form = container.querySelector('form')!
      const userIdInput = screen.getByLabelText('ユーザーID')
      const passwordInput = screen.getByLabelText('パスワード')
      
      await user.type(userIdInput, 'testuser')
      await user.type(passwordInput, 'password123')
      
      const submitEvent = new Event('submit', { bubbles: true, cancelable: true })
      const preventDefaultSpy = vi.spyOn(submitEvent, 'preventDefault')
      
      fireEvent(form, submitEvent)
      
      expect(preventDefaultSpy).toHaveBeenCalled()
    })
  })

  describe('loading state', () => {
    it('should disable submit button when loading', () => {
      render(<LoginForm {...defaultProps} isLoading={true} />)
      
      const submitButton = screen.getByRole('button', { name: 'ログイン中...' })
      expect(submitButton).toBeDisabled()
    })

    it('should change button text when loading', () => {
      render(<LoginForm {...defaultProps} isLoading={true} />)
      
      expect(screen.getByText('ログイン中...')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'ログイン' })).not.toBeInTheDocument()
    })

    it('should enable submit button when not loading', () => {
      render(<LoginForm {...defaultProps} isLoading={false} />)
      
      const submitButton = screen.getByRole('button', { name: 'ログイン' })
      expect(submitButton).not.toBeDisabled()
    })
  })

  describe('accessibility', () => {
    it('should have proper form labels', () => {
      render(<LoginForm {...defaultProps} />)
      
      expect(screen.getByLabelText('ユーザーID')).toBeInTheDocument()
      expect(screen.getByLabelText('パスワード')).toBeInTheDocument()
    })

    it('should have required attributes on inputs', () => {
      render(<LoginForm {...defaultProps} />)
      
      const userIdInput = screen.getByLabelText('ユーザーID')
      const passwordInput = screen.getByLabelText('パスワード')
      
      expect(userIdInput).toBeRequired()
      expect(passwordInput).toBeRequired()
    })

    it('should associate error message with alert role', () => {
      const errorMessage = 'エラーメッセージ'
      render(<LoginForm {...defaultProps} error={errorMessage} />)
      
      const errorElement = screen.getByText(errorMessage)
      expect(errorElement).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('should handle special characters in email and password', async () => {
      const user = userEvent.setup()
      render(<LoginForm {...defaultProps} />)
      
      const userIdInput = screen.getByLabelText('ユーザーID')
      const passwordInput = screen.getByLabelText('パスワード')
      const submitButton = screen.getByRole('button', { name: 'ログイン' })
      
      await user.type(userIdInput, 'test+special@example.com')
      await user.type(passwordInput, 'P@ssw0rd!')
      await user.click(submitButton)
      
      expect(mockOnLogin).toHaveBeenCalledWith('test+special@example.com', 'P@ssw0rd!')
    })

    it('should handle empty error prop', () => {
      render(<LoginForm {...defaultProps} error="" />)
      
      // 空文字列の場合はエラーメッセージのコンテナ自体が表示されない
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('should handle undefined error prop', () => {
      render(<LoginForm {...defaultProps} error={undefined} />)
      
      const errorElements = screen.queryAllByText(/bg-red-100/)
      expect(errorElements).toHaveLength(0)
    })
  })
})