const { PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client, S3_CONFIG } = require('../config/s3');
const crypto = require('crypto');
const path = require('path');

/**
 * Генерирует уникальное имя файла
 * @param {string} originalName - Оригинальное имя файла
 * @returns {string} Уникальное имя файла
 */
const generateFileName = (originalName) => {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  const extension = path.extname(originalName);
  const baseName = path.basename(originalName, extension).replace(/[^a-zA-Z0-9]/g, '-');
  
  return `events/${timestamp}-${randomString}-${baseName}${extension}`;
};

/**
 * Загружает файл в S3
 * @param {Buffer} fileBuffer - Буфер файла
 * @param {string} originalName - Оригинальное имя файла
 * @param {string} mimetype - MIME тип файла
 * @returns {Promise<string>} URL загруженного файла
 */
const uploadToS3 = async (fileBuffer, originalName, mimetype) => {
  try {
    const fileName = generateFileName(originalName);
    const contentType = mimetype || 'image/jpeg';

    const command = new PutObjectCommand({
      Bucket: S3_CONFIG.bucketName,
      Key: fileName,
      Body: fileBuffer,
      ContentType: contentType,
    });

    await s3Client.send(command);

    // Формируем публичный URL в формате: https://bucket.s3.region.amazonaws.com/key
    const fileUrl = `${S3_CONFIG.bucketUrl}/${fileName}`;
    
    return fileUrl;
  } catch (error) {
    console.error('Error uploading to S3:', error);
    
    // Обработка ошибки PermanentRedirect (неправильный регион)
    if (error.name === 'PermanentRedirect' || error.Code === 'PermanentRedirect') {
      const endpoint = error.Endpoint || error.endpoint;
      const bucketName = error.Bucket || S3_CONFIG.bucketName;
      
      if (endpoint) {
        // Извлекаем регион из endpoint (например: bucket.s3.eu-north-1.amazonaws.com)
        const regionMatch = endpoint.match(/s3\.([^.]+)\.amazonaws\.com/);
        if (regionMatch && regionMatch[1]) {
          const correctRegion = regionMatch[1];
          const errorMsg = `Неправильный регион S3. Bucket "${bucketName}" находится в регионе "${correctRegion}". ` +
                          `Пожалуйста, обновите AWS_REGION в .env файле на "${correctRegion}" и перезапустите сервер.`;
          throw new Error(errorMsg);
        }
      }
    }
    
    throw new Error(`Failed to upload file to S3: ${error.message}`);
  }
};

/**
 * Удаляет файл из S3
 * @param {string} fileUrl - URL файла для удаления
 * @returns {Promise<void>}
 */
const deleteFromS3 = async (fileUrl) => {
  try {
    // Извлекаем ключ из URL
    const urlParts = fileUrl.split('.amazonaws.com/');
    if (urlParts.length < 2) {
      throw new Error('Invalid S3 URL');
    }
    
    const key = urlParts[1];

    const command = new DeleteObjectCommand({
      Bucket: S3_CONFIG.bucketName,
      Key: key,
    });

    await s3Client.send(command);
    console.log(`File deleted from S3: ${key}`);
  } catch (error) {
    console.error('Error deleting from S3:', error);
    throw new Error(`Failed to delete file from S3: ${error.message}`);
  }
};

/**
 * Загружает несколько файлов в S3
 * @param {Array<{buffer: Buffer, originalname: string, mimetype: string}>} files - Массив файлов
 * @returns {Promise<string[]>} Массив URL загруженных файлов
 */
const uploadMultipleToS3 = async (files) => {
  try {
    const uploadPromises = files.map((file) =>
      uploadToS3(file.buffer, file.originalname, file.mimetype)
    );

    const urls = await Promise.all(uploadPromises);
    return urls;
  } catch (error) {
    console.error('Error uploading multiple files to S3:', error);
    throw error;
  }
};

module.exports = {
  uploadToS3,
  uploadMultipleToS3,
  deleteFromS3,
  generateFileName,
};

