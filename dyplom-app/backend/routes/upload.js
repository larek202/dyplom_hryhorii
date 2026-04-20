const express = require('express');
const router = express.Router();
const { uploadMultiple } = require('../middleware/upload');
const { uploadMultipleToS3, deleteFromS3 } = require('../utils/s3Upload');
const User = require('../models/User');

// Middleware для проверки аутентификации
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Brak tokenu' });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ error: 'Nie znaleziono użytkownika' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Nieprawidłowy lub wygasły token' });
    }
    res.status(500).json({ error: error.message });
  }
};

// POST /api/upload - Загрузить изображения
router.post('/', authenticate, uploadMultiple, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Brak plików do przesłania' });
    }

    // Walidacja liczby plików
    if (req.files.length > 10) {
      return res.status(400).json({ error: 'Maksymalnie 10 obrazów jednorazowo' });
    }

    // Загружаем файлы в S3
    const urls = await uploadMultipleToS3(req.files);

    res.status(200).json({
      success: true,
      images: urls,
      count: urls.length,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: 'Błąd podczas przesyłania obrazów',
      message: error.message,
    });
  }
});

// DELETE /api/upload/:imageUrl - Usuń obraz
router.delete('/:imageUrl', authenticate, async (req, res) => {
  try {
    const imageUrl = decodeURIComponent(req.params.imageUrl);
    
    if (!imageUrl || !imageUrl.includes('amazonaws.com')) {
      return res.status(400).json({ error: 'Nieprawidłowy URL obrazu' });
    }

    await deleteFromS3(imageUrl);

    res.status(200).json({
      success: true,
      message: 'Obraz został usunięty',
    });
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({
      error: 'Błąd podczas usuwania obrazu',
      message: error.message,
    });
  }
});

module.exports = router;


