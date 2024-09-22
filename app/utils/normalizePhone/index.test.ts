import { describe, it, expect } from 'vitest'
import { normalizePhone } from '.' // Adjust the import path to where your function is

describe('normalizePhone', () => {
	it('should remove country code and non-digit characters from US phone numbers', () => {
		expect(normalizePhone('+17708208961')).toBe('7708208961')
	})

	it('should handle phone numbers formatted with parentheses and hyphens', () => {
		expect(normalizePhone('(770) 820-8961')).toBe('7708208961')
	})

	it('should return the number as is if it is already in the correct format', () => {
		expect(normalizePhone('7708208961')).toBe('7708208961')
	})

	it('should correctly handle numbers with spaces and other special characters', () => {
		expect(normalizePhone('770 820 8961')).toBe('7708208961')
		expect(normalizePhone('770-820-8961')).toBe('7708208961')
	})

	it('should ignore leading 1 in an 11-digit number', () => {
		expect(normalizePhone('17708208961')).toBe('7708208961')
	})

	it('should handle incorrect formats by removing non-digit characters', () => {
		expect(normalizePhone('Call: 770-820-8961 today!')).toBe('7708208961')
	})
})
