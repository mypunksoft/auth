# Используем Node.js образ
FROM node:20

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package.json package-lock.json ./

# Устанавливаем все зависимости
RUN npm install

# Копируем весь проект в контейнер
COPY . .

# Сборка React-приложения
RUN npm run build

# Экспонируем порты для фронтенда и бэкенда
EXPOSE 3000 5000

# Параллельный запуск сервера и сервировки статического React-приложения
CMD ["sh", "-c", "node server/server.js & npx serve -s build -l 3000"]
