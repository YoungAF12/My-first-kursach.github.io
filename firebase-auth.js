// firebase-auth.js
class FirebaseAuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }
    
    init() {
        // Слушатель изменения состояния авторизации
        auth.onAuthStateChanged((user) => {
            this.currentUser = user;
            this.updateUI();
            
            if (user) {
                console.log('Пользователь вошел:', user.email);
            } else {
                console.log('Пользователь вышел');
            }
        });
        
        this.initAuthModal();
    }
    
    // Регистрация
    async register(email, password, username) {
        try {
            // Создаем пользователя
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Сохраняем дополнительную информацию в Firestore
            await db.collection('users').doc(user.uid).set({
                username: username,
                email: email,
                joinDate: firebase.firestore.FieldValue.serverTimestamp(),
                uploadedBooks: 0,
                totalViews: 0,
                totalDownloads: 0
            });
            
            return { success: true, user: user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    // Вход
    async login(email, password) {
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            return { success: true, user: userCredential.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    // Выход
    async logout() {
        try {
            await auth.signOut();
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    // Проверка авторизации
    isAuthenticated() {
        return this.currentUser !== null;
    }
    
    // Получение данных пользователя
    async getUserData(userId = null) {
        const uid = userId || (this.currentUser ? this.currentUser.uid : null);
        if (!uid) return null;
        
        try {
            const userDoc = await db.collection('users').doc(uid).get();
            if (userDoc.exists) {
                return { id: userDoc.id, ...userDoc.data() };
            }
            return null;
        } catch (error) {
            console.error('Ошибка получения данных пользователя:', error);
            return null;
        }
    }
    
    // Обновление статистики пользователя
    async updateUserStats(userId, field, increment = 1) {
        try {
            await db.collection('users').doc(userId).update({
                [field]: firebase.firestore.FieldValue.increment(increment)
            });
            return true;
        } catch (error) {
            console.error('Ошибка обновления статистики:', error);
            return false;
        }
    }
    
    // Инициализация модального окна авторизации
    initAuthModal() {
        // Создаем модальное окно, если его нет
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
            
            this.initAuthTabs();
            this.initAuthForms();
        }
    }
    
    initAuthTabs() {
        const tabs = document.querySelectorAll('.auth-tab');
        const forms = document.querySelectorAll('.auth-form');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                forms.forEach(form => {
                    form.classList.remove('active');
                    if (form.id === `${tabName}Form`) {
                        form.classList.add('active');
                    }
                });
                
                document.getElementById('authMessage').textContent = '';
            });
        });
    }
    
    initAuthForms() {
        // Форма входа
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLogin();
        });
        
        // Форма регистрации
        document.getElementById('registerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleRegister();
        });
        
        // Закрытие модального окна
        document.getElementById('closeAuthModal').addEventListener('click', () => {
            this.closeAuthModal();
        });
        
        document.getElementById('authModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.closeAuthModal();
            }
        });
    }
    
    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        this.showAuthMessage('Вход...', 'info');
        
        const result = await this.login(email, password);
        
        if (result.success) {
            this.showAuthMessage('Успешный вход!', 'success');
            setTimeout(() => {
                this.closeAuthModal();
            }, 1500);
        } else {
            this.showAuthMessage(result.error, 'error');
        }
    }
    
    async handleRegister() {
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;
        
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
        
        this.showAuthMessage('Регистрация...', 'info');
        
        const result = await this.register(email, password, username);
        
        if (result.success) {
            this.showAuthMessage('Регистрация успешна!', 'success');
            setTimeout(() => {
                this.closeAuthModal();
            }, 1500);
        } else {
            this.showAuthMessage(result.error, 'error');
        }
    }
    
    showAuthMessage(message, type = 'info') {
        const messageEl = document.getElementById('authMessage');
        messageEl.textContent = message;
        messageEl.className = `auth-message ${type}`;
    }
    
    openAuthModal() {
        document.getElementById('authModal').classList.add('active');
    }
    
    closeAuthModal() {
        document.getElementById('authModal').classList.remove('active');
        document.getElementById('loginForm').reset();
        document.getElementById('registerForm').reset();
        this.showAuthMessage('');
    }
    
    // Обновление UI
    updateUI() {
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            if (this.currentUser) {
                // Получаем данные пользователя для отображения имени
                this.getUserData().then(userData => {
                    const username = userData ? userData.username : this.currentUser.email;
                    loginBtn.innerHTML = `
                        <i class="fas fa-user"></i>
                        <span>${username}</span>
                    `;
                    loginBtn.onclick = () => this.showUserProfile();
                });
            } else {
                loginBtn.innerHTML = `
                    <i class="fas fa-user"></i>
                    <span>Войти</span>
                `;
                loginBtn.onclick = () => this.openAuthModal();
            }
        }
    }
    
    // Показать профиль пользователя
    async showUserProfile(userId = null) {
        const uid = userId || (this.currentUser ? this.currentUser.uid : null);
        if (!uid) return;
        
        try {
            const userData = await this.getUserData(uid);
            if (!userData) return;
            
            // Получаем книги пользователя
            const userBooks = await firestoreManager.getBooksByUser(uid);
            
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
                                <h2>${userData.username}</h2>
                                <p class="profile-email">${userData.email}</p>
                                <p class="profile-join-date">
                                    <i class="fas fa-calendar-alt"></i>
                                    Зарегистрирован: ${new Date(userData.joinDate?.toDate()).toLocaleDateString('ru-RU')}
                                </p>
                            </div>
                        </div>
                        
                        <div class="profile-stats">
                            <div class="profile-stat">
                                <div class="stat-value">${userBooks.length}</div>
                                <div class="stat-label">Загружено книг</div>
                            </div>
                            <div class="profile-stat">
                                <div class="stat-value">${userData.totalViews || 0}</div>
                                <div class="stat-label">Всего просмотров</div>
                            </div>
                            <div class="profile-stat">
                                <div class="stat-value">${userData.totalDownloads || 0}</div>
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
                    // Здесь можно добавить открытие книги
                });
            });
            
        } catch (error) {
            console.error('Ошибка загрузки профиля:', error);
        }
    }
}

// Глобальный экземпляр
window.authManager = new FirebaseAuthManager();
