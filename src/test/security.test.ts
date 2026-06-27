import { describe, it, expect } from 'vitest'
import {
  escapeHtml,
  stripHtml,
  sanitizeInput,
  isValidEmail,
  isValidPhone,
  isValidUrl,
  isValidUsername,
  isValidPace,
  isValidDuration,
  isValidDate,
  isInRange,
} from '../utils/security'

describe('Security Utils', () => {
  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      )
    })

    it('should escape ampersand', () => {
      expect(escapeHtml('a & b')).toBe('a &amp; b')
    })

    it('should return empty string for empty input', () => {
      expect(escapeHtml('')).toBe('')
    })
  })

  describe('stripHtml', () => {
    it('should remove HTML tags', () => {
      expect(stripHtml('<p>Hello</p>')).toBe('Hello')
      expect(stripHtml('<div><span>Test</span></div>')).toBe('Test')
    })

    it('should handle nested tags', () => {
      expect(stripHtml('<div><p><b>Bold</b></p></div>')).toBe('Bold')
    })

    it('should return empty string for empty input', () => {
      expect(stripHtml('')).toBe('')
    })
  })

  describe('sanitizeInput', () => {
    it('should remove HTML tags', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('alert("xss")')
    })

    it('should remove javascript: protocol', () => {
      expect(sanitizeInput('javascript:alert(1)')).toBe('alert(1)')
    })

    it('should limit input length', () => {
      const longInput = 'a'.repeat(15000)
      const result = sanitizeInput(longInput)
      expect(result.length).toBeLessThanOrEqual(10000)
    })
  })

  describe('isValidEmail', () => {
    it('should validate correct email', () => {
      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('user.name@domain.org')).toBe(true)
    })

    it('should reject invalid email', () => {
      expect(isValidEmail('invalid')).toBe(false)
      expect(isValidEmail('test@')).toBe(false)
      expect(isValidEmail('@example.com')).toBe(false)
    })
  })

  describe('isValidPhone', () => {
    it('should validate Chinese phone numbers', () => {
      expect(isValidPhone('13812345678')).toBe(true)
      expect(isValidPhone('15912345678')).toBe(true)
    })

    it('should reject invalid phone numbers', () => {
      expect(isValidPhone('12345678901')).toBe(false)
      expect(isValidPhone('1381234567')).toBe(false)
    })
  })

  describe('isValidUrl', () => {
    it('should validate correct URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true)
      expect(isValidUrl('http://localhost:3000')).toBe(true)
    })

    it('should reject invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false)
      expect(isValidUrl('')).toBe(false)
    })
  })

  describe('isValidUsername', () => {
    it('should validate correct usernames', () => {
      expect(isValidUsername('test_user')).toBe(true)
      expect(isValidUsername('用户名')).toBe(true)
      expect(isValidUsername('Test123')).toBe(true)
    })

    it('should reject invalid usernames', () => {
      expect(isValidUsername('a')).toBe(false) // too short
      expect(isValidUsername('verylongusernamethatiswaytoobig')).toBe(false) // too long
      expect(isValidUsername('test@user')).toBe(false) // invalid character
    })
  })

  describe('isValidPace', () => {
    it('should validate correct pace format', () => {
      expect(isValidPace('5:30')).toBe(true)
      expect(isValidPace('4:00')).toBe(true)
      expect(isValidPace('10:15')).toBe(true)
    })

    it('should reject invalid pace format', () => {
      expect(isValidPace('5:70')).toBe(false) // seconds > 60
      expect(isValidPace('35:00')).toBe(false) // minutes > 30
      expect(isValidPace('530')).toBe(false) // missing colon
    })
  })

  describe('isValidDuration', () => {
    it('should validate correct duration format', () => {
      expect(isValidDuration('1:30')).toBe(true)
      expect(isValidDuration('45:00')).toBe(true)
    })

    it('should reject invalid duration format', () => {
      expect(isValidDuration('1:70')).toBe(false)
      expect(isValidDuration('abc')).toBe(false)
    })
  })

  describe('isValidDate', () => {
    it('should validate correct date format', () => {
      expect(isValidDate('2024-01-15')).toBe(true)
      expect(isValidDate('2023-12-31')).toBe(true)
    })

    it('should reject invalid date format', () => {
      expect(isValidDate('2024/01/15')).toBe(false)
      expect(isValidDate('01-15-2024')).toBe(false)
      expect(isValidDate('invalid')).toBe(false)
    })
  })

  describe('isInRange', () => {
    it('should validate numbers in range', () => {
      expect(isInRange(5, 1, 10)).toBe(true)
      expect(isInRange(1, 1, 10)).toBe(true)
      expect(isInRange(10, 1, 10)).toBe(true)
    })

    it('should reject numbers outside range', () => {
      expect(isInRange(0, 1, 10)).toBe(false)
      expect(isInRange(11, 1, 10)).toBe(false)
    })
  })
})