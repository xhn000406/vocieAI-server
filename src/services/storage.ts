import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as MinIO from 'minio';
import { initLogger } from '../config/logger';

const logger = initLogger();

let storageClient: MinIO.Client | S3Client | null = null;
let storageType: 'minio' | 's3' = 'minio';

// 初始化存储客户端
export function initStorage() {
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    // 使用 AWS S3
    storageClient = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    storageType = 's3';
    logger.info('✅ 使用 AWS S3 存储');
  } else {
    // 使用 MinIO
    storageClient = new MinIO.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000'),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    });
    storageType = 'minio';
    logger.info('✅ 使用 MinIO 存储');
  }
}

export async function uploadFile(file: Express.Multer.File, userId: string): Promise<string> {
  if (!storageClient) {
    initStorage();
  }

  const bucket = process.env.MINIO_BUCKET || process.env.AWS_S3_BUCKET || 'biji-files';
  const fileName = `${userId}/${Date.now()}-${file.originalname}`;

  try {
    if (storageType === 'minio') {
      const minioClient = storageClient as MinIO.Client;
      await minioClient.putObject(bucket, fileName, file.buffer, file.size, {
        'Content-Type': file.mimetype,
      });
      return `${process.env.MINIO_ENDPOINT || 'localhost'}:${process.env.MINIO_PORT || '9000'}/${bucket}/${fileName}`;
    } else {
      const s3Client = storageClient as S3Client;
      await s3Client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
      }));
      return `https://${bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${fileName}`;
    }
  } catch (error) {
    logger.error('文件上传失败:', error);
    throw error;
  }
}

export async function getFileUrl(fileId: string): Promise<string> {
  if (!storageClient) {
    initStorage();
  }

  const bucket = process.env.MINIO_BUCKET || process.env.AWS_S3_BUCKET || 'biji-files';

  try {
    if (storageType === 'minio') {
      const minioClient = storageClient as MinIO.Client;
      return await minioClient.presignedGetObject(bucket, fileId, 24 * 60 * 60); // 24小时有效期
    } else {
      const s3Client = storageClient as S3Client;
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: fileId,
      });
      return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    }
  } catch (error) {
    logger.error('获取文件URL失败:', error);
    throw error;
  }
}

export async function deleteFile(fileId: string): Promise<void> {
  if (!storageClient) {
    initStorage();
  }

  const bucket = process.env.MINIO_BUCKET || process.env.AWS_S3_BUCKET || 'biji-files';

  try {
    if (storageType === 'minio') {
      const minioClient = storageClient as MinIO.Client;
      await minioClient.removeObject(bucket, fileId);
    } else {
      const s3Client = storageClient as S3Client;
      await s3Client.send(new DeleteObjectCommand({
        Bucket: bucket,
        Key: fileId,
      }));
    }
  } catch (error) {
    logger.error('删除文件失败:', error);
    throw error;
  }
}

