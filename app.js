// Конфигурация Firebase (замените на свою конфигурацию)
const firebaseConfig = {
    apiKey: "AIzaSyCg3XqoVnBOWABcXeAnIAXo_wi_3Tr_Ww8",
    authDomain: "digital-library-demo.firebaseapp.com",
    projectId: "digital-library-demo",
    storageBucket: "digital-library-demo.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef1234567890abcdef"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Данные о книгах (в реальном приложении будут загружаться из Firestore)
const booksData = [
    {
        id: 1,
        title: "Мастер и Маргарита",
        author: "Михаил Булгаков",
        description: "Одно из самых загадочных произведений русской литературы XX века, сочетающее в себе мистику, сатиру и философские размышления.",
        category: "Классика",
        cover: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        fileUrl: "https://example.com/books/master_and_margarita.pdf",
        downloads: 1250
    },
    {
        id: 2,
        title: "1984",
        author: "Джордж Оруэлл",
        description: "Антиутопический роман, описывающий тоталитарное общество под постоянным наблюдением Большого Брата.",
        category: "Научная фантастика",
        cover: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        fileUrl: "https://example.com/books/1984.pdf",
        downloads: 890
    },
    {
        id: 3,
        title: "Преступление и наказание",
        author: "Фёдор Достоевский",
        description: "Психологический роман, исследующий моральные дилеммы и внутренние терзания главного героя, студента Родиона Раскольникова.",
        category: "Классика",
        cover: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        fileUrl: "https://example.com/books/crime_and_punishment.pdf",
        downloads: 1100
    },
    {
        id: 4,
        title: "Гарри Поттер и философский камень",
        author: "Дж. К. Роулинг",
        description: "Первая книга из серии о юном волшебнике Гарри Поттере, который узнаёт о своём магическом происхождении и поступает в школу Хогвартс.",
        category: "Фэнтези",
        cover: "https://images.unsplash.com/photo-1600189261867-30e5ffe7b8da?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        fileUrl: "https://example.com/books/harry_potter.pdf",
        downloads: 2500
    },
    {
        id: 5,
        title: "Война и мир",
        author: "Лев Толстой",
        description: "Эпический роман, описывающий русское общество в эпоху войн против Наполеона. Одно из величайших произведений мировой литературы.",
        category: "Классика",
        cover: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        fileUrl: "https://example.com/books/war_and_peace.pdf",
        downloads: 950
    },
    {
        id: 6,
        title: "Маленький принц",
        author: "Антуан де Сент-Экзюпери",
        description: "Философская сказка о маленьком мальчике с далёкой планеты, которая учит ценить простые человеческие истины.",
        category: "Детская литература",
        cover: "https://images.unsplash.com/photo-1512820790803-83ca734da794?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        fileUrl: "https://example.com/books/little_prince.pdf",
        downloads: 1800
    },
    {
        id: 7,
        title: "Атлант расправил плечи",
        author: "Айн Рэнд",
        description: "Роман, излагающий философию объективизма через историю борьбы талантливых индивидуумов против подавляющего их общества.",
        category: "Философия",
        cover: "https://images.unsplash.com/photo-1509112756314-34a0badb29d4?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        fileUrl: "https://example.com/books/atlas_shrugged.pdf",
        downloads: 720
    },
    {
        id: 8,
        title: "Шерлок Холмс: Сборник рассказов",
        author: "Артур Конан Дойл",
        description: "Сборник детективных рассказов о знаменитом сыщике Шерлоке Холмсе и его верном друге докторе Ватсоне.",
        category: "Детектив",
        cover: "https://images.unsplash.com/photo-1531901599638-a89bb60971a3?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        fileUrl: "https://example.com/books/sherlock_holmes.pdf",
        downloads: 1600
    }
];

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
    displayBooks(booksData);
    initAuth();
    setupEventListeners();
});

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
                <img src="${book.cover}" alt="${book.title}">
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
function filterByCategory(e) {
    const category = e.target.dataset.category;
    
    // Обновляем активную кнопку
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    e.target.classList.add('active');
    
    // Фильтруем книги
    let filteredBooks;
    if (category === 'Все') {
        filteredBooks = booksData;
    } else {
        filteredBooks = booksData.filter(book => book.category === category);
    }
    
    displayBooks(filteredBooks);
}

// Поиск книг
function searchBooks() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (searchTerm === '') {
        // Если поисковой запрос пуст, показываем все книги
        const activeCategory = document.querySelector('.category-btn.active').dataset.category;
        if (activeCategory === 'Все') {
            displayBooks(booksData);
        } else {
            displayBooks(booksData.filter(book => book.category === activeCategory));
        }
        return;
    }
    
    const filteredBooks = booksData.filter(book => 
        book.title.toLowerCase().includes(searchTerm) || 
        book.author.toLowerCase().includes(searchTerm) || 
        book.category.toLowerCase().includes(searchTerm) ||
        book.description.toLowerCase().includes(searchTerm)
    );
    
    displayBooks(filteredBooks);
}

// Скачивание книги
function downloadBook(bookId) {
    if (!currentUser) {
        alert('Для скачивания книг необходимо войти в систему');
        loginModal.style.display = 'flex';
        return;
    }
    
    const book = booksData.find(b => b.id == bookId);
    if (book) {
        // В реальном приложении здесь будет логика скачивания из Firebase Storage
        alert(`Начинается скачивание книги "${book.title}"`);
        
        // Имитация скачивания
        const link = document.createElement('a');
        link.href = book.fileUrl;
        link.download = `${book.title}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Увеличиваем счетчик скачиваний
        book.downloads++;
        
        // В реальном приложении здесь будет обновление в Firestore
        console.log(`Книга "${book.title}" скачана пользователем ${currentUser.email}`);
    }
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
    loginBtn.style.display = 'none';
    registerBtn.style.display = 'none';
    
    // Создаем элемент информации о пользователе
    const userInfo = document.createElement('div');
    userInfo.className = 'user-info';
    userInfo.innerHTML = `
        <span>${currentUser.displayName || currentUser.email}</span>
        <button id="logoutBtn" class="btn btn-outline">Выйти</button>
    `;
    
    // Заменяем кнопки входа и регистрации на информацию о пользователе
    const userContainer = document.querySelector('.user-info');
    userContainer.innerHTML = userInfo.innerHTML;
    
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
        })
        .catch(error => {
            alert(`Ошибка входа: ${error.message}`);
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
            registerModal.style.display = 'none';
            registerForm.reset();
            alert('Регистрация выполнена успешно!');
        })
        .catch(error => {
            alert(`Ошибка регистрации: ${error.message}`);
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
