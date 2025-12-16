// ВАЖНО: Этот файл НЕ КОММИТЬ в GitHub!
// Создать .gitignore и добавить firebase-config.js
// Или использовать переменные окружения

// ⚠️ ВАШ КОНФИГ FIREBASE - ЗАМЕНИТЕ НА СВОЙ ⚠️
const firebaseConfig = {
    apiKey: "AIzaSyDqnau8N2mHjhOTMpxXqYe8EDGfxqGqQn0",
    authDomain: "my-first-kyrsachic.firebaseapp.com",
    projectId: "my-first-kyrsachic",
    storageBucket: "my-first-kyrsachic.firebasestorage.app",
    messagingSenderId: "741117010262",
    appId: "1:741117010262:web:2972f2e62517ccc2b9f6f7"
};

// Экспортируем конфиг
if (typeof module !== 'undefined' && module.exports) {
    module.exports = firebaseConfig;
}
