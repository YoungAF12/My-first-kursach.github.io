// app.js - Основная логика приложения

class DigitalLibraryApp {
    constructor() {
        // Получаем тему из localStorage или используем 'light' по умолчанию
        this.currentTheme = localStorage.getItem('digital-library-theme') || 'light';
        this.init();
    }
    
    init() {
        // Применяем тему сразу при инициализации
        this.applyTheme();
        
        // Инициализация анимаций
        this.initAnimations();
        
        // Инициализация счетчиков
        this.initCounters();
        
        // Инициализация модальных окон
        this.initModals();
        
        // Инициализация меню для мобильных устройств
        this.initMobileMenu();
        
        // Инициализация форм
        this.initForms();
        
        // Инициализация пользовательской системы
        this.initUserSystem();
        
        // Скрываем лоадер
        this.hideLoader();
        
        // Отображение последних книг на главной
        if (document.getElementById('recentBooks')) {
            this.displayRecentBooks();
        }
    }
    
    // Применение темы
    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        localStorage.setItem('digital-library-theme', this.currentTheme);
        this.updateThemeIcon();
    }
    
    // Переключение темы
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme();
    }
    
    // Обновление иконки темы
    updateThemeIcon() {
        const icon = document.querySelector('#themeToggle i');
        if (icon) {
            icon.className = this.currentTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
            // Обновляем текст
            const text = icon.nextElementSibling;
            if (text) {
                text.textContent = this.currentTheme === 'light' ? 'Тёмная' : 'Светлая';
            }
        }
    }
    
    // Анимации
    initAnimations() {
        // Анимация появления элементов при скролле
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, observerOptions);
        
        // Наблюдаем за элементами с анимацией
        document.querySelectorAll('.feature-card, .book-card, .step').forEach(el => {
            observer.observe(el);
        });
        
        // Анимация текста в заголовке
        this.animateText();
    }
    
    animateText() {
        const title = document.querySelector('.animate-text');
        if (title) {
            const text = title.textContent;
            title.innerHTML = '';
            
            text.split('').forEach((char, i) => {
                const span = document.createElement('span');
                span.textContent = char;
                span.style.animationDelay = `${i * 0.05}s`;
                span.classList.add('char-animate');
                title.appendChild(span);
            });
        }
    }
    
    // Анимированные счетчики
    initCounters() {
        const counters = document.querySelectorAll('.stat-number');
        counters.forEach(counter => {
            const target = parseInt(counter.getAttribute('data-count'));
            const duration = 2000;
            const step = target / (duration / 16);
            
            let current = 0;
            const timer = setInterval(() => {
                current += step;
                if (current >= target) {
                    current = target;
                    clearInterval(timer);
                }
                counter.textContent = Math.floor(current);
            }, 16);
        });
    }
    
    // Модальные окна
    initModals() {
        const loginModal = document.getElementById('loginModal');
        const closeModal = document.querySelector('.close-modal');
        
        if (closeModal && loginModal) {
            closeModal.addEventListener('click', () => {
                loginModal.classList.remove('active');
            });
            
            loginModal.addEventListener('click', (e) => {
                if (e.target === loginModal) {
                    loginModal.classList.remove('active');
                }
            });
        }
    }
    
    // Мобильное меню
    initMobileMenu() {
        const toggleBtn = document.getElementById('mobileMenuToggle');
        const navMenu = document.querySelector('.nav-menu');
        
        if (toggleBtn && navMenu) {
            toggleBtn.addEventListener('click', () => {
                navMenu.style.display = navMenu.style.display === 'flex' ? 'none' : 'flex';
            });
            
            // Закрытие меню при клике на ссылку
            document.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', () => {
                    navMenu.style.display = 'none';
                });
            });
        }
    }
    
    // Формы
    initForms() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.showNotification('Вход выполнен успешно!', 'success');
                document.getElementById('loginModal').classList.remove('active');
            });
        }
    }
    
    // Инициализация пользовательской системы
    initUserSystem() {
        // Обновляем UI в зависимости от авторизации
        this.updateUserUI();
        
        // Назначаем обработчик для кнопки входа/профиля
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (window.userManager && window.userManager.isAuthenticated()) {
                    window.userManager.showCurrentUserProfile();
                } else {
                    window.userManager.openAuthModal();
                }
            });
        }
    }
    
    // Обновление UI пользователя
    updateUserUI() {
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn && window.userManager) {
            if (window.userManager.isAuthenticated()) {
                const user = window.userManager.currentUser;
                loginBtn.innerHTML = `
                    <i class="fas fa-user"></i>
                    <span>${user.username}</span>
                `;
            } else {
                loginBtn.innerHTML = `
                    <i class="fas fa-user"></i>
                    <span>Войти</span>
                `;
            }
        }
    }
    
    // Показать последние книги
    displayRecentBooks() {
        const recentBooks = bookStorage.getRecentBooks(4);
        const booksGrid = document.getElementById('recentBooks');
        
        if (booksGrid) {
            booksGrid.innerHTML = this.generateBookCards(recentBooks);
            
            // Добавляем обработчики событий для кнопок
            this.addBookCardEventListeners();
        }
    }
    
    // Генерация карточек книг
    generateBookCards(books) {
        return books.map(book => `
            <div class="book-card" data-id="${book.id}">
                <div class="book-cover">
                    <i class="fas fa-${book.format === 'pdf' ? 'file-pdf' : 'file-alt'}"></i>
                    <span class="book-format">${book.format.toUpperCase()}</span>
                </div>
                <div class="book-info">
                    <div class="book-meta">
                        <span class="book-genre">${book.genre}</span>
                        <span class="book-date">${this.formatDate(book.dateAdded)}</span>
                    </div>
                    <h3 class="book-title">${book.title}</h3>
                    <p class="book-author">${book.author}</p>
                    
                    <!-- Информация о загрузившем -->
                    ${book.uploadedBy ? `
                        <div class="book-uploader">
                            <i class="fas fa-user"></i>
                            <span class="uploader-name" 
                                  onclick="userManager.showProfile('${book.uploadedBy}')"
                                  style="cursor: pointer;">
                                ${book.uploadedByName}
                            </span>
                        </div>
                    ` : ''}
                    
                    <p class="book-description">${book.description || 'Без описания'}</p>
                    
                    <div class="book-stats">
                        <span class="book-stat">
                            <i class="fas fa-eye"></i>
                            ${book.views || 0}
                        </span>
                        <span class="book-stat">
                            <i class="fas fa-download"></i>
                            ${book.downloads || 0}
                        </span>
                        <span class="book-stat">
                            <i class="fas fa-file"></i>
                            ${this.formatFileSize(book.size || 0)}
                        </span>
                    </div>
                    
                    <div class="book-actions">
                        <button class="action-btn read-btn">
                            <i class="fas fa-eye"></i>
                            Читать
                        </button>
                        <button class="action-btn download-btn">
                            <i class="fas fa-download"></i>
                            Скачать
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    // Добавление обработчиков для карточек книг
    addBookCardEventListeners() {
    // Кнопки чтения
    document.querySelectorAll('.read-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const bookCard = e.target.closest('.book-card');
            const bookId = bookCard.dataset.id;
            const book = bookStorage.getBookById(bookId);
            if (book) {
                this.readBook(book);
            }
        });
    });
    
    // Кнопки скачивания
    document.querySelectorAll('.download-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const bookCard = e.target.closest('.book-card');
            const bookId = bookCard.dataset.id;
            this.downloadBook(bookId);
        });
    });
    
    // Клик по имени пользователя
    document.querySelectorAll('.uploader-name').forEach(name => {
        name.addEventListener('click', (e) => {
            e.stopPropagation();
            const bookCard = e.target.closest('.book-card');
            const bookId = bookCard.dataset.id;
            const book = bookStorage.getBookById(bookId);
            if (book && book.uploadedBy && window.userManager) {
                window.userManager.showProfile(book.uploadedBy);
            }
        });
    });
}

// ДОБАВИТЬ этот новый метод в app.js:
readBook(book) {
    if (!book) return;
    
    // Для TXT файлов показываем в просмотрщике
    if (book.format === 'txt' && book.fileContent) {
        if (window.bookViewer) {
            window.bookViewer.showBook(book);
        } else {
            // Fallback: открываем в новом окне
            this.openTextInNewWindow(book);
        }
    } 
    // Для PDF показываем уведомление
    else if (book.format === 'pdf') {
        this.showNotification('Для просмотра PDF используйте скачивание или загрузите TXT версию', 'info');
    }
    
    // Увеличиваем счетчик просмотров
    bookStorage.incrementViews(book.id);
}

// ДОБАВИТЬ этот метод в app.js:
openTextInNewWindow(book) {
    const newWindow = window.open();
    newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${book.title} - Digital Library</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 2rem;
                    background: #f5f5f5;
                }
                .book-content {
                    background: white;
                    padding: 2rem;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    white-space: pre-wrap;
                    word-wrap: break-word;
                }
                .book-header {
                    margin-bottom: 2rem;
                    border-bottom: 2px solid #4f46e5;
                    padding-bottom: 1rem;
                }
            </style>
        </head>
        <body>
            <div class="book-content">
                <div class="book-header">
                    <h1>${this.escapeHtml(book.title)}</h1>
                    <h3>${this.escapeHtml(book.author)}</h3>
                </div>
                ${this.escapeHtml(book.fileContent)}
            </div>
        </body>
        </html>
    `);
    newWindow.document.close();
}
    
    // Скачивание книги
    downloadBook(bookId) {
        const book = bookStorage.getBookById(bookId);
        if (book) {
            bookStorage.incrementDownloads(bookId);
            
            // Создаем временную ссылку для скачивания
            if (book.fileContent) {
                let blob, fileName;
                
                if (book.format === 'txt') {
                    blob = new Blob([book.fileContent], { type: 'text/plain;charset=utf-8' });
                    fileName = `${book.title}.txt`;
                } else if (book.format === 'pdf') {
                    // Для base64 PDF
                    if (book.fileContent.startsWith('data:application/pdf;base64,')) {
                        const base64Data = book.fileContent.split(',')[1];
                        const binaryData = atob(base64Data);
                        const bytes = new Uint8Array(binaryData.length);
                        
                        for (let i = 0; i < binaryData.length; i++) {
                            bytes[i] = binaryData.charCodeAt(i);
                        }
                        
                        blob = new Blob([bytes], { type: 'application/pdf' });
                        fileName = `${book.title}.pdf`;
                    } else {
                        blob = new Blob([book.fileContent], { type: 'application/pdf' });
                        fileName = `${book.title}.pdf`;
                    }
                }
                
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = fileName;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }
            }
            
            this.showNotification(`Книга "${book.title}" скачивается`, 'success');
        }
    }
    
    // Форматирование даты
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }
    
    // Форматирование размера файла
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // Уведомления
    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationContainer');
        if (!container) return;
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(notification);
        
        // Анимация появления
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // Закрытие по кнопке
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            this.removeNotification(notification);
        });
        
        // Автоматическое закрытие
        setTimeout(() => {
            if (document.body.contains(notification)) {
                this.removeNotification(notification);
            }
        }, 5000);
    }
    
    removeNotification(notification) {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.remove();
            }
        }, 300);
    }
    
    // Скрытие лоадера
    hideLoader() {
        const loader = document.querySelector('.loader');
        if (loader) {
            setTimeout(() => {
                loader.classList.add('hidden');
            }, 1000);
        }
    }
}

// Инициализация приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.app = new DigitalLibraryApp();
});
