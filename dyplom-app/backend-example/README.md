# Пример Backend для MongoDB

Это пример структуры backend сервера для работы с MongoDB Atlas.

## Быстрый старт

```bash
# Установите зависимости
npm install

# Создайте файл .env с вашими настройками MongoDB
cp .env.example .env

# Запустите сервер
npm run dev
```

## Структура проекта

```
backend/
├── config/
│   └── database.js       # Подключение к MongoDB
├── models/
│   ├── Event.js          # Модель события
│   ├── Booking.js        # Модель бронирования
│   ├── User.js           # Модель пользователя
│   └── Favorite.js       # Модель избранного
├── routes/
│   ├── events.js         # Роуты для событий
│   ├── bookings.js       # Роуты для бронирований
│   ├── auth.js           # Роуты для аутентификации
│   └── favorites.js      # Роуты для избранного
├── controllers/
│   └── eventController.js
├── middleware/
│   └── auth.js           # Middleware для проверки токенов
├── .env                  # Переменные окружения
├── .env.example          # Пример .env файла
├── server.js             # Главный файл сервера
└── package.json
```

## Установка

1. Создайте папку `backend` в корне проекта
2. Скопируйте файлы из этой папки
3. Установите зависимости: `npm install`
4. Настройте `.env` файл
5. Запустите: `npm run dev`

## MongoDB Atlas Setup

1. Создайте аккаунт на [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Создайте бесплатный кластер (M0)
3. Создайте пользователя базы данных
4. Получите connection string
5. Добавьте ваш IP в whitelist (или 0.0.0.0/0 для разработки)

## API Endpoints

### События
- `GET /api/events` - Получить все события
- `GET /api/events/:id` - Получить одно событие
- `POST /api/events` - Создать событие
- `PUT /api/events/:id` - Обновить событие
- `DELETE /api/events/:id` - Удалить событие

### Бронирования
- `GET /api/bookings` - Получить бронирования пользователя
- `POST /api/bookings` - Создать бронирование
- `DELETE /api/bookings/:id` - Отменить бронирование

### Избранное
- `GET /api/favorites` - Получить избранное
- `POST /api/favorites/:eventId` - Добавить в избранное
- `DELETE /api/favorites/:eventId` - Удалить из избранного
















