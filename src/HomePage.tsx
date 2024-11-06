import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import CryptoJS from 'crypto-js';
import './App.css';

interface FormData {
  username: string;
  password: string;
}

interface HomePageProps {
  setMessage: (message: string) => void;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  setUsername: (username: string) => void;
}

const HomePage: React.FC<HomePageProps> = ({ setMessage, setIsAuthenticated, setUsername }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [encryptionKey, setEncryptionKey] = useState('');
  
 

  useEffect(() => {
    const fetchEncryptionKey = async () => {
      try {
        const response = await fetch('http://localhost:5000/generate-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (response.ok) {
          const data = await response.json();
          setEncryptionKey(data.keyHash);
        } else {
          console.error('Ошибка при получении хэша ключа');
        }
      } catch (error) {
        console.error('Ошибка сети при получении ключа:', error);
      }
    };

    fetchEncryptionKey();
  }, []);

  const onSubmit = async (data: FormData) => {
    try {
      const encryptedData = CryptoJS.AES.encrypt(JSON.stringify(data), encryptionKey).toString();
      const response = await fetch('http://localhost:5000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ encryptedData, encryptionKeyHash: encryptionKey }),
      });

      if (response.ok) {
        const result = await response.json();
        setIsAuthenticated(true);
        setUsername(result.user.username);
        navigate('/welcome');
      } else {
        const result = await response.json();
        setMessage(result.message || 'Ошибка');
        if (result.attemptsLeft !== undefined) setRemainingAttempts(result.attemptsLeft);
      }
    } catch {
      setMessage('Ошибка сети');
    }
  };

  return (
    <div className="form-container">
      <h1>Вход</h1>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="form-group">
          <label htmlFor="username">Логин:</label>
          <input
            type="text"
            id="username"
            {...register('username', { required: 'Логин обязателен' })}
            className={errors.username ? 'error' : ''}
          />
          {errors.username && <p className="error-message">{errors.username.message}</p>}
        </div>
        <div className="form-group password-group">
          <label htmlFor="password">Пароль:</label>
          <div className="password-input">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              {...register('password', { required: 'Пароль обязателен' })}
              className={errors.password ? 'error' : ''}
            />
            <button
              type="button"
              onMouseDown={() => setShowPassword(true)}
              onMouseUp={() => setShowPassword(false)}
              onMouseLeave={() => setShowPassword(false)}
              className="toggle-password-visibility"
            >
              👁️
            </button>
          </div>
          {errors.password && <p className="error-message">{errors.password.message}</p>}
        </div>

        <button type="submit" className="submit-button">Войти</button>
      </form>
      {remainingAttempts !== null && <p className="attempts-message">Осталось попыток: {remainingAttempts}</p>}
      <p>
        У вас нет аккаунта? <button onClick={() => navigate('/register')} className="link-button">Регистрация</button>
      </p>
    </div>
  );
};

export default HomePage;