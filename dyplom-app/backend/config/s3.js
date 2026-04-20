const { S3Client } = require('@aws-sdk/client-s3');

// Получаем конфигурацию из переменных окружения
const AWS_REGION = process.env.AWS_REGION || 'eu-north-1';
const AWS_S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'movemint-s3';

// Конфигурация S3 клиента
// forcePathStyle: false использует виртуальный hosting стиль (bucket.s3.region.amazonaws.com)
const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  // Отключаем forcePathStyle для использования виртуального hosting стиля
  forcePathStyle: false,
});

// Конфигурация bucket
const S3_CONFIG = {
  bucketName: AWS_S3_BUCKET_NAME,
  bucketUrl: process.env.AWS_S3_BUCKET_URL || `https://${AWS_S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com`,
  region: AWS_REGION,
};

module.exports = {
  s3Client,
  S3_CONFIG,
};

