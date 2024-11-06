const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const winston = require('winston');
const csrf = require('csurf');
const crypto = require('crypto');
const CryptoJS = require('crypto-js');

const app = express();
const port = 5000;

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.json(),
    winston.format((info) => {
      if (info.message.includes('token') || info.message.includes('password')) {
        info.message = 'Sensitive data omitted';
      }
      return info;
    })()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(bodyParser.json());
app.use(cookieParser());

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'auth_db',
  password: '1',
  port: 5432,
});

const encryptionKeys = new Map();

app.post('/generate-key', (req, res) => {
  const encryptionKey = crypto.randomBytes(16).toString('hex');
  const userId = req.body.userId;
  const expirationTime = 300000;

  encryptionKeys.set(userId, encryptionKey);
  setTimeout(() => {
    encryptionKeys.delete(userId);
  }, expirationTime);

  res.json({ keyHash: encryptionKey });
});

app.post('/register', async (req, res) => {
  const { encryptedData, userId } = req.body;
  let encryptionKey = encryptionKeys.get(userId);

  if (!encryptionKey) {
    return res.status(403).json({ 
      message: 'Ключ шифрования истек или не существует. Пожалуйста, получите новый ключ.',
      refreshKey: true
    });
  }

  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
    const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    const { username, password } = decryptedData;

    if (!username || username.length < 3) {
      return res.status(400).json({ message: 'Логин должен содержать как минимум 3 символа.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Пароль должен содержать как минимум 6 символов.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (username, password) VALUES ($1, $2)',
      [username, hashedPassword]
    );

    res.status(201).json({ message: 'Пользователь успешно зарегистрирован! Теперь войдите.' });
  } catch (error) {
    if (error.code === '23505') {
      res.status(400).json({ message: 'Имя пользователя уже существует.' });
    } else {
      logger.error('Ошибка базы данных при регистрации:', error);
      res.status(500).json({ message: 'Ошибка базы данных' });
    }
  }
});

app.post('/login', async (req, res) => {
  const { encryptedData, userId } = req.body;
  let encryptionKey = encryptionKeys.get(userId);

  if (!encryptionKey) {
    return res.status(403).json({ 
      message: 'Ключ шифрования истек или не существует. Пожалуйста, получите новый ключ.',
      refreshKey: true
    });
  }

  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
    const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    const { username, password } = decryptedData;

    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Неверное имя пользователя или пароль.' });
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (isPasswordValid) {
      await pool.query('UPDATE users SET login_attempts = 0, first_attempt = NULL WHERE id = $1', [user.id]);
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'your_jwt_secret_key', { expiresIn: '1h' });
      res.cookie('jwt', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

      return res.status(200).json({
        message: 'Вход успешен! Добро пожаловать!',
        user: { id: user.id, username: user.username }
      });
    } else {
      await updateLoginAttempts(user.id, user.login_attempts);
      const attemptsLeft = 3 - (user.login_attempts + 1);
      res.status(400).json({
        message: 'Неверное имя пользователя или пароль.',
        attemptsLeft: attemptsLeft > 0 ? attemptsLeft : 0
      });
    }
  } catch (error) {
    logger.error('Ошибка базы данных при входе:', error);
    res.status(500).json({ message: 'Ошибка базы данных' });
  }
});

const updateLoginAttempts = async (userId, attempts) => {
  if (attempts < 2) {
    await pool.query('UPDATE users SET login_attempts = login_attempts + 1, first_attempt = COALESCE(first_attempt, NOW()) WHERE id = $1', [userId]);
  } else {
    await pool.query('UPDATE users SET login_attempts = login_attempts + 1 WHERE id = $1', [userId]);
  }
};

app.post('/logout', (req, res) => {
  res.clearCookie('jwt');
  res.status(200).json({ message: 'Успешный выход', loggedOut: true });
});

app.get('/protected', (req, res) => {
  const token = req.cookies.jwt;

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key', (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Token is invalid or expired.' });
    }

    res.status(200).json({ message: 'Вы авторизованы!', userId: decoded.userId });
  });
});

app.post('/additional-data', async (req, res) => {
  const { encryptedData, userId } = req.body;
  const encryptionKey = encryptionKeys.get(userId);

  if (!encryptionKey) {
    return res.status(403).json({ message: 'Ключ шифрования истек или не существует.' });
  }

  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
    const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

    const { userId: id, firstName, lastName, middleName, phoneNumber, email, city } = decryptedData;

    if (!id) {
      return res.status(400).json({ message: 'ID пользователя не предоставлен.' });
    }

    await pool.query(
      'INSERT INTO user_details (user_id, first_name, last_name, middle_name, phone_number, email, city) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, firstName, lastName, middleName, phoneNumber, email, city]
    );

    res.status(201).json({ message: 'Дополнительные данные успешно сохранены!' });
  } catch (error) {
    logger.error('Ошибка базы данных при сохранении дополнительных данных:', error);
    res.status(500).json({ message: 'Ошибка базы данных' });
  }
});

app.get('/get-user-id', async (req, res) => {
  const { username } = req.query;

  try {
    const result = await pool.query('SELECT id FROM users WHERE username = $1', [username]);

    if (result.rows.length > 0) {
      res.json({ userId: result.rows[0].id });
    } else {
      res.status(404).json({ message: 'Пользователь не найден' });
    }
  } catch (error) {
    console.error('Ошибка базы данных:', error);
    res.status(500).json({ message: 'Ошибка базы данных' });
  }
});

app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});
