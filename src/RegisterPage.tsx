import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import CryptoJS from 'crypto-js';
import './App.css';

interface FormData {
  username: string;
  password: string;
}

interface RegisterPageProps {
  setMessage: (message: string) => void;
}

const RegisterPage: React.FC<RegisterPageProps> = React.memo(({ setMessage }) => {
  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormData>();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [passwordCriteria, setPasswordCriteria] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    specialChar: false,
  });

  const password = watch('password', '');
  const [encryptionKey, setEncryptionKey] = useState<string | null>(null);

  const fetchEncryptionKey = async () => {
    try {
      const response = await fetch('http://localhost:5000/generate-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      if (response.ok) {
        const { keyHash } = await response.json();
        setEncryptionKey(keyHash);
      } else {
        setMessage('Ошибка при получении ключа шифрования');
      }
    } catch (error) {
      setMessage('Ошибка сети при получении ключа шифрования');
    }
  };

  const encryptData = (data: FormData) => {
    const jsonData = JSON.stringify(data);
    return CryptoJS.AES.encrypt(jsonData, encryptionKey!).toString();
  };

  const fetchUserId = async (username: string) => {
    try {
      const response = await fetch(`http://localhost:5000/get-user-id?username=${username}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        return result.userId;
      } else {
        setMessage('Ошибка при получении ID пользователя');
      }
    } catch (error) {
      setMessage('Ошибка сети при получении ID пользователя');
    }
  };

  const onSubmit = async (data: FormData) => {
    const url = 'http://localhost:5000/register';
    const encryptedData = encryptData(data);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ encryptedData, encryptionKey }),
      });

      if (response.ok) {
        setMessage('Регистрация прошла успешно');

        const userId = await fetchUserId(data.username);

        if (userId) {
          navigate('/additional-data', { state: { userId } });
        }
      } else {
        const result = await response.json();
        setMessage(result.message || 'Ошибка при регистрации');
      }
    } catch (error) {
      setMessage('Ошибка сети при регистрации');
    }
  };

  useEffect(() => {
    fetchEncryptionKey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setMessage('');
  }, [setMessage]);

  const checkPasswordCriteria = useCallback((value: string) => {
    setPasswordCriteria({
      length: value.length >= 8,
      uppercase: /[A-Z]/.test(value),
      lowercase: /[a-z]/.test(value),
      number: /\d/.test(value),
      specialChar: /[!@#$%^&*(),.?":{}|<>]/.test(value),
    });
  }, []);

  useEffect(() => {
    checkPasswordCriteria(password);
  }, [password, checkPasswordCriteria]);

  const validateUsername = (value: string) => {
    const isValid = /^[A-Za-z0-9_]+$/.test(value);
    if (!isValid) {
      return 'Логин может содержать только буквы, цифры и символ "_"';
    }
    return true;
  };

  return (
    <div className="form-container">
      <h1>Регистрация</h1>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="form-group">
          <label htmlFor="username">Логин:</label>
          <input
            type="text"
            id="username"
            {...register('username', { 
              required: 'Логин обязателен',
              validate: validateUsername
            })}
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

        <div className="password-requirements">
          <h3>Требования к паролю:</h3>
          <div className="requirements-checkboxes">
            <label className={`requirement ${passwordCriteria.length ? 'valid' : 'invalid'}`}>
              <input type="checkbox" checked={passwordCriteria.length} readOnly /> Минимум 8 символов
            </label>
            <label className={`requirement ${passwordCriteria.uppercase ? 'valid' : 'invalid'}`}>
              <input type="checkbox" checked={passwordCriteria.uppercase} readOnly /> Минимум 1 заглавная буква
            </label>
            <label className={`requirement ${passwordCriteria.lowercase ? 'valid' : 'invalid'}`}>
              <input type="checkbox" checked={passwordCriteria.lowercase} readOnly /> Минимум 1 строчная буква
            </label>
            <label className={`requirement ${passwordCriteria.number ? 'valid' : 'invalid'}`}>
              <input type="checkbox" checked={passwordCriteria.number} readOnly /> Минимум 1 цифра
            </label>
            <label className={`requirement ${passwordCriteria.specialChar ? 'valid' : 'invalid'}`}>
              <input type="checkbox" checked={passwordCriteria.specialChar} readOnly /> Минимум 1 специальный символ
            </label>
          </div>
        </div>

        <button type="submit" className="submit-button">Зарегистрироваться</button>
      </form>
      <p>
        У вас уже есть аккаунт? <button onClick={() => navigate('/login')} className="link-button">Вход</button>
      </p>
    </div>
  );
});

export default RegisterPage;
