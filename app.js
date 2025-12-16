// app.js - Основная логика приложения с Firebase

class DigitalLibraryApp {
    constructor() {
        this.currentTheme = localStorage.getItem('digital-library-theme') || 'light';
        this.init();
    }
    
    init() {
        // Применяем тему
        this.applyTheme();
        
        // Инициализация компонентов
        this.initThemeToggle();
        this.initAnimations();
        this.initCounters();
        this.initMobileMenu();
        this.hideLoader();
        
        // Загрузка последних книг
        if (document.getElementById('recentBooks')) {
            this.loadRecentBooks();
        }
    }
    
    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        localStorage.setItem('digital-library-theme', this.currentTheme);
        this.updateThemeIcon();
    }
    
    initThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleTheme();
            });
            this.updateThemeIcon();
        }
    }
    
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme();
    }
    
    updateThemeIcon() {
        const icon = document.querySelector('#themeToggle i');
        if (icon) {
            icon.className = this.currentTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
            const text = icon.nextElementSibling;
            if (text) {
                text.textContent = this.currentTheme === 'light' ? 'Тёмная' : 'Светлая';
            }
        }
    }
    
    initAnimations() {
        // Анимация появления элементов
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, { threshold: 0.1 });
        
        document.querySelectorAll('.feature-card, .book-card, .step').forEach(el => {
            observer.observe(el);
        });
    }
    
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
    
    initMobileMenu() {
        const toggleBtn = document.getElementById('mobileMenuToggle');
        const navMenu = document.querySelector('.nav-menu');
        
        if (toggleBtn && navMenu) {
            toggleBtn.addEventListener('click', () => {
                navMenu.style.display = navMenu.style.display === 'flex' ? 'none' : 'flex';
            });
            
            document.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', () => {
                    navMenu.style.display = 'none';
                });
            });
        }
    }
    
    async loadRecentBooks() {
        try {
            const books = await firestoreManager.getRecentBooks(4);
            this.displayBooks(books, 'recentBooks');
        } catch (error) {
            console.error('Ошибка загрузки книг:', error);
            this.showNotification('Ошибка загрузки книг', 'error');
        }
    }
    
    displayBooks(books, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = books.map(book => `
            <div class="book-card" data-id="${book.id}">
                <div class="book-cover">
                    <i class="fas fa-${book.format === 'pdf' ? 'file-pdf' : 'file-alt'}"></i>
                    <span class="book-format">${book.format.toUpperCase()}</span>
                </div>
                <div class="book-info">
                    <div class="book-meta">
                        <span class="book-genre">${book.genre}</span>
                        <span class="book-date">${this.formatDate(book.createdAt)}</span>
                    </div>
                    <h3 class="book-title">${book.title}</h3>
                    <p class="book-author">${book.author}</p>
                    
                    ${book.uploadedByName ? `
                        <div class="book-uploader">
                            <i class="fas fa-user"></i>
                            <span class="uploader-name" 
                                  onclick="authManager.showUserProfile('${book.uploadedBy}')"
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
                    </div>
                    
                    <div class="book-actions">
                        <button class="action-btn read-btn" onclick="app.readBook('${book.id}')">
                            <i class="fas fa-eye"></i>
                            Читать
                        </button>
                        <button class="action-btn download-btn" onclick="app.downloadBook('${book.id}')">
                            <i class="fas fa-download"></i>
                            Скачать
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    async readBook(bookId) {
        try {
            const book = await firestoreManager.getBookById(bookId);
            if (!book) {
                this.showNotification('Книга не найдена', 'error');
                return;
            }
            
            // Увеличиваем счетчик просмотров
            await firestoreManager.incrementViews(bookId);
            
            // Для TXT файлов показываем содержимое
            if (book.format === 'txt' && book.fileName) {
                const result = await storageManager.viewTextFile(book.fileName);
                if (result.success) {
                    this.showTextInModal(book, result.content);
                } else {
                    this.showNotification('Не удалось загрузить книгу', 'error');
                }
            } 
            // Для PDF открываем в новом окне
            else if (book.format === 'pdf' && book.downloadURL) {
                window.open(book.downloadURL, '_blank');
            } else {
                this.showNotification('Формат книги не поддерживает просмотр', 'info');
            }
            
        } catch (error) {
            console.error('Ошибка чтения книги:', error);
            this.showNotification('Ошибка открытия книги', 'error');
        }
    }
    
    showTextInModal(book, content) {
        // Создаем модальное окно для текста
        const modalHTML = `
            <div class="modal-overlay" id="textModal">
                <div class="modal-content text-modal">
                    <button class="modal-close" id="closeTextModal">
                        <i class="fas fa-times"></i>
                    </button>
                    
                    <div class="text-modal-header">
                        <h2>${book.title}</h2>
                        <p class="text-modal-author">${book.author}</p>
                    </div>
                    
                    <div class="text-modal-content">
                        <pre>${this.escapeHtml(content)}</pre>
                    </div>
                    
                    <div class="text-modal-footer">
                        <button class="btn-primary" onclick="app.downloadBook('${book.id}')">
                            <i class="fas fa-download"></i>
                            Скачать книгу
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Удаляем старый модальный, если есть
        const oldModal = document.getElementById('textModal');
        if (oldModal) oldModal.remove();
        
        // Добавляем новый
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Показываем модальное окно
        document.getElementById('textModal').classList.add('active');
        
        // Обработчики событий
        document.getElementById('closeTextModal').addEventListener('click', () => {
            document.getElementById('textModal').classList.remove('active');
        });
        
        document.getElementById('textModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                document.getElementById('textModal').classList.remove('active');
            }
        });
    }
    
    async downloadBook(bookId) {
        try {
            const book = await firestoreManager.getBookById(bookId);
            if (!book) {
                this.showNotification('Книга не найдена', 'error');
                return;
            }
            
            // Увеличиваем счетчик скачиваний
            await firestoreManager.incrementDownloads(bookId);
            
            // Скачиваем файл
            if (book.fileName) {
                await storageManager.downloadFile(book.fileName, book.title, book.format);
                this.showNotification(`Книга "${book.title}" скачивается`, 'success');
            } else if (book.downloadURL) {
                // Альтернативный способ скачивания
                const a = document.createElement('a');
                a.href = book.downloadURL;
                a.download = `${book.title}.${book.format}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                this.showNotification(`Книга "${book.title}" скачивается`, 'success');
            } else {
                this.showNotification('Файл книги не найден', 'error');
            }
            
        } catch (error) {
            console.error('Ошибка скачивания:', error);
            this.showNotification('Ошибка скачивания книги', 'error');
        }
    }
    
    formatDate(timestamp) {
        if (!timestamp) return 'Дата неизвестна';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    showNotification(message, type = 'info') {
        // Создаем контейнер для уведомлений, если его нет
        let container = document.getElementById('notificationContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notificationContainer';
            container.className = 'notification-container';
            document.body.appendChild(container);
        }
        
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
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        });
        
        // Автоматическое закрытие
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 5000);
    }
    
    hideLoader() {
        const loader = document.querySelector('.loader');
        if (loader) {
            setTimeout(() => {
                loader.classList.add('hidden');
            }, 1000);
        }
    }
}

// Глобальный экземпляр
window.app = new DigitalLibraryApp();
