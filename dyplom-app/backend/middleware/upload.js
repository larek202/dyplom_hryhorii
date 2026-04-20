const multer = require('multer');
const path = require('path');

// Настройка multer для обработки файлов в памяти (буфер)
const storage = multer.memoryStorage();

// Фильтр файлов - принимаем только изображения
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Только изображения (JPEG, PNG, GIF, WebP) разрешены!'), false);
  }
};

// Настройка multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB na plik (zdjęcia z nowoczesnych aparatów)
  },
  fileFilter: fileFilter,
});

// Middleware для загрузки одного изображения
const uploadSingle = upload.single('image');

// Middleware для загрузки нескольких изображений (максимум 10)
// Wydarzenia: max 5 zdjęć na rekord (walidacja w routes/events); upload używany też przez profil — pozwalamy do 10 w jednym żądaniu
const uploadMultiple = upload.array('images', 10);

module.exports = {
  uploadSingle,
  uploadMultiple,
  upload,
};















