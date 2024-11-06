import React from 'react';
import { Link } from 'react-router-dom';
import './BankLandingPage.css';

const BankLandingPage: React.FC = () => {
  return (
    <div className="bank-landing">
      <header className="bank-header">
        <h1>Добро пожаловать в Банк</h1>
        <nav>
          <ul>
            <li>
              <Link to="/register">
                <button className="bank-button">Регистрация</button>
              </Link>
            </li>
            <li>
              <Link to="/login">
                <button className="bank-button">Вход</button>
              </Link>
            </li>
          </ul>
        </nav>
      </header>
      <main className="bank-main">
        <section className="bank-intro">
          <h2>Ваш финансовый партнер</h2>
          <p>
            Мы предлагаем лучшие решения для управления вашими финансами. Присоединяйтесь к нам и начните управлять своими средствами уже сегодня!
          </p>
          <Link to="/register" className="bank-button">Создать аккаунт</Link>
        </section>
        
        <section className="bank-info">
          <h3>Почему выбирают нас?</h3>
          <ul>
            <li>
              🌍 Глобальные решения: Мы работаем по всему миру и предлагаем услуги для клиентов в разных странах.
            </li>
            <li>
              🔒 Безопасность: Ваши данные и средства защищены передовыми технологиями безопасности.
            </li>
            <li>
              📊 Персонализированный подход: Мы понимаем, что каждый клиент уникален и предлагаем индивидуальные финансовые решения.
            </li>
            <li>
              🤝 Прозрачность: Мы стремимся к честности и открытости в отношениях с нашими клиентами.
            </li>
          </ul>
        </section>
      </main>
      <footer className="bank-footer">
        <p>© 2024 Банк. Все права защищены.</p>
      </footer>
    </div>
  );
};

export default BankLandingPage;
