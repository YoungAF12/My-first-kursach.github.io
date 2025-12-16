// app.js - Основная логика приложения

class DigitalLibraryApp {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.init();
    }
    
    init() {
        // Инициализация темы
        this.initTheme();
        
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
        
        // Скрываем лоадер
        this.hideLoader();
        
        // Отображение последних книг на главной
        if (document.getElementById('recentBooks')) {
            this.displayRecentBooks();
        }
    }
    
    // Инициализация темы
    initTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
            this.updateThemeIcon();
        }
    }
    
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        localStorage.setItem('theme', this.currentTheme);
        this.updateThemeIcon();
    }
    
    updateThemeIcon() {
        const icon = document.querySelector('#themeToggle i');
        if (icon) {
            icon.className = this.currentTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
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
        const loginBtn = document.getElementById('loginBtn');
        const loginModal = document.getElementById('loginModal');
        const closeModal = document.getElementById('closeModal');
        
        if (loginBtn && loginModal) {
            loginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                loginModal.classList.add('active');
            });
            
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
                    <h3 class="book-title">${book.title}</h3>
                    <p class="book-author">${book.author}</p>
                    <p class="book-description">${book.description || 'Без описания'}</p>
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
        document.querySelectorAll('.read-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const bookCard = e.target.closest('.book-card');
                const bookId = bookCard.dataset.id;
                this.readBook(bookId);
            });
        });
        
        document.querySelectorAll('.download-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const bookCard = e.target.closest('.book-card');
                const bookId = bookCard.dataset.id;
                this.downloadBook(bookId);
            });
        });
    }
    
    // Чтение книги
    readBook(bookId) {
        const book = bookStorage.getBookById(bookId);
        if (book) {
            bookStorage.incrementViews(bookId);
            this.showNotification(`Открываем "${book.title}" для чтения`, 'info');
            // В реальном приложении здесь будет открытие читалки
        }
    }
    
    // Скачивание книги
    downloadBook(bookId) {
        const book = bookStorage.getBookById(bookId);
        if (book) {
            bookStorage.incrementDownloads(bookId);
            
            // Создаем временную ссылку для скачивания
            if (book.fileContent) {
                const blob = new Blob([book.fileContent], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${book.title}.${book.format}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
            
            this.showNotification(`Книга "${book.title}" скачивается`, 'success');
        }
    }
    
    // Уведомления
    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationContainer');
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
