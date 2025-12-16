// Конфигурация Firebase (ЗАМЕНИТЕ НА ВАШУ КОНФИГУРАЦИЮ)
const firebaseConfig = {
  apiKey: "AIzaSyDqnau8N2mHjhOTMpxXqYe8EDGfxqGqQn0",
  authDomain: "my-first-kyrsachic.firebaseapp.com",
  projectId: "my-first-kyrsachic",
  storageBucket: "my-first-kyrsachic.firebasestorage.app",
  messagingSenderId: "741117010262",
  appId: "1:741117010262:web:2972f2e62517ccc2b9f6f7",
  measurementId: "G-81YS0ZHEXX"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Категории книг
const categories = ["Все", "Классика", "Фэнтези", "Научная фантастика", "Детектив", "Детская литература", "Философия"];

// Текущий пользователь
let currentUser = null;

// DOM элементы
const booksGrid = document.getElementById('booksGrid');
const categoryFilter = document.getElementById('categoryFilter');
const loadingBooks = document.getElementById('loadingBooks');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const loginModal = document.getElementById('loginModal');
const registerModal = document.getElementById('registerModal');
const closeLoginModal = document.getElementById('closeLoginModal');
const closeRegisterModal = document.getElementById('closeRegisterModal');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const showRegister = document.getElementById('showRegister');
const showLogin = document.getElementById('showLogin');

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    initCategories();
    loadBooksFromFirestore();
    initAuth();
    setupEventListeners();
});

// Загрузка книг из Firestore
function loadBooksFromFirestore() {
    loadingBooks.style.display = 'block';
    
    db.collection("books").get()
        .then((querySnapshot) => {
            const booksData = [];
            querySnapshot.forEach((doc) => {
                const book = doc.data();
                book.id = doc.id;
                booksData.push(book);
            });
            
            // Если книг нет в Firestore, используем демо-данные
            if (booksData.length === 0) {
                console.log("No books found in Firestore, using demo data");
                useDemoBooks();
            } else {
                displayBooks(booksData);
            }
        })
        .catch((error) => {
            console.log("Error loading books:", error);
            useDemoBooks();
        });
}

// Использование демо-книг (если Firestore пуст)
function useDemoBooks() {
    const demoBooks = [
        {
            id: 1,
            title: "Мастер и Маргарита",
            author: "Михаил Булгаков",
            description: "Одно из самых загадочных произведений русской литературы XX века, сочетающее в себе мистику, сатиру и философские размышления.",
            category: "Классика",
            cover: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
            fileUrl: "https://www.gutenberg.org/files/1259/1259-0.txt",
            downloads: 1250
        },
        {
            id: 2,
            title: "1984",
            author: "Джордж Оруэлл",
            description: "Антиутопический роман, описывающий тоталитарное общество под постоянным наблюдением Большого Брата.",
            category: "Научная фантастика",
            cover: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
            fileUrl: "https://www.gutenberg.org/files/1259/1259-0.txt",
            downloads: 890
        },
        {
            id: 3,
            title: "Преступление и наказание",
            author: "Фёдор Достоевский",
            description: "Психологический роман, исследующий моральные дилеммы и внутренние терзания главного героя, студента Родиона Раскольникова.",
            category: "Классика",
            cover: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
            fileUrl: "https://www.gutenberg.org/files/1259/1259-0.txt",
            downloads: 1100
        },
        {
            id: 4,
            title: "Гарри Поттер и философский камень",
            author: "Дж. К. Роулинг",
            description: "Первая книга из серии о юном волшебнике Гарри Поттере, который узнаёт о своём магическом происхождении и поступает в школу Хогвартс.",
            category: "Фэнтези",
            cover: "https://images.unsplash.com/photo-1600189261867-30e5ffe7b8da?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
            fileUrl: "https://www.gutenberg.org/files/1259/1259-0.txt",
            downloads: 2500
        }
    ];
    
    displayBooks(demoBooks);
    
    // Добавляем демо-книги в Firestore для будущего использования
    demoBooks.forEach(book => {
        db.collection("books").add(book).catch(error => console.log("Error adding demo book:", error));
    });
}

// Инициализация категорий
function initCategories() {
    categoryFilter.innerHTML = '';
    categories.forEach(category => {
        const button = document.createElement('button');
        button.className = `category-btn ${category === 'Все' ? 'active' : ''}`;
        button.textContent = category;
        button.dataset.category = category;
        button.addEventListener('click', filterByCategory);
        categoryFilter.appendChild(button);
    });
}

// Отображение книг
function displayBooks(books) {
    booksGrid.innerHTML = '';
    loadingBooks.style.display = 'none';
    
    if (books.length === 0) {
        booksGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; font-size: 1.2rem;">Книги не найдены</p>';
        return;
    }
    
    books.forEach(book => {
        const bookCard = document.createElement('div');
        bookCard.className = 'book-card';
        bookCard.innerHTML = `
            <div class="book-cover">
                <img src="${book.cover}" alt="${book.title}" onerror="this.src='https://images.unsplash.com/photo-1541963463532-d68292c34b19?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'">
            </div>
            <div class="book-info">
                <h3 class="book-title">${book.title}</h3>
                <p class="book-author">${book.author}</p>
                <p class="book-description">${book.description}</p>
                <div class="book-meta">
                    <span class="book-category">${book.category}</span>
                    <a href="#" class="book-download" data-id="${book.id}">
                        <i class="fas fa-download"></i> Скачать
                    </a>
                </div>
            </div>
        `;
        booksGrid.appendChild(bookCard);
    });
    
    // Добавляем обработчики событий для кнопок скачивания
    document.querySelectorAll('.book-download').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const bookId = this.getAttribute('data-id');
            downloadBook(bookId);
        });
    });
}

// Фильтрация книг по категории
let allBooks = [];

function filterByCategory(e) {
    const category = e.target.dataset.category;
    
    // Обновляем активную кнопку
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    e.target.classList.add('active');
    
    // Получаем все книги из DOM
    const bookCards = document.querySelectorAll('.book-card');
    
    if (category === 'Все') {
        // Показываем все книги
        bookCards.forEach(card => {
            card.style.display = 'block';
        });
    } else {
        // Фильтруем по категории
        bookCards.forEach(card => {
            const bookCategory = card.querySelector('.book-category').textContent;
            if (bookCategory === category) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }
}

// Поиск книг
function searchBooks() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const bookCards = document.querySelectorAll('.book-card');
    
    if (searchTerm === '') {
        // Показываем все книги текущей категории
        const activeCategory = document.querySelector('.category-btn.active').dataset.category;
        filterByCategory({ target: document.querySelector(`[data-category="${activeCategory}"]`) });
        return;
    }
    
    bookCards.forEach(card => {
        const title = card.querySelector('.book-title').textContent.toLowerCase();
        const author = card.querySelector('.book-author').textContent.toLowerCase();
        const description = card.querySelector('.book-description').textContent.toLowerCase();
        const category = card.querySelector('.book-category').textContent.toLowerCase();
        
        if (title.includes(searchTerm) || author.includes(searchTerm) || 
            description.includes(searchTerm) || category.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Скачивание книги
function downloadBook(bookId) {
    if (!currentUser) {
        alert('Для скачивания книг необходимо войти в систему');
        loginModal.style.display = 'flex';
        return;
    }
    
    // Находим книгу
    const bookCard = document.querySelector(`[data-id="${bookId}"]`).closest('.book-card');
    const title = bookCard.querySelector('.book-title').textContent;
    const author = bookCard.querySelector('.book-author').textContent;
    
    alert(`Начинается скачивание книги "${title}"`);
    
    // Имитация скачивания
    const link = document.createElement('a');
    link.href = 'https://www.gutenberg.org/files/1259/1259-0.txt'; // Демо-файл
    link.download = `${title} - ${author}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Обновляем счетчик скачиваний в Firestore (если книга есть в Firestore)
    db.collection("books").doc(bookId).get()
        .then((doc) => {
            if (doc.exists) {
                const currentDownloads = doc.data().downloads || 0;
                db.collection("books").doc(bookId).update({
                    downloads: currentDownloads + 1
                });
            }
        })
        .catch(error => console.log("Error updating download count:", error));
    
    console.log(`Книга "${title}" скачана пользователем ${currentUser.email}`);
}

// Инициализация аутентификации
function initAuth() {
    // Слушаем изменения состояния аутентификации
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            updateUIForLoggedInUser();
        } else {
            currentUser = null;
            updateUIForLoggedOutUser();
        }
    });
}

// Обновление интерфейса для авторизованного пользователя
function updateUIForLoggedInUser() {
    const userContainer = document.querySelector('.user-info');
    userContainer.innerHTML = `
        <span>${currentUser.displayName || currentUser.email}</span>
        <button id="logoutBtn" class="btn btn-outline">Выйти</button>
    `;
    
    // Добавляем обработчик для кнопки выхода
    document.getElementById('logoutBtn').addEventListener('click', logout);
}

// Обновление интерфейса для неавторизованного пользователя
function updateUIForLoggedOutUser() {
    const userContainer = document.querySelector('.user-info');
    userContainer.innerHTML = `
        <button id="loginBtn" class="btn btn-outline">Войти</button>
        <button id="registerBtn" class="btn">Регистрация</button>
    `;
    
    // Перепривязываем обработчики событий
    document.getElementById('loginBtn').addEventListener('click', () => {
        loginModal.style.display = 'flex';
    });
    
    document.getElementById('registerBtn').addEventListener('click', () => {
        registerModal.style.display = 'flex';
    });
}

// Вход пользователя
function login(email, password) {
    auth.signInWithEmailAndPassword(email, password)
        .then(userCredential => {
            loginModal.style.display = 'none';
            loginForm.reset();
            alert('Вход выполнен успешно!');
            
            // Сохраняем информацию о пользователе в Firestore
            const user = userCredential.user;
            db.collection("users").doc(user.uid).set({
                email: user.email,
                name: user.displayName,
                lastLogin: new Date().toISOString()
            }, { merge: true });
        })
        .catch(error => {
            let errorMessage = 'Ошибка входа: ';
            switch (error.code) {
                case 'auth/invalid-email':
                    errorMessage += 'Неверный формат email';
                    break;
                case 'auth/user-not-found':
                    errorMessage += 'Пользователь не найден';
                    break;
                case 'auth/wrong-password':
                    errorMessage += 'Неверный пароль';
                    break;
                default:
                    errorMessage += error.message;
            }
            alert(errorMessage);
        });
}

// Регистрация пользователя
function register(name, email, password) {
    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
            // Обновляем имя пользователя
            return userCredential.user.updateProfile({
                displayName: name
            });
        })
        .then(() => {
            // Сохраняем информацию о пользователе в Firestore
            const user = auth.currentUser;
            return db.collection("users").doc(user.uid).set({
                name: name,
                email: email,
                createdAt: new Date().toISOString(),
                role: 'user'
            });
        })
        .then(() => {
            registerModal.style.display = 'none';
            registerForm.reset();
            alert('Регистрация выполнена успешно!');
        })
        .catch(error => {
            let errorMessage = 'Ошибка регистрации: ';
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage += 'Email уже используется';
                    break;
                case 'auth/invalid-email':
                    errorMessage += 'Неверный формат email';
                    break;
                case 'auth/weak-password':
                    errorMessage += 'Пароль слишком слабый (минимум 6 символов)';
                    break;
                default:
                    errorMessage += error.message;
            }
            alert(errorMessage);
        });
}

// Выход пользователя
function logout() {
    auth.signOut()
        .then(() => {
            alert('Вы успешно вышли из системы');
        })
        .catch(error => {
            alert(`Ошибка выхода: ${error.message}`);
        });
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Поиск
    searchBtn.addEventListener('click', searchBooks);
    searchInput.addEventListener('keyup', function(e) {
        if (e.key === 'Enter') {
            searchBooks();
        }
    });
    
    // Модальные окна
    loginBtn.addEventListener('click', () => {
        loginModal.style.display = 'flex';
    });
    
    registerBtn.addEventListener('click', () => {
        registerModal.style.display = 'flex';
    });
    
    closeLoginModal.addEventListener('click', () => {
        loginModal.style.display = 'none';
    });
    
    closeRegisterModal.addEventListener('click', () => {
        registerModal.style.display = 'none';
    });
    
    // Переключение между модальными окнами
    showRegister.addEventListener('click', (e) => {
        e.preventDefault();
        loginModal.style.display = 'none';
        registerModal.style.display = 'flex';
    });
    
    showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        registerModal.style.display = 'none';
        loginModal.style.display = 'flex';
    });
    
    // Формы
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        login(email, password);
    });
    
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (password !== confirmPassword) {
            alert('Пароли не совпадают');
            return;
        }
        
        if (password.length < 6) {
            alert('Пароль должен содержать минимум 6 символов');
            return;
        }
        
        register(name, email, password);
    });
    
    // Закрытие модальных окон при клике вне их
    window.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            loginModal.style.display = 'none';
        }
        if (e.target === registerModal) {
            registerModal.style.display = 'none';
        }
    });
}
