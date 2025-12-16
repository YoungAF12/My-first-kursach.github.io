// library.js - Библиотека с Firebase

class LibraryManager {
    constructor() {
        this.booksPerPage = 12;
        this.currentPage = 1;
        this.currentFilters = {
            search: '',
            genre: '',
            format: '',
            sort: 'newest'
        };
        this.initTheme();
        this.init();
    }
    
    initTheme() {
        const savedTheme = localStorage.getItem('digital-library-theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
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
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('digital-library-theme', newTheme);
        this.updateThemeIcon();
    }
    
    updateThemeIcon() {
        const icon = document.querySelector('#themeToggle i');
        if (icon) {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            icon.className = currentTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
            const text = icon.nextElementSibling;
            if (text) {
                text.textContent = currentTheme === 'light' ? 'Тёмная' : 'Светлая';
            }
        }
    }
    
    init() {
        this.initFilters();
        this.initSearch();
        this.loadLibrary();
        this.loadStats();
    }
    
    initFilters() {
        const genreFilter = document.getElementById('genreFilter');
        const formatFilter = document.getElementById('formatFilter');
        const sortFilter = document.getElementById('sortFilter');
        const resetBtn = document.getElementById('resetFilters');
        
        if (genreFilter) {
            genreFilter.addEventListener('change', () => {
                this.currentFilters.genre = genreFilter.value;
                this.currentPage = 1;
                this.loadLibrary();
            });
        }
        
        if (formatFilter) {
            formatFilter.addEventListener('change', () => {
                this.currentFilters.format = formatFilter.value;
                this.currentPage = 1;
                this.loadLibrary();
            });
        }
        
        if (sortFilter) {
            sortFilter.addEventListener('change', () => {
                this.currentFilters.sort = sortFilter.value;
                this.currentPage = 1;
                this.loadLibrary();
            });
        }
        
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetFilters();
            });
        }
    }
    
    initSearch() {
        const searchInput = document.getElementById('searchInput');
        const clearSearch = document.getElementById('clearSearch');
        
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.currentFilters.search = e.target.value.trim();
                    this.currentPage = 1;
                    this.loadLibrary();
                }, 300);
            });
        }
        
        if (clearSearch) {
            clearSearch.addEventListener('click', () => {
                if (searchInput) searchInput.value = '';
                this.currentFilters.search = '';
                this.currentPage = 1;
                this.loadLibrary();
            });
        }
    }
    
    resetFilters() {
        const genreFilter = document.getElementById('genreFilter');
        const formatFilter = document.getElementById('formatFilter');
        const sortFilter = document.getElementById('sortFilter');
        const searchInput = document.getElementById('searchInput');
        
        if (genreFilter) genreFilter.value = '';
        if (formatFilter) formatFilter.value = '';
        if (sortFilter) sortFilter.value = 'newest';
        if (searchInput) searchInput.value = '';
        
        this.currentFilters = {
            search: '',
            genre: '',
            format: '',
            sort: 'newest'
        };
        
        this.currentPage = 1;
        this.loadLibrary();
    }
    
    async loadLibrary() {
        const booksGrid = document.getElementById('booksGrid');
        const emptyState = document.getElementById('emptyState');
        const loadingState = document.getElementById('loadingState');
        
        if (!booksGrid || !emptyState || !loadingState) return;
        
        // Показываем состояние загрузки
        booksGrid.innerHTML = '';
        loadingState.style.display = 'block';
        emptyState.style.display = 'none';
        
        try {
            // Получаем все книги
            let allBooks = await firestoreManager.getAllBooks();
            
            // Применяем фильтры на клиенте (в простой версии)
            // В продакшене фильтрация должна быть на сервере
            let filteredBooks = this.applyFilters(allBooks);
            
            // Сортируем
            filteredBooks = this.sortBooks(filteredBooks);
            
            const totalBooks = filteredBooks.length;
            const totalPages = Math.ceil(totalBooks / this.booksPerPage);
            
            // Пагинация
            const startIndex = (this.currentPage - 1) * this.booksPerPage;
            const endIndex = startIndex + this.booksPerPage;
            const pageBooks = filteredBooks.slice(startIndex, endIndex);
            
            // Отображаем книги
            booksGrid.innerHTML = this.generateBookCards(pageBooks);
            
            // Показываем/скрываем состояния
            loadingState.style.display = 'none';
            
            if (pageBooks.length === 0) {
                emptyState.style.display = 'block';
            } else {
                emptyState.style.display = 'none';
            }
            
            // Обновляем пагинацию
            this.updatePagination(totalPages);
            
        } catch (error) {
            console.error('Ошибка загрузки библиотеки:', error);
            loadingState.style.display = 'none';
            booksGrid.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Ошибка загрузки</h3>
                    <p>Не удалось загрузить книги. Попробуйте обновить страницу.</p>
                </div>
            `;
        }
    }
    
    applyFilters(books) {
        let filtered = [...books];
        
        // Фильтр по жанру
        if (this.currentFilters.genre) {
            filtered = filtered.filter(book => book.genre === this.currentFilters.genre);
        }
        
        // Фильтр по формату
        if (this.currentFilters.format) {
            filtered = filtered.filter(book => book.format === this.currentFilters.format);
        }
        
        // Поиск (простой поиск на клиенте)
        if (this.currentFilters.search) {
            const searchTerm = this.currentFilters.search.toLowerCase();
            filtered = filtered.filter(book => 
                book.title.toLowerCase().includes(searchTerm) ||
                book.author.toLowerCase().includes(searchTerm) ||
                book.description?.toLowerCase().includes(searchTerm) ||
                book.genre.toLowerCase().includes(searchTerm) ||
                book.uploadedByName?.toLowerCase().includes(searchTerm)
            );
        }
        
        return filtered;
    }
    
    sortBooks(books) {
        switch (this.currentFilters.sort) {
            case 'newest':
                return books.sort((a, b) => {
                    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
                    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
                    return dateB - dateA;
                });
            case 'oldest':
                return books.sort((a, b) => {
                    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
                    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
                    return dateA - dateB;
                });
            case 'title':
                return books.sort((a, b) => a.title.localeCompare(b.title));
            case 'title_desc':
                return books.sort((a, b) => b.title.localeCompare(a.title));
            case 'views':
                return books.sort((a, b) => (b.views || 0) - (a.views || 0));
            case 'downloads':
                return books.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
            default:
                return books;
        }
    }
    
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
                        ${book.fileSize ? `
                            <span class="book-stat">
                                <i class="fas fa-file"></i>
                                ${this.formatFileSize(book.fileSize)}
                            </span>
                        ` : ''}
                    </div>
                    
                    <div class="book-actions">
                        <button class="action-btn preview-btn" onclick="libraryManager.readBook('${book.id}')">
                            <i class="fas fa-eye"></i>
                            Читать
                        </button>
                        <button class="action-btn download-btn" onclick="libraryManager.downloadBook('${book.id}')">
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
                        <button class="btn-primary" onclick="libraryManager.downloadBook('${book.id}')">
                            <i class="fas fa-download"></i>
                            Скачать книгу
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        const oldModal = document.getElementById('textModal');
        if (oldModal) oldModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        document.getElementById('textModal').classList.add('active');
        
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
    
    async loadStats() {
        try {
            const books = await firestoreManager.getAllBooks();
            const stats = this.calculateStats(books);
            this.displayStats(stats);
        } catch (error) {
            console.error('Ошибка загрузки статистики:', error);
        }
    }
    
    calculateStats(books) {
        return {
            totalBooks: books.length,
            totalViews: books.reduce((sum, book) => sum + (book.views || 0), 0),
            totalDownloads: books.reduce((sum, book) => sum + (book.downloads || 0), 0),
            pdfCount: books.filter(book => book.format === 'pdf').length,
            txtCount: books.filter(book => book.format === 'txt').length
        };
    }
    
    displayStats(stats) {
        const statsContainer = document.getElementById('libraryStats');
        if (!statsContainer) return;
        
        statsContainer.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-book"></i>
                </div>
                <div class="stat-info">
                    <div class="stat-number">${stats.totalBooks}</div>
                    <div class="stat-label">Всего книг</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-eye"></i>
                </div>
                <div class="stat-info">
                    <div class="stat-number">${stats.totalViews}</div>
                    <div class="stat-label">Просмотров</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-download"></i>
                </div>
                <div class="stat-info">
                    <div class="stat-number">${stats.totalDownloads}</div>
                    <div class="stat-label">Скачиваний</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-file-pdf"></i>
                </div>
                <div class="stat-info">
                    <div class="stat-number">${stats.pdfCount}</div>
                    <div class="stat-label">PDF файлов</div>
                </div>
            </div>
        `;
    }
    
    updatePagination(totalPages) {
        const pagination = document.getElementById('pagination');
        if (!pagination) return;
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }
        
        let paginationHTML = '';
        
        if (this.currentPage > 1) {
            paginationHTML += `
                <button class="page-btn prev-btn" onclick="libraryManager.goToPage(${this.currentPage - 1})">
                    <i class="fas fa-chevron-left"></i>
                </button>
            `;
        }
        
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                paginationHTML += `
                    <button class="page-btn ${i === this.currentPage ? 'active' : ''}" 
                            onclick="libraryManager.goToPage(${i})">
                        ${i}
                    </button>
                `;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                paginationHTML += `<span class="page-dots">...</span>`;
            }
        }
        
        if (this.currentPage < totalPages) {
            paginationHTML += `
                <button class="page-btn next-btn" onclick="libraryManager.goToPage(${this.currentPage + 1})">
                    <i class="fas fa-chevron-right"></i>
                </button>
            `;
        }
        
        pagination.innerHTML = paginationHTML;
    }
    
    goToPage(page) {
        this.currentPage = page;
        this.loadLibrary();
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
    
    formatFileSize(bytes) {
        if (!bytes) return 'Неизвестно';
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    showNotification(message, type = 'info') {
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
        
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        });
        
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
}

// Инициализация библиотеки
document.addEventListener('DOMContentLoaded', () => {
    window.libraryManager = new LibraryManager();
});
