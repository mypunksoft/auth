import React, { useEffect, useState } from 'react';
import './App.css';

interface WelcomePageProps {
  onLogout: () => Promise<void>;
  username?: string;
  csrfToken: string;
}

const WelcomePage: React.FC<WelcomePageProps> = React.memo(({ onLogout, username, csrfToken }) => {
  const [storedUsername, setStoredUsername] = useState<string | null>(null);

  useEffect(() => {
    if (username) {
      localStorage.setItem('username', username);
      setStoredUsername(username);
    } else {
      const savedUsername = localStorage.getItem('username');
      if (savedUsername) {
        setStoredUsername(savedUsername);
      }
    }
  }, [username]);

  const balance = 1000.00;
  const transactions = [
    { id: 1, amount: 50.00, type: 'Депозит' },
    { id: 2, amount: 20.00, type: 'Вывод' },
    { id: 3, amount: 100.00, type: 'Депозит' },
    { id: 4, amount: 10.00, type: 'Вывод' },
  ];

  return (
    <div className="welcome-container">
      <h1>Добро пожаловать, {storedUsername || 'Пользователь'}!</h1>
      <p>Вы успешно вошли в систему.</p>

      <div className="bank-app">
        <h2>Ваш баланс: ${balance.toFixed(2)}</h2>
        <h3>История транзакций:</h3>
        <ul>
          {transactions.map(transaction => (
            <li key={transaction.id}>
              {transaction.type}: ${transaction.amount.toFixed(2)}
            </li>
          ))}
        </ul>
      </div>

      <button onClick={onLogout} className="submit-button">Выйти</button>
    </div>
  );
});

export default WelcomePage;
