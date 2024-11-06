import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import CryptoJS from 'crypto-js';

interface AdditionalDataProps {
  setMessage: (message: string) => void;
}

const AdditionalDataPage: React.FC<AdditionalDataProps> = ({ setMessage }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [patronymic, setPatronymic] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [encryptionKey, setEncryptionKey] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const navigate = useNavigate();
  const location = useLocation();
  const userId = (location.state as { userId: string })?.userId;

  useEffect(() => {
    const fetchEncryptionKey = async () => {
      try {
        const response = await fetch('http://localhost:5000/generate-key', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setEncryptionKey(data.keyHash);
        } else {
          console.error('Ошибка при получении хэша ключа');
        }
      } catch (error) {
        console.error('Ошибка сети:', error);
      }
    };

    fetchEncryptionKey();
  }, []);

  const encryptData = (data: object) => {
    const jsonData = JSON.stringify(data);
    return CryptoJS.AES.encrypt(jsonData, encryptionKey).toString();
  };

  const namePattern = /^[А-Яа-яёЁ-]+$/;
  const phonePattern = /^(8\d{10}|\+7\d{11})$/;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validateInput = (value: string, type: string) => {
    switch (type) {
      case 'firstName':
      case 'lastName':
      case 'patronymic':
      case 'city':
        return namePattern.test(value) || 'Допустимы только кириллица и дефисы.';
      case 'phoneNumber':
        return phonePattern.test(value) || 'Номер телефона должен начинаться с 8 или +7';
      case 'email':
        return emailPattern.test(value) || 'Введите корректный адрес электронной почты.';
      default:
        return true;
    }
  };

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string, type: string) => {
    setter(value);
    const validationMessage = validateInput(value, type);
    if (validationMessage !== true) {
      setErrors((prev) => ({ ...prev, [type]: validationMessage as string }));
    } else {
      setErrors((prev) => ({ ...prev, [type]: '' }));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const newErrors: { [key: string]: string } = {};
    const fields = { firstName, lastName, patronymic, phoneNumber, email, city };

    for (const [field, value] of Object.entries(fields)) {
      const validationMessage = validateInput(value, field);
      if (validationMessage !== true) {
        newErrors[field] = validationMessage as string;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const data = { userId, firstName, lastName, patronymic, phoneNumber, email, city };
    const encryptedData = encryptData(data);

    try {
      const response = await fetch('http://localhost:5000/additional-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ encryptedData, encryptionKeyHash: encryptionKey }),
      });

      if (response.ok) {
        setMessage('Дополнительные данные успешно сохранены');
        navigate('/login');
      } else {
        const result = await response.json();
        setMessage(result.message || 'Ошибка при сохранении данных');
      }
    } catch (error) {
      console.error('Ошибка при отправке данных:', error);
      setMessage('Ошибка сети при сохранении данных');
    }
  };


  return (
    <div className="form-container">
      <h1>Дополнительные данные</h1>
      <form onSubmit={handleSubmit}>
        {[
          { label: 'Имя', value: firstName, setter: setFirstName, error: errors.firstName, type: 'firstName' },
          { label: 'Фамилия', value: lastName, setter: setLastName, error: errors.lastName, type: 'lastName' },
          { label: 'Отчество', value: patronymic, setter: setPatronymic, error: errors.patronymic, type: 'patronymic' },
          { label: 'Номер телефона', value: phoneNumber, setter: setPhoneNumber, error: errors.phoneNumber, type: 'phoneNumber' },
          { label: 'Почта', value: email, setter: setEmail, error: errors.email, type: 'email' },
          { label: 'Город проживания', value: city, setter: setCity, error: errors.city, type: 'city' }
        ].map(({ label, value, setter, error, type }) => (
          <div className="form-group" key={type}>
            <label>{label}:</label>
            <input
              type="text"
              value={value}
              onChange={(e) => handleInputChange(setter, e.target.value, type)}
              required
            />
            {error && <span className="error-message">{error}</span>}
          </div>
        ))}
        <button type="submit" className="submit-button">Сохранить данные</button>
      </form>
    </div>
  );
};

export default AdditionalDataPage;
