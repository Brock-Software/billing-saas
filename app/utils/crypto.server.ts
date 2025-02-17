import CryptoES from 'crypto-es'

// Function to encrypt data
export const encryptData = (data: string, secretKey: string): string => {
	const encrypted = CryptoES.AES.encrypt(data, secretKey)
	return encrypted.toString()
}

// Function to decrypt data
export const decryptData = (
	encryptedData: string,
	secretKey: string,
): string => {
	const decrypted = CryptoES.AES.decrypt(encryptedData, secretKey)
	return decrypted.toString(CryptoES.enc.Utf8)
}
