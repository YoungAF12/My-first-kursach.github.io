// ============ КОНФИГУРАЦИЯ FIREBASE ============
// ЗАМЕНИТЕ ЭТУ КОНФИГУРАЦИЮ НА СВОЮ ИЗ FIREBASE CONSOLE
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

// ============ ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ============
const categories = ["Все", "Классика", "Фэнтези", "Научная фантастика", "Детектив", "Детская литература", "Философия", "Научно-популярная", "Бизнес", "Программирование"];
let currentUser = null;
let adminUser = null;
let isAdminMode = false;

// ============ DOM ЭЛЕМЕНТЫ ============
const booksGrid = document.getElementById('booksGrid');
const categoryFilter = document.getElementById('categoryFilter');
const loadingBooks = document.getElementById('loadingBooks');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const loginModal = document.getElementById('loginModal');
const registerModal = document.getElementById('registerModal');
const addBookModal = document.getElementById('addBookModal');
const closeLoginModal = document.getElementById('closeLoginModal');
const closeRegisterModal = document.getElementById('closeRegisterModal');
const closeAddBookModal = document.getElementById('closeAddBookModal');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const addBookForm = document.getElementById('addBookForm');
const showRegister = document.getElementById('showRegister');
const showLogin = document.getElementById('showLogin');
const pdfUpload = document.getElementById('pdfUpload');
const coverUpload = document.getElementById('coverUpload');
const uploadProgress = document.getElementById('uploadProgress');
const fileInfo = document.getElementById('fileInfo');

// ============ ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ============
document.addEventListener('DOMContentLoaded', function() {
    console.log("Digital Library initialized");
    initCategories();
    loadBooksFromFirestore();
    initAuth();
    setupEventListeners();
    setupAddBookForm();
});

// ============ ФУНКЦИИ ДЛЯ РАБОТЫ С КНИГАМИ ============

// Загрузка книг из Firestore
function loadBooksFromFirestore() {
    loadingBooks.style.display = 'block';
    loadingBooks.innerHTML = '<div class="loader"></div><p>Загрузка книг...</p>';
    
    db.collection("books").get()
        .then((querySnapshot) => {
            const booksData = [];
            querySnapshot.forEach((doc) => {
                const book = doc.data();
                book.id = doc.id;
                booksData.push(book);
            });
            
            if (booksData.length === 0) {
                console.log("No books found in Firestore, using demo data");
                useDemoBooks();
            } else {
                console.log(`Loaded ${booksData.length} books from Firestore`);
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
            id: "demo1",
            title: "Мастер и Маргарита",
            author: "Михаил Булгаков",
            description: "Одно из самых загадочных произведений русской литературы XX века, сочетающее в себе мистику, сатиру и философские размышления.",
            category: "Классика",
            cover: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
            fileUrl: "https://www.gutenberg.org/files/1259/1259-0.txt",
            downloads: 1250,
            format: "PDF",
            fileSize: "1.2 MB",
            year: 1967,
            pages: 384,
            language: "Русский"
        },
        {
            id: "demo2",
            title: "1984",
            author: "Джордж Оруэлл",
            description: "Антиутопический роман, описывающий тоталитарное общество под постоянным наблюдением Большого Брата.",
            category: "Научная фантастика",
            cover: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
            fileUrl: "https://www.gutenberg.org/files/1259/1259-0.txt",
            downloads: 890,
            format: "PDF",
            fileSize: "0.9 MB",
            year: 1949,
            pages: 328,
            language: "Русский"
        }
    ];
    
    displayBooks(demoBooks);
    
    // Добавляем демо-книги в Firestore
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
        booksGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; font-size: 1.2rem; padding: 40px;">Книги не найдены</p>';
        return;
    }
    
    books.forEach(book => {
        const bookCard = document.createElement('div');
        bookCard.className = 'book-card';
        bookCard.innerHTML = `
            <div class="book-cover">
                <img src="${book.cover}" alt="${book.title}" onerror="this.src='https://images.unsplash.com/photo-1541963463532-d68292c34b19?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'">
                ${isAdminMode ? `<div class="book-actions">
                    <button class="book-action-btn book-action-edit" data-id="${book.id}" title="Редактировать">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="book-action-btn book-action-delete" data-id="${book.id}" title="Удалить">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>` : ''}
            </div>
            <div class="book-info">
                <h3 class="book-title">${book.title}</h3>
                <p class="book-author">${book.author}</p>
                <p class="book-description">${book.description || 'Описание отсутствует'}</p>
                <div class="book-details">
                    <div class="book-meta">
                        <span class="book-category">${book.category}</span>
                        <span class="book-format">${book.format || 'PDF'}</span>
                        ${book.fileSize ? `<span class="book-size">${book.fileSize}</span>` : ''}
                    </div>
                    ${book.year || book.pages || book.language ? `
                    <div class="book-details-grid">
                        ${book.year ? `<div class="book-detail-item">
                            <span class="book-detail-label">Год</span>
                            <span class="book-detail-value">${book.year}</span>
                        </div>` : ''}
                        ${book.pages ? `<div class="book-detail-item">
                            <span class="book-detail-label">Страниц</span>
                            <span class="book-detail-value">${book.pages}</span>
                        </div>` : ''}
                        ${book.language ? `<div class="book-detail-item">
                            <span class="book-detail-label">Язык</span>
                            <span class="book-detail-value">${book.language}</span>
                        </div>` : ''}
                    </div>` : ''}
                </div>
                <div class="book-meta" style="margin-top: 15px;">
                    <span style="font-size: 0.9rem; color: #666;">Скачано: ${book.downloads || 0}</span>
                    <a href="#" class="book-download" data-id="${book.id}">
                        <i class="fas fa-download"></i> Скачать PDF
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
    
    // Обработчики для админских кнопок (если режим админа включен)
    if (isAdminMode) {
        document.querySelectorAll('.book-action-edit').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                const bookId = this.getAttribute('data-id');
                editBook(bookId);
            });
        });
        
        document.querySelectorAll('.book-action-delete').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                const bookId = this.getAttribute('data-id');
                deleteBook(bookId);
            });
        });
    }
}

// Фильтрация книг по категории
function filterByCategory(e) {
    const category = e.target.dataset.category;
    
    // Обновляем активную кнопку
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    e.target.classList.add('active');
    
    // Если выбрано "Все", показываем все книги
    if (category === 'Все') {
        document.querySelectorAll('.book-card').forEach(card => {
            card.style.display = 'block';
        });
    } else {
        // Фильтруем по категории
        document.querySelectorAll('.book-card').forEach(card => {
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
    
    if (searchTerm === '') {
        // Показываем все книги текущей категории
        const activeCategory = document.querySelector('.category-btn.active').dataset.category;
        filterByCategory({ target: document.querySelector(`[data-category="${activeCategory}"]`) });
        return;
    }
    
    document.querySelectorAll('.book-card').forEach(card => {
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
    
    // Находим книгу в Firestore
    db.collection("books").doc(bookId).get()
        .then((doc) => {
            if (doc.exists) {
                const book = doc.data();
                
                // Показываем детали книги перед скачиванием
                showBookDetails(book, bookId);
                
                // Обновляем счетчик скачиваний
                const currentDownloads = book.downloads || 0;
                db.collection("books").doc(bookId).update({
                    downloads: currentDownloads + 1
                });
                
                // Обновляем статистику пользователя
                updateUserDownloadStats(bookId, book.title);
            }
        })
        .catch(error => {
            console.error("Error getting book:", error);
            alert('Ошибка загрузки информации о книге');
        });
}

// Показать детали книги перед скачиванием
function showBookDetails(book, bookId) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="book-details-popup">
            <div class="book-details-header">
                <img src="${book.cover}" alt="${book.title}" class="book-details-cover" 
                     onerror="this.src='https://images.unsplash.com/photo-1541963463532-d68292c34b19?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'">
                <div>
                    <h3 class="book-details-title">${book.title}</h3>
                    <p class="book-details-author">${book.author}</p>
                    <div style="margin-bottom: 15px;">
                        <span class="book-category">${book.category}</span>
                        <span class="book-format">${book.format || 'PDF'}</span>
                        ${book.fileSize ? `<span class="book-size">${book.fileSize}</span>` : ''}
                    </div>
                    ${book.year ? `<p><strong>Год:</strong> ${book.year}</p>` : ''}
                    ${book.pages ? `<p><strong>Страниц:</strong> ${book.pages}</p>` : ''}
                    ${book.language ? `<p><strong>Язык:</strong> ${book.language}</p>` : ''}
                </div>
            </div>
            <p class="book-details-description">${book.description || 'Описание отсутствует'}</p>
            <p><strong>Скачано:</strong> ${(book.downloads || 0) + 1} раз</p>
            <a href="${book.fileUrl}" class="book-download-large" download="${book.title}.pdf" target="_blank">
                <i class="fas fa-download"></i> Скачать книгу (PDF)
            </a>
            <button class="btn btn-outline" style="margin-left: 10px;" id="closeBookDetails">
                Закрыть
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Закрытие модального окна
    document.getElementById('closeBookDetails').addEventListener('click', () => {
        modal.remove();
    });
    
    // Закрытие по клику вне окна
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Обновление статистики скачиваний пользователя
function updateUserDownloadStats(bookId, bookTitle) {
    if (!currentUser) return;
    
    db.collection("users").doc(currentUser.uid).update({
        lastDownload: firebase.firestore.FieldValue.serverTimestamp(),
        downloadsCount: firebase.firestore.FieldValue.increment(1)
    }).catch(error => {
        console.log("Error updating user stats:", error);
    });
}

// ============ ФУНКЦИИ ДЛЯ РАБОТЫ С ПОЛЬЗОВАТЕЛЯМИ ============

// Инициализация аутентификации
function initAuth() {
    // Проверка подключения к Firebase
    console.log("Firebase initialized with project:", firebaseConfig.projectId);
    
    // Слушаем изменения состояния аутентификации
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            console.log("User logged in:", user.email);
            checkAdminStatus(user);
            updateUIForLoggedInUser();
            checkUserStatus(); // Проверяем наличие документа пользователя
        } else {
            currentUser = null;
            adminUser = null;
            isAdminMode = false;
            updateUIForLoggedOutUser();
        }
    });
}

// Проверка статуса администратора
function checkAdminStatus(user) {
    db.collection("users").doc(user.uid).get()
        .then(doc => {
            if (doc.exists) {
                const userData = doc.data();
                if (userData.role === 'admin') {
                    adminUser = user;
                    console.log("Admin user detected:", user.email);
                    showAdminPanel();
                }
            } else {
                // Если документа нет, создаем его
                createUserDocument(user);
            }
        })
        .catch(error => {
            console.log("Error checking admin status:", error);
        });
}

// Создание документа пользователя в Firestore
function createUserDocument(user) {
    db.collection("users").doc(user.uid).set({
        uid: user.uid,
        email: user.email,
        name: user.displayName || user.email.split('@')[0],
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        role: 'user',
        lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
        downloadsCount: 0,
        booksDownloaded: []
    })
    .then(() => {
        console.log("User document created in Firestore for:", user.email);
    })
    .catch(error => {
        console.error("Error creating user document:", error);
    });
}

// Проверка состояния пользователя
function checkUserStatus() {
    if (currentUser) {
        console.log("Current user:", {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName
        });
        
        // Проверяем, есть ли документ в Firestore
        db.collection("users").doc(currentUser.uid).get()
            .then(doc => {
                if (!doc.exists) {
                    console.log("User document NOT found in Firestore!");
                    createUserDocument(currentUser);
                }
            })
            .catch(error => {
                console.error("Error checking user document:", error);
            });
    }
}

// Регистрация пользователя
function register(name, email, password) {
    console.log("Starting registration process...");
    
    // Проверка пароля
    if (password.length < 6) {
        alert('Пароль должен содержать минимум 6 символов');
        return;
    }
    
    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
            console.log("User created in Authentication");
            
            // Обновляем профиль в Authentication
            return userCredential.user.updateProfile({
                displayName: name
            }).then(() => {
                return userCredential.user;
            });
        })
        .then((user) => {
            console.log("Creating user document in Firestore...");
            
            // Создаем документ пользователя в Firestore
            return db.collection("users").doc(user.uid).set({
                uid: user.uid,
                name: name,
                email: email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                role: 'user',
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                booksDownloaded: []
            });
        })
        .then(() => {
            console.log("Registration completed successfully!");
            registerModal.style.display = 'none';
            registerForm.reset();
            showNotification('Регистрация выполнена успешно!', 'success');
        })
        .catch(error => {
            console.error("Registration error:", error);
            
            let errorMessage = 'Ошибка регистрации: ';
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'Этот email уже используется';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Неверный формат email';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Пароль слишком слабый';
                    break;
                case 'permission-denied':
                    errorMessage = 'Ошибка доступа к базе данных. Пожалуйста, проверьте правила безопасности Firestore.';
                    break;
                default:
                    errorMessage = error.message;
            }
            showNotification(errorMessage, 'error');
        });
}

// Вход пользователя
function login(email, password) {
    auth.signInWithEmailAndPassword(email, password)
        .then(userCredential => {
            const user = userCredential.user;
            console.log("User logged in, updating Firestore...");
            
            // Обновляем документ пользователя в Firestore
            return db.collection("users").doc(user.uid).set({
                uid: user.uid,
                email: user.email,
                name: user.displayName || email.split('@')[0],
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        })
        .then(() => {
            loginModal.style.display = 'none';
            loginForm.reset();
            showNotification('Вход выполнен успешно!', 'success');
        })
        .catch(error => {
            let errorMessage = 'Ошибка входа: ';
            switch (error.code) {
                case 'auth/invalid-email':
                    errorMessage = 'Неверный формат email';
                    break;
                case 'auth/user-not-found':
                    errorMessage = 'Пользователь не найден';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Неверный пароль';
                    break;
                default:
                    errorMessage = error.message;
            }
            showNotification(errorMessage, 'error');
        });
}

// Выход пользователя
function logout() {
    auth.signOut()
        .then(() => {
            showNotification('Вы успешно вышли из системы', 'info');
        })
        .catch(error => {
            showNotification('Ошибка выхода: ' + error.message, 'error');
        });
}

// ============ АДМИН ПАНЕЛЬ ============

// Показать панель администратора
function showAdminPanel() {
    const booksSection = document.querySelector('.books-section .container');
    
    // Удаляем старую админ панель, если есть
    const oldPanel = document.querySelector('.admin-panel');
    if (oldPanel) oldPanel.remove();
    
    const adminPanel = document.createElement('div');
    adminPanel.className = 'admin-panel';
    adminPanel.innerHTML = `
        <div class="admin-header">
            <h3>Панель администратора</h3>
            <div class="admin-toggle">
                <span>Режим админа:</span>
                <label class="switch">
                    <input type="checkbox" id="adminToggle" ${isAdminMode ? 'checked' : ''}>
                    <span class="slider round"></span>
                </label>
            </div>
        </div>
        <div class="admin-controls">
            <button id="addBookBtn" class="btn">
                <i class="fas fa-plus"></i> Добавить книгу
            </button>
            <button id="viewUsersBtn" class="btn btn-outline">
                <i class="fas fa-users"></i> Просмотр пользователей
            </button>
            <button id="refreshBooksBtn" class="btn btn-outline">
                <i class="fas fa-sync"></i> Обновить
            </button>
        </div>
    `;
    
    booksSection.insertBefore(adminPanel, booksSection.querySelector('.section-header'));
    
    // Назначаем обработчики
    document.getElementById('adminToggle').addEventListener('change', toggleAdminMode);
    document.getElementById('addBookBtn').addEventListener('click', () => {
        addBookModal.style.display = 'flex';
    });
    document.getElementById('viewUsersBtn').addEventListener('click', showUsersList);
    document.getElementById('refreshBooksBtn').addEventListener('click', loadBooksFromFirestore);
}

// Переключение режима админа
function toggleAdminMode(e) {
    isAdminMode = e.target.checked;
    loadBooksFromFirestore(); // Перезагружаем книги для отображения кнопок админа
}

// Показать список пользователей
function showUsersList() {
    if (!adminUser) {
        showNotification('Эта функция доступна только администраторам', 'error');
        return;
    }
    
    db.collection("users").get()
        .then((querySnapshot) => {
            let usersHTML = '<h3>Зарегистрированные пользователи</h3>';
            let userCount = 0;
            
            usersHTML += '<div style="max-height: 400px; overflow-y: auto; margin-top: 20px;">';
            usersHTML += '<table>';
            usersHTML += '<thead><tr>';
            usersHTML += '<th>Имя</th>';
            usersHTML += '<th>Email</th>';
            usersHTML += '<th>Роль</th>';
            usersHTML += '<th>Дата регистрации</th>';
            usersHTML += '<th>Скачано книг</th>';
            usersHTML += '</tr></thead>';
            usersHTML += '<tbody>';
            
            querySnapshot.forEach((doc) => {
                const user = doc.data();
                userCount++;
                
                const createdAt = user.createdAt ? 
                    new Date(user.createdAt.toDate ? user.createdAt.toDate() : user.createdAt).toLocaleDateString('ru-RU') : 
                    'Не указана';
                
                usersHTML += '<tr>';
                usersHTML += `<td>${user.name || 'Не указано'}</td>`;
                usersHTML += `<td>${user.email}</td>`;
                usersHTML += `<td>
                    <select class="role-select" data-uid="${doc.id}" style="width: 100%; padding: 5px;">
                        <option value="user" ${user.role === 'user' ? 'selected' : ''}>Пользователь</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Администратор</option>
                    </select>
                </td>`;
                usersHTML += `<td>${createdAt}</td>`;
                usersHTML += `<td>${user.downloadsCount || 0}</td>`;
                usersHTML += '</tr>';
            });
            
            usersHTML += '</tbody></table>';
            usersHTML += '</div>';
            usersHTML += `<p style="margin-top: 10px;"><strong>Всего пользователей:</strong> ${userCount}</p>`;
            usersHTML += `<button id="saveRolesBtn" class="btn" style="margin-top: 10px;">Сохранить изменения ролей</button>`;
            
            showUsersModal(usersHTML);
        })
        .catch((error) => {
            console.error("Error getting users:", error);
            showNotification('Ошибка загрузки списка пользователей: ' + error.message, 'error');
        });
}

// Показать модальное окно с пользователями
function showUsersModal(content) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px; max-height: 80vh; overflow-y: auto;">
            <span class="close-modal" id="closeUsersModal">&times;</span>
            ${content}
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('closeUsersModal').addEventListener('click', () => {
        modal.remove();
    });
    
    document.getElementById('saveRolesBtn').addEventListener('click', saveUserRoles);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Сохранение ролей пользователей
function saveUserRoles() {
    const roleSelects = document.querySelectorAll('.role-select');
    let updatePromises = [];
    
    roleSelects.forEach(select => {
        const uid = select.getAttribute('data-uid');
        const newRole = select.value;
        
        updatePromises.push(
            db.collection("users").doc(uid).update({
                role: newRole
            })
        );
    });
    
    Promise.all(updatePromises)
        .then(() => {
            modal = document.querySelector('#usersModal');
            if (modal) modal.remove();
            showNotification('Роли пользователей успешно обновлены!', 'success');
        })
        .catch((error) => {
            console.error("Error updating roles:", error);
            showNotification('Ошибка обновления ролей: ' + error.message, 'error');
        });
}

// ============ ДОБАВЛЕНИЕ КНИГ ============

// Настройка формы добавления книги
function setupAddBookForm() {
    // Предпросмотр обложки
    coverUpload.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('previewImage').src = e.target.result;
                document.getElementById('coverPreview').style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Информация о PDF файле
    pdfUpload.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const fileSize = (file.size / (1024 * 1024)).toFixed(2);
            fileInfo.textContent = `Файл: ${file.name} (${fileSize} MB)`;
            fileInfo.style.color = '#333';
        }
    });
    
    // Обработка отправки формы
    addBookForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (!adminUser) {
            showNotification('Только администраторы могут добавлять книги', 'error');
            return;
        }
        
        const bookData = {
            title: document.getElementById('bookTitle').value,
            author: document.getElementById('bookAuthor').value,
            description: document.getElementById('bookDescription').value,
            category: document.getElementById('bookCategory').value,
            year: parseInt(document.getElementById('bookYear').value) || new Date().getFullYear(),
            language: document.getElementById('bookLanguage').value,
            pages: parseInt(document.getElementById('bookPages').value) || 0,
            format: 'PDF',
            downloads: 0,
            addedBy: adminUser.uid,
            addedAt: new Date().toISOString(),
            approved: true
        };
        
        const pdfFile = pdfUpload.files[0];
        const coverFile = coverUpload.files[0];
        
        if (!pdfFile) {
            showNotification('Пожалуйста, выберите PDF файл', 'error');
            return;
        }
        
        // Показать индикатор загрузки
        const addBookBtn = document.querySelector('#addBookForm button[type="submit"]');
        const originalText = addBookBtn.innerHTML;
        addBookBtn.innerHTML = '<div class="button-loader"></div> Загрузка...';
        addBookBtn.disabled = true;
        
        // 1. Загружаем PDF в Storage
        const pdfFileName = `books/${Date.now()}_${pdfFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const pdfRef = storage.ref().child(pdfFileName);
        
        uploadProgress.style.display = 'block';
        const pdfUploadTask = pdfRef.put(pdfFile);
        
        pdfUploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                uploadProgress.value = progress;
            },
            (error) => {
                console.error("PDF upload error:", error);
                showNotification('Ошибка загрузки PDF файла: ' + error.message, 'error');
                resetAddBookForm();
                addBookBtn.innerHTML = originalText;
                addBookBtn.disabled = false;
            },
            async () => {
                // PDF загружен успешно, получаем URL
                const pdfUrl = await pdfUploadTask.snapshot.ref.getDownloadURL();
                bookData.fileUrl = pdfUrl;
                bookData.fileName = pdfFile.name;
                bookData.fileSize = (pdfFile.size / (1024 * 1024)).toFixed(2) + ' MB';
                
                // 2. Загружаем обложку (если есть)
                if (coverFile) {
                    const coverFileName = `covers/${Date.now()}_${coverFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
                    const coverRef = storage.ref().child(coverFileName);
                    const coverUploadTask = coverRef.put(coverFile);
                    
                    coverUploadTask.then(async (snapshot) => {
                        const coverUrl = await snapshot.ref.getDownloadURL();
                        bookData.cover = coverUrl;
                        saveBookToFirestore(bookData, addBookBtn, originalText);
                    }).catch(error => {
                        console.error("Cover upload error:", error);
                        bookData.cover = document.getElementById('bookCover').value || 
                                        'https://images.unsplash.com/photo-1541963463532-d68292c34b19?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80';
                        saveBookToFirestore(bookData, addBookBtn, originalText);
                    });
                } else {
                    bookData.cover = document.getElementById('bookCover').value || 
                                    'https://images.unsplash.com/photo-1541963463532-d68292c34b19?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80';
                    saveBookToFirestore(bookData, addBookBtn, originalText);
                }
            }
        );
    });
    
    // Закрытие модального окна
    closeAddBookModal.addEventListener('click', () => {
        addBookModal.style.display = 'none';
        resetAddBookForm();
    });
}

// Сохранение книги в Firestore
function saveBookToFirestore(bookData, addBookBtn, originalText) {
    db.collection("books").add(bookData)
        .then((docRef) => {
            console.log("Book added with ID: ", docRef.id);
            showNotification('Книга успешно добавлена!', 'success');
            resetAddBookForm();
            addBookModal.style.display = 'none';
            loadBooksFromFirestore();
        })
        .catch((error) => {
            console.error("Error adding book: ", error);
            showNotification('Ошибка сохранения книги: ' + error.message, 'error');
        })
        .finally(() => {
            if (addBookBtn) {
                addBookBtn.innerHTML = originalText;
                addBookBtn.disabled = false;
            }
            uploadProgress.style.display = 'none';
        });
}

// Сброс формы добавления книги
function resetAddBookForm() {
    addBookForm.reset();
    document.getElementById('coverPreview').style.display = 'none';
    uploadProgress.style.display = 'none';
    uploadProgress.value = 0;
    fileInfo.textContent = '';
}

// Редактирование книги
function editBook(bookId) {
    showNotification('Функция редактирования в разработке', 'info');
    // В будущем можно реализовать полноценное редактирование
}

// Удаление книги
function deleteBook(bookId) {
    if (!confirm('Вы уверены, что хотите удалить эту книгу? Это действие нельзя отменить.')) {
        return;
    }
    
    db.collection("books").doc(bookId).delete()
        .then(() => {
            showNotification('Книга успешно удалена', 'success');
            loadBooksFromFirestore();
        })
        .catch(error => {
            console.error("Error deleting book:", error);
            showNotification('Ошибка удаления книги: ' + error.message, 'error');
        });
}

// ============ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ============

// Обновление интерфейса для авторизованного пользователя
function updateUIForLoggedInUser() {
    const userContainer = document.querySelector('.user-info');
    userContainer.innerHTML = `
        <span>${currentUser.displayName || currentUser.email}</span>
        <button id="logoutBtn" class="btn btn-outline">Выйти</button>
    `;
    
    document.getElementById('logoutBtn').addEventListener('click', logout);
}

// Обновление интерфейса для неавторизованного пользователя
function updateUIForLoggedOutUser() {
    const userContainer = document.querySelector('.user-info');
    userContainer.innerHTML = `
        <button id="loginBtn" class="btn btn-outline">Войти</button>
        <button id="registerBtn" class="btn">Регистрация</button>
    `;
    
    document.getElementById('loginBtn').addEventListener('click', () => {
        loginModal.style.display = 'flex';
    });
    
    document.getElementById('registerBtn').addEventListener('click', () => {
        registerModal.style.display = 'flex';
    });
}

// Показать уведомление
function showNotification(message, type = 'info') {
    // Удаляем старые уведомления
    const oldNotifications = document.querySelectorAll('.notification');
    oldNotifications.forEach(notif => notif.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Автоматическое скрытие через 5 секунд
    setTimeout(() => {
        notification.remove();
    }, 5000);
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
            showNotification('Пароли не совпадают', 'error');
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
        if (e.target === addBookModal) {
            addBookModal.style.display = 'none';
            resetAddBookForm();
        }
    });
    
    // Плавная прокрутка для якорных ссылок
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ============ ФУНКЦИИ ДЛЯ ОТЛАДКИ ============

// Проверка подключения к Firebase
console.log("Firebase services initialized:", {
    auth: !!auth,
    firestore: !!db,
    storage: !!storage
});

// Глобальная функция для отладки (можно вызывать из консоли браузера)
window.debugApp = {
    getCurrentUser: () => currentUser,
    getAdminStatus: () => adminUser,
    reloadBooks: () => loadBooksFromFirestore(),
    checkFirestoreConnection: () => {
        console.log("Checking Firestore connection...");
        db.collection("books").limit(1).get()
            .then(snapshot => {
                console.log("Firestore connection OK. Books count:", snapshot.size);
            })
            .catch(error => {
                console.error("Firestore connection error:", error);
            });
    }
};
