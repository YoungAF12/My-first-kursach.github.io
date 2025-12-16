// users.js - Система пользователей и публичные профили

class UserManager {
    constructor() {
        this.STORAGE_KEY = 'digital-library-users';
        this.CURRENT_USER_KEY = 'digital-library-current-user';
        this.init();
    }
    
    init() {
        // Инициализация хранилища пользователей
        if (!localStorage.getItem(this.STORAGE_KEY)) {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify([]));
        }
        
        // Загружаем текущего пользователя
        this.currentUser = this.getCurrentUser();
        
        // Инициализируем модальные окна
        this.initModals();
    }
    
    // Регистрация нового пользователя
    register(username, email, password) {
        const users = this.getAllUsers();
        
        // Проверка на существующего пользователя
        if (users.find(u => u.email === email)) {
            throw new Error('Пользователь с таким email уже существует');
        }
        
        if (users.find(u => u.username === username)) {
            throw new Error('Пользователь с таким именем уже существует');
        }
        
        // Создаем нового пользователя
        const newUser = {
            id: Date.now().toString(),
            username,
            email,
            password: this.hashPassword(password),
            joinDate: new Date().toISOString(),
            uploadedBooks: [],
            totalViews: 0,
            totalDownloads: 0
        };
        
        users.push(newUser);
        this.saveUsers(users);
        
        // Автоматически входим
        this.login(email, password);
        
        return newUser;
    }
    
    // Вход пользователя
    login(email, password) {
        const users = this.getAllUsers();
        const user = users.find(u => u.email === email);
        
        if (!user) {
            throw new Error('Пользователь не найден');
        }
        
        if (user.password !== this.hashPassword(password)) {
            throw new Error('Неверный пароль');
        }
        
        // Сохраняем текущего пользователя
        localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify({
            id: user.id,
            email: user.email,
            username: user.username
        }));
        
        this.currentUser = user;
        return user;
    }
    
    // Выход
    logout() {
        localStorage.removeItem(this.CURRENT_USER_KEY);
        this.currentUser = null;
        return true;
    }
    
    // Получить текущего пользователя
    getCurrentUser() {
        try {
            const userData = localStorage.getItem(this.CURRENT_USER_KEY);
            if (!userData) return null;
            
            const { id } = JSON.parse(userData);
            const users = this.getAllUsers();
            return users.find(u => u.id === id) || null;
        } catch (error) {
            return null;
        }
    }
    
    // Проверить авторизован ли пользователь
    isAuthenticated() {
        return this.currentUser !== null;
    }
    
    // Получить пользователя по ID
    getUserById(userId) {
        const users = this.getAllUsers();
        return users.find(u => u.id === userId) || null;
    }
    
    // Получить книги пользователя
    getUserBooks(userId) {
        return bookStorage.getBooksByUser(userId);
    }
    
    // Добавить книгу к пользователю
    addBookToUser(bookId) {
        if (!this.currentUser) return;
        
        const users = this.getAllUsers();
        const userIndex = users.findIndex(u => u.id === this.currentUser.id);
        
        if (userIndex !== -1) {
            if (!users[userIndex].uploadedBooks.includes(bookId)) {
                users[userIndex].uploadedBooks.push(bookId);
                this.saveUsers(users);
                this.currentUser = users[userIndex];
            }
        }
    }
    
    // Обновить статистику пользователя
    updateUserStats(bookId, viewsIncrement = 0, downloadsIncrement = 0) {
        const users = this.getAllUsers();
        const userIndex = users.findIndex(u => 
            u.uploadedBooks && u.uploadedBooks.includes(bookId)
        );
        
        if (userIndex !== -1) {
            users[userIndex].totalViews = (users[userIndex].totalViews || 0) + viewsIncrement;
            users[userIndex].totalDownloads = (users[userIndex].totalDownloads || 0) + downloadsIncrement;
            this.saveUsers(users);
        }
    }
    
    // Получить топ пользователей
    getTopUsers(limit = 10) {
        const users = this.getAllUsers();
        return users
            .filter(u => u.uploadedBooks && u.uploadedBooks.length > 0)
            .sort((a, b) => (b.uploadedBooks?.length || 0) - (a.uploadedBooks?.length || 0))
            .slice(0, limit);
    }
    
    // Хэширование пароля (упрощенное, для демо)
    hashPassword(password) {
        // В реальном приложении используйте bcrypt или подобное!
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }
    
    // Получить всех пользователей
    getAllUsers() {
        try {
            const users = JSON.parse(localStorage.getItem(this.STORAGE_KEY));
            return Array.isArray(users) ? users : [];
        } catch (error) {
            return [];
        }
    }
    
    // Сохранить всех пользователей
    saveUsers(users) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(users));
    }
    
    // Инициализация модальных окон
    initModals() {
        this.initAuthModal();
    }
    
    initAuthModal() {
        // Добавляем модальное окно авторизации в DOM
        if (!document.getElementById('authModal')) {
            const authModalHTML = `
                <div class="modal-overlay" id="authModal">
                    <div class="modal-content auth-modal">
                        <button class="modal-close" id="closeAuthModal">
                            <i class="fas fa-times"></i>
                        </button>
                        
                        <div class="auth-tabs">
                            <button class="auth-tab active" data-tab="login">Вход</button>
                            <button class="auth-tab" data-tab="register">Регистрация</button>
                        </div>
                        
                        <!-- Форма входа -->
                        <form class="auth-form active" id="loginForm">
                            <div class="form-group">
                                <input type="email" id="loginEmail" placeholder="Email" required>
                            </div>
                            <div class="form-group">
                                <input type="password" id="loginPassword" placeholder="Пароль" required>
                            </div>
                            <button type="submit" class="btn-primary">
                                <i class="fas fa-sign-in-alt"></i>
                                Войти
                            </button>
                        </form>
                        
                        <!-- Форма регистрации -->
                        <form class="auth-form" id="registerForm">
                            <div class="form-group">
                                <input type="text" id="registerUsername" placeholder="Имя пользователя" required>
                            </div>
                            <div class="form-group">
                                <input type="email" id="registerEmail" placeholder="Email" required>
                            </div>
                            <div class="form-group">
                                <input type="password" id="registerPassword" placeholder="Пароль" required>
                            </div>
                            <div class="form-group">
                                <input type="password" id="registerConfirmPassword" placeholder="Подтвердите пароль" required>
                            </div>
                            <button type="submit" class="btn-primary">
                                <i class="fas fa-user-plus"></i>
                                Зарегистрироваться
                            </button>
                        </form>
                        
                        <div class="auth-footer">
                            <p id="authMessage"></p>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', authModalHTML);
            
            // Инициализация табов
            this.initAuthTabs();
            
            // Инициализация форм
            this.initAuthForms();
        }
    }
    
    initAuthTabs() {
        const tabs = document.querySelectorAll('.auth-tab');
        const forms = document.querySelectorAll('.auth-form');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                
                // Обновляем активные табы
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Показываем соответствующую форму
                forms.forEach(form => {
                    form.classList.remove('active');
                    if (form.id === `${tabName}Form`) {
                        form.classList.add('active');
                    }
                });
            });
        });
    }
    
    initAuthForms() {
        // Форма входа
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }
        
        // Форма регистрации
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        }
        
        // Закрытие модального окна
        const closeBtn = document.getElementById('closeAuthModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeAuthModal();
            });
        }
        
        const authModal = document.getElementById('authModal');
        if (authModal) {
            authModal.addEventListener('click', (e) => {
                if (e.target === e.currentTarget) {
                    this.closeAuthModal();
                }
            });
        }
    }
    
    async handleLogin() {
        const emailInput = document.getElementById('loginEmail');
        const passwordInput = document.getElementById('loginPassword');
        
        if (!emailInput || !passwordInput) return;
        
        const email = emailInput.value;
        const password = passwordInput.value;
        
        try {
            const user = this.login(email, password);
            this.showAuthMessage(`Добро пожаловать, ${user.username}!`, 'success');
            
            setTimeout(() => {
                this.closeAuthModal();
                this.updateUIAfterAuth();
                location.reload(); // Обновляем страницу для отображения изменений
            }, 1500);
            
        } catch (error) {
            this.showAuthMessage(error.message, 'error');
        }
    }
    
    async handleRegister() {
        const usernameInput = document.getElementById('registerUsername');
        const emailInput = document.getElementById('registerEmail');
        const passwordInput = document.getElementById('registerPassword');
        const confirmPasswordInput = document.getElementById('registerConfirmPassword');
        
        if (!usernameInput || !emailInput || !passwordInput || !confirmPasswordInput) return;
        
        const username = usernameInput.value;
        const email = emailInput.value;
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        // Валидация
        if (password !== confirmPassword) {
            this.showAuthMessage('Пароли не совпадают', 'error');
            return;
        }
        
        if (password.length < 6) {
            this.showAuthMessage('Пароль должен содержать минимум 6 символов', 'error');
            return;
        }
        
        if (username.length < 3) {
            this.showAuthMessage('Имя пользователя должно содержать минимум 3 символа', 'error');
            return;
        }
        
        try {
            const user = this.register(username, email, password);
            this.showAuthMessage(`Регистрация успешна! Добро пожаловать, ${username}!`, 'success');
            
            setTimeout(() => {
                this.closeAuthModal();
                this.updateUIAfterAuth();
                location.reload();
            }, 1500);
            
        } catch (error) {
            this.showAuthMessage(error.message, 'error');
        }
    }
    
    showAuthMessage(message, type = 'info') {
        const messageEl = document.getElementById('authMessage');
        if (!messageEl) return;
        
        messageEl.textContent = message;
        messageEl.className = `auth-message ${type}`;
    }
    
    openAuthModal() {
        const authModal = document.getElementById('authModal');
        if (authModal) {
            authModal.classList.add('active');
        }
    }
    
    closeAuthModal() {
        const authModal = document.getElementById('authModal');
        if (authModal) {
            authModal.classList.remove('active');
        }
        
        // Очищаем формы
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        
        if (loginForm) loginForm.reset();
        if (registerForm) registerForm.reset();
        
        this.showAuthMessage('');
    }
    
    showProfile(userId) {
        const user = this.getUserById(userId);
        if (!user) return;
        
        const userBooks = this.getUserBooks(userId);
        
        // Создаем модальное окно профиля
        const profileModalHTML = `
            <div class="modal-overlay" id="profileModal">
                <div class="modal-content profile-modal">
                    <button class="modal-close" id="closeProfileModal">
                        <i class="fas fa-times"></i>
                    </button>
                    
                    <div class="profile-header">
                        <div class="profile-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="profile-info">
                            <h2>${user.username}</h2>
                            <p class="profile-email">${user.email}</p>
                            <p class="profile-join-date">
                                <i class="fas fa-calendar-alt"></i>
                                Зарегистрирован: ${new Date(user.joinDate).toLocaleDateString('ru-RU')}
                            </p>
                        </div>
                    </div>
                    
                    <div class="profile-stats">
                        <div class="profile-stat">
                            <div class="stat-value">${userBooks.length}</div>
                            <div class="stat-label">Загружено книг</div>
                        </div>
                        <div class="profile-stat">
                            <div class="stat-value">${user.totalViews || 0}</div>
                            <div class="stat-label">Всего просмотров</div>
                        </div>
                        <div class="profile-stat">
                            <div class="stat-value">${user.totalDownloads || 0}</div>
                            <div class="stat-label">Всего скачиваний</div>
                        </div>
                    </div>
                    
                    <div class="profile-books">
                        <h3>Загруженные книги (${userBooks.length})</h3>
                        ${userBooks.length > 0 ? `
                            <div class="profile-books-grid">
                                ${userBooks.map(book => `
                                    <div class="profile-book-card" data-id="${book.id}">
                                        <div class="book-icon">
                                            <i class="fas fa-${book.format === 'pdf' ? 'file-pdf' : 'file-alt'}"></i>
                                        </div>
                                        <div class="book-details">
                                            <h4>${book.title}</h4>
                                            <p>${book.author}</p>
                                            <div class="book-stats-small">
                                                <span><i class="fas fa-eye"></i> ${book.views || 0}</span>
                                                <span><i class="fas fa-download"></i> ${book.downloads || 0}</span>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <div class="no-books">
                                <i class="fas fa-book-open"></i>
                                <p>Пользователь еще не загрузил ни одной книги</p>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;
        
        // Удаляем старый модальный, если есть
        const oldModal = document.getElementById('profileModal');
        if (oldModal) oldModal.remove();
        
        // Добавляем новый
        document.body.insertAdjacentHTML('beforeend', profileModalHTML);
        
        // Показываем модальное окно
        document.getElementById('profileModal').classList.add('active');
        
        // Обработчики событий
        document.getElementById('closeProfileModal').addEventListener('click', () => {
            document.getElementById('profileModal').classList.remove('active');
        });
        
        document.getElementById('profileModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                document.getElementById('profileModal').classList.remove('active');
            }
        });
        
        // Клик по книге открывает просмотр
        document.querySelectorAll('.profile-book-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const bookId = card.dataset.id;
                const book = bookStorage.getBookById(bookId);
                if (book && window.bookViewer) {
                    document.getElementById('profileModal').classList.remove('active');
                    setTimeout(() => {
                        window.bookViewer.showBook(book);
                    }, 300);
                }
            });
        });
    }
    
    updateUIAfterAuth() {
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn && this.currentUser) {
            loginBtn.innerHTML = `
                <i class="fas fa-user"></i>
                <span>${this.currentUser.username}</span>
            `;
            loginBtn.onclick = () => this.showProfile(this.currentUser.id);
        }
    }
    
    // Показать профиль текущего пользователя
    showCurrentUserProfile() {
        if (this.currentUser) {
            this.showProfile(this.currentUser.id);
        } else {
            this.openAuthModal();
        }
    }
}

// Глобальный экземпляр менеджера пользователей
window.userManager = new UserManager();
