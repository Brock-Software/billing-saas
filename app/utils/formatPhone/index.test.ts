import { describe, it, expect } from 'vitest'

function formatPhoneNumber(phoneNumber: string): string {
	const cleaned = phoneNumber.replace(/\D/g, '')

	if (cleaned.length !== 10) {
		throw new Error('Invalid phone number length. Please provide 10 digits.')
	}

	const areaCode = cleaned.slice(0, 3)
	const firstPart = cleaned.slice(3, 6)
	const secondPart = cleaned.slice(6)

	return `(${areaCode}) ${firstPart}-${secondPart}`
}

describe('formatPhoneNumber', () => {
	it('should format a string of 10 digits correctly', () => {
		expect(formatPhoneNumber('1234567890')).toBe('(123) 456-7890')
	})

	it('should handle input with dashes', () => {
		expect(formatPhoneNumber('123-456-7890')).toBe('(123) 456-7890')
	})

	it('should handle input with parentheses and spaces', () => {
		expect(formatPhoneNumber('(123) 456-7890')).toBe('(123) 456-7890')
	})

	it('should handle input with mixed formatting', () => {
		expect(formatPhoneNumber('(123)456-78 90')).toBe('(123) 456-7890')
	})

	it('should throw an error for input with less than 10 digits', () => {
		expect(() => formatPhoneNumber('123456789')).toThrow(
			'Invalid phone number length. Please provide 10 digits.',
		)
	})

	it('should throw an error for input with more than 10 digits', () => {
		expect(() => formatPhoneNumber('12345678901')).toThrow(
			'Invalid phone number length. Please provide 10 digits.',
		)
	})

	it('should throw an error for input with no digits', () => {
		expect(() => formatPhoneNumber('abcdefghij')).toThrow(
			'Invalid phone number length. Please provide 10 digits.',
		)
	})

	it('should handle input with leading/trailing spaces', () => {
		expect(formatPhoneNumber(' 1234567890 ')).toBe('(123) 456-7890')
	})
})
