import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl as awsGetSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3Client = new S3Client({
	region: process.env.AWS_REGION,
	endpoint: process.env.AWS_ENDPOINT,
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
	},
})

export async function getSignedUrl(key: string, expiresIn: number) {
	const command = new GetObjectCommand({
		Bucket: 'billing-saas-uploads',
		Key: key,
	})

	return awsGetSignedUrl(s3Client as any, command as any, { expiresIn })
}
