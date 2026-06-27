import { describe, it, expect } from 'vitest'
import {
  validateEmail,
  validatePasswordStrength,
} from '../context/AuthContext'

describe('AuthContext Utils', () => {
  describe('validateEmail', () => {
    it('should validate correct email', () => {
      expect(validateEmail('test@example.com')).toBe(true)
      expect(validateEmail('user.name@domain.org')).toBe(true)
    })

    it('should reject invalid email', () => {
      expect(validateEmail('invalid')).toBe(false)
      expect(validateEmail('test@')).toBe(false)
      expect(validateEmail('@example.com')).toBe(false)
      expect(validateEmail('')).toBe(false)
    })
  })

  describe('validatePasswordStrength', () => {
    it('should reject short password', () => {
      const result = validatePasswordStrength('short')
      expect(result.valid).toBe(false)
      expect(result.messages).toContain('密码长度至少8位')
    })

    it('should accept valid password', () => {
      const result = validatePasswordStrength('Password123!')
      expect(result.valid).toBe(true)
      expect(result.score).toBeGreaterThan(4)
    })

    it('should return messages for weak password', () => {
      const result = validatePasswordStrength('password')
      expect(result.messages.length).toBeGreaterThan(0)
    })
  })
})