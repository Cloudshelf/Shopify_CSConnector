import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export class S3Utils {
    static async UploadJsonFile(content: string, bucket: string, fileName: string) {
        const S3 = new S3Client({
            region: 'auto',
            endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
            credentials: {
                accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
                secretAccessKey: process.env.CLOUDFLARE_R2_ACCESS_KEY_SECRET!,
            },
        });

        const result = await S3.send(
            new PutObjectCommand({
                Bucket: bucket,
                ContentType: 'application/json',
                Key: fileName,
                Body: content,
            }),
        );

        if (result.$metadata.httpStatusCode !== 200) {
            return false;
        }
        return true;
    }
}
