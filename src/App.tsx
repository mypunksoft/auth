import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import HomePage from './HomePage';
import RegisterPage from './RegisterPage';
import WelcomePage from './WelcomePage';
import AdditionalDataPage from './AdditionalDataPage'; 
import BankLandingPage from './BankLandingPage'; 
import './App.css';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [message, setMessage] = useState('');
  const [username, setUsername] = useState('');
  const [csrfToken, setCsrfToken] = useState('');

  const checkAuthentication = async () => {
    try {
      const response = await fetch('http://localhost:5000/protected', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const { username, csrfToken } = await response.json();
        setIsAuthenticated(true);
        setUsername(username);
        setCsrfToken(csrfToken);
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Ошибка при проверке аутентификации:', error);
      setIsAuthenticated(false);
    }
  };

  useEffect(() => {
    checkAuthentication();
  }, []);

  const handleLogout = async () => {
    try {
      const response = await fetch('http://localhost:5000/logout', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': csrfToken,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        setIsAuthenticated(false);
        setUsername('');
        setMessage('Вы вышли из системы');
      } else {
        setMessage('Ошибка при выходе из системы');
      }
    } catch (error) {
      console.error('Ошибка при выходе:', error);
      setMessage('Ошибка сети при выходе');
    }
  };

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route 
            path="/" 
            element={isAuthenticated ? <Navigate to="/welcome" /> : <BankLandingPage />} 
          />
          <Route 
            path="/login" 
            element={<HomePage setMessage={setMessage} setIsAuthenticated={setIsAuthenticated} setUsername={setUsername} />} 
          />
          <Route 
            path="/register" 
            element={<RegisterPage setMessage={setMessage} />} 
          />
          <Route 
            path="/additional-data" 
            element={<AdditionalDataPage setMessage={setMessage} />} 
          />
          <Route 
            path="/welcome" 
            element={isAuthenticated ? <WelcomePage onLogout={handleLogout} username={username} csrfToken={csrfToken} /> : <Navigate to="/" />} 
          />
        </Routes>
        {message && <p className="message">{message}</p>}
      </div>
    </Router>
  );
};

export default App;