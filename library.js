// library.js - Логика библиотеки

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
        this.init();
    }
    
    init() {
        this.initFilters();
        this.initSearch();
        this.displayLibrary();
        this.updateStats();
        
        // Событие при обновлении книг
        window.addEventListener('booksUpdated', () => {
            this.displayLibrary();
            this.updateStats();
        });
    }
    
    initFilters() {
        const genreFilter = document.getElementById('genreFilter');
        const formatFilter = document.getElementById('formatFilter');
        const sortFilter = document.getElementById('sortFilter');
        const resetBtn = document.getElementById('resetFilters');
        
        genreFilter.addEventListener('change', () => {
            this.currentFilters.genre = genreFilter.value;
            this.currentPage = 1;
            this.displayLibrary();
        });
        
        formatFilter.addEventListener('change', () => {
            this.currentFilters.format = formatFilter.value;
            this.currentPage = 1;
            this.displayLibrary();
        });
        
        sortFilter.addEventListener('change', () => {
            this.currentFilters.sort = sortFilter.value;
            this.currentPage = 1;
            this.displayLibrary();
        });
        
        resetBtn.addEventListener('click', () => {
            this.resetFilters();
        });
    }
    
    initSearch() {
        const searchInput = document.getElementById('searchInput');
        const clearSearch = document.getElementById('clearSearch');
        
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.currentFilters.search = e.target.value.trim();
                this.currentPage = 1;
                this.displayLibrary();
            }, 300);
        });
        
        clearSearch.addEventListener('click', () => {
            searchInput.value = '';
            this.currentFilters.search = '';
            this.currentPage = 1;
            this.displayLibrary();
        });
    }
    
    resetFilters() {
        document.getElementById('genreFilter').value = '';
        document.getElementById('formatFilter').value = '';
        document.getElementById('sortFilter').value = 'newest';
        document.getElementById('searchInput').value = '';
        
        this.currentFilters = {
            search: '',
            genre: '',
            format: '',
            sort: 'newest'
        };
        
        this.currentPage = 1;
        this.displayLibrary();
    }
    
    getFilteredBooks() {
        let books = bookStorage.getAllBooks();
        
        // Применяем фильтры
        if (this.currentFilters.search) {
            books = bookStorage.searchBooks(this.currentFilters.search);
        }
        
        if (this.currentFilters.genre) {
            books = books.filter(book => book.genre === this.currentFilters.genre);
        }
        
        if (this.currentFilters.format) {
            books = books.filter(book => book.format === this.currentFilters.format);
        }
        
        // Применяем сортировку
        books = this.sortBooks(books);
        
        return books;
    }
    
    sortBooks(books) {
        switch (this.currentFilters.sort) {
            case 'newest':
                return books.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
            case 'oldest':
                return books.sort((a, b) => new Date(a.dateAdded) - new Date(b.dateAdded));
            case 'title':
                return books.sort((a, b) => a.title.localeCompare(b.title));
            case 'title_desc':
                return books.sort((a, b) => b.title.localeCompare(a.title));
            case 'views':
                return books.sort((a, b) => (b.views || 0) - (a.views || 0));
            default:
                return books;
        }
    }
    
    async displayLibrary() {
        const booksGrid = document.getElementById('booksGrid');
        const emptyState = document.getElementById('emptyState');
        const loadingState = document.getElementById('loadingState');
        
        // Показываем состояние загрузки
        booksGrid.innerHTML = '';
        loadingState.style.display = 'block';
        emptyState.style.display = 'none';
        
        // Имитация задержки для лучшего UX
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Получаем отфильтрованные книги
        const allBooks = this.getFilteredBooks();
        const totalBooks = allBooks.length;
        const totalPages = Math.ceil(totalBooks / this.booksPerPage);
        
        // Рассчитываем книги для текущей страницы
        const startIndex = (this.currentPage - 1) * this.booksPerPage;
        const endIndex = startIndex + this.booksPerPage;
        const pageBooks = allBooks.slice(startIndex, endIndex);
        
        // Генерируем карточки книг
        booksGrid.innerHTML = this.generateBookCards(pageBooks);
        
        // Показываем/скрываем состояния
        loadingState.style.display = 'none';
        
        if (pageBooks.length === 0) {
            emptyState.style.display = 'block';
        } else {
            emptyState.style.display = 'none';
            this.addBookEventListeners();
        }
        
        // Обновляем пагинацию
        this.updatePagination(totalPages);
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
                        <span class="book-date">${this.formatDate(book.dateAdded)}</span>
                    </div>
                    <h3 class="book-title">${book.title}</h3>
                    <p class="book-author">${book.author}</p>
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
                        <button class="action-btn preview-btn">
                            <i class="fas fa-eye"></i>
                            Просмотр
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
    
    addBookEventListeners() {
        // Кнопки просмотра
        document.querySelectorAll('.preview-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const bookCard = e.target.closest('.book-card');
                const bookId = bookCard.dataset.id;
                this.showBookPreview(bookId);
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
    }
    
    showBookPreview(bookId) {
        const book = bookStorage.getBookById(bookId);
        if (!book) return;
        
        // Увеличиваем счетчик просмотров
        bookStorage.incrementViews(bookId);
        
        const modal = document.getElementById('bookModal');
        const modalContent = document.getElementById('bookModalContent');
        
        modalContent.innerHTML = `
            <div class="book-preview">
                <div class="preview-header">
                    <div class="preview-cover">
                        <i class="fas fa-${book.format === 'pdf' ? 'file-pdf' : 'file-alt'}"></i>
                        <span class="preview-format">${book.format.toUpperCase()}</span>
                    </div>
                    <div class="preview-info">
                        <h2>${book.title}</h2>
                        <p class="preview-author">${book.author}</p>
                        <div class="preview-meta">
                            <span><i class="fas fa-tag"></i> ${book.genre}</span>
                            <span><i class="fas fa-calendar"></i> ${this.formatDate(book.dateAdded)}</span>
                            <span><i class="fas fa-file"></i> ${this.formatFileSize(book.size || 0)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="preview-content">
                    <h3><i class="fas fa-align-left"></i> Описание</h3>
                    <p>${book.description || 'Описание отсутствует'}</p>
                    
                    <h3><i class="fas fa-chart-bar"></i> Статистика</h3>
                    <div class="preview-stats">
                        <div class="stat-item">
                            <div class="stat-value">${book.views || 0}</div>
                            <div class="stat-label">Просмотров</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${book.downloads || 0}</div>
                            <div class="stat-label">Скачиваний</div>
                        </div>
                    </div>
                    
                    <div class="preview-actions">
                        <button class="btn-preview read-btn" data-id="${book.id}">
                            <i class="fas fa-book-reader"></i>
                            Читать книгу
                        </button>
                        <button class="btn-preview download-btn" data-id="${book.id}">
                            <i class="fas fa-download"></i>
                            Скачать (${book.format.toUpperCase()})
                        </button>
                    </div>
                    
                    ${book.format === 'txt' && book.fileContent ? `
                        <div class="text-preview">
                            <h3><i class="fas fa-file-alt"></i> Предпросмотр</h3>
                            <div class="text-content">
                                ${this.escapeHtml(book.fileContent.substring(0, 1000))}
                                ${book.fileContent.length > 1000 ? '...' : ''}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        modal.classList.add('active');
        
        // Обработчики для кнопок в модальном окне
        modalContent.querySelector('.read-btn').addEventListener('click', (e) => {
            this.readBook(book.id);
        });
        
        modalContent.querySelector('.download-btn').addEventListener('click', (e) => {
            this.downloadBook(book.id);
        });
        
        // Закрытие модального окна
        document.getElementById('closeBookModal').addEventListener('click', () => {
            modal.classList.remove('active');
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    }
    
    readBook(bookId) {
        const book = bookStorage.getBookById(bookId);
        if (!book) return;
        
        // Для TXT файлов открываем в новом окне
        if (book.format === 'txt' && book.fileContent) {
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
        } else {
            // Для PDF файлов показываем сообщение
            this.showNotification('Для просмотра PDF файлов используйте скачивание', 'info');
        }
        
        this.showNotification(`Открываем "${book.title}"`, 'success');
    }
    
    downloadBook(bookId) {
        const book = bookStorage.getBookById(bookId);
        if (!book) return;
        
        bookStorage.incrementDownloads(bookId);
        
        if (book.fileContent) {
            let blob, fileName;
            
            if (book.format === 'txt') {
                blob = new Blob([book.fileContent], { type: 'text/plain;charset=utf-8' });
                fileName = `${book.title}.txt`;
            } else {
                // Для base64 PDF
                const byteCharacters = atob(book.fileContent.split(',')[1]);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                blob = new Blob([byteArray], { type: 'application/pdf' });
                fileName = `${book.title}.pdf`;
            }
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        
        this.showNotification(`Книга "${book.title}" скачивается`, 'success');
    }
    
    updatePagination(totalPages) {
        const pagination = document.getElementById('pagination');
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }
        
        let paginationHTML = '';
        
        // Кнопка "Назад"
        if (this.currentPage > 1) {
            paginationHTML += `
                <button class="page-btn prev-btn" onclick="libraryManager.goToPage(${this.currentPage - 1})">
                    <i class="fas fa-chevron-left"></i>
                </button>
            `;
        }
        
        // Номера страниц
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
        
        // Кнопка "Вперед"
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
        this.displayLibrary();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    updateStats() {
        const statsContainer = document.getElementById('libraryStats');
        const stats = bookStorage.getStats();
        
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
                    <i class="fas fa-chart-pie"></i>
                </div>
                <div class="stat-info">
                    <div class="stat-number">${stats.formats.pdf || 0}</div>
                    <div class="stat-label">PDF файлов</div>
                </div>
            </div>
        `;
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }
    
    formatFileSize(bytes) {
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
        
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            this.removeNotification(notification);
        });
        
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
}

// Добавляем стили для библиотеки
const libraryStyles = `
    .library-page {
        min-height: 100vh;
        padding: 8rem 1rem 4rem;
        background: var(--surface);
    }
    
    .library-container {
        max-width: 1400px;
        margin: 0 auto;
    }
    
    .library-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 3rem;
        flex-wrap: wrap;
        gap: 2rem;
    }
    
    .library-header h1 {
        font-family: 'Playfair Display', serif;
        font-size: 3rem;
        margin-bottom: 0.5rem;
        background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
    }
    
    .library-header p {
        color: var(--text-secondary);
    }
    
    .search-container {
        flex: 1;
        max-width: 500px;
    }
    
    .search-box {
        position: relative;
        display: flex;
        align-items: center;
    }
    
    .search-box i {
        position: absolute;
        left: 1rem;
        color: var(--text-secondary);
    }
    
    .search-box input {
        width: 100%;
        padding: 1rem 1rem 1rem 3rem;
        background: var(--background);
        border: 2px solid var(--border-color);
        border-radius: var(--radius);
        color: var(--text-primary);
        font-size: 1rem;
        transition: var(--transition);
    }
    
    .search-box input:focus {
        outline: none;
        border-color: var(--primary-color);
    }
    
    .clear-search {
        position: absolute;
        right: 1rem;
        background: none;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        transition: var(--transition);
    }
    
    .clear-search:hover {
        color: var(--primary-color);
    }
    
    .filters-section {
        display: flex;
        gap: 1.5rem;
        align-items: center;
        margin-bottom: 2rem;
        flex-wrap: wrap;
        padding: 1.5rem;
        background: var(--background);
        border-radius: var(--radius);
        box-shadow: var(--shadow);
    }
    
    .filter-group {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }
    
    .filter-group label {
        font-weight: 500;
        color: var(--text-primary);
        white-space: nowrap;
    }
    
    .filter-group select {
        padding: 0.75rem;
        background: var(--surface);
        border: 2px solid var(--border-color);
        border-radius: var(--radius);
        color: var(--text-primary);
        font-size: 0.875rem;
        min-width: 150px;
        transition: var(--transition);
    }
    
    .filter-group select:focus {
        outline: none;
        border-color: var(--primary-color);
    }
    
    .btn-reset {
        padding: 0.75rem 1.5rem;
        background: var(--surface);
        border: 2px solid var(--border-color);
        border-radius: var(--radius);
        color: var(--text-primary);
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        transition: var(--transition);
    }
    
    .btn-reset:hover {
        border-color: var(--primary-color);
        color: var(--primary-color);
    }
    
    .stats-container {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 3rem;
    }
    
    .stat-card {
        background: var(--background);
        padding: 1.5rem;
        border-radius: var(--radius);
        display: flex;
        align-items: center;
        gap: 1rem;
        box-shadow: var(--shadow);
        transition: var(--transition);
    }
    
    .stat-card:hover {
        transform: translateY(-4px);
    }
    
    .stat-icon {
        width: 60px;
        height: 60px;
        background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .stat-icon i {
        font-size: 1.5rem;
        color: white;
    }
    
    .stat-info {
        flex: 1;
    }
    
    .stat-number {
        font-size: 2rem;
        font-weight: 700;
        color: var(--primary-color);
    }
    
    .stat-label {
        color: var(--text-secondary);
        font-size: 0.875rem;
    }
    
    .books-container {
        position: relative;
        min-height: 400px;
    }
    
    .book-card {
        background: var(--background);
        border-radius: var(--radius);
        overflow: hidden;
        transition: var(--transition);
        border: 1px solid var(--border-color);
        height: 100%;
        display: flex;
        flex-direction: column;
    }
    
    .book-card:hover {
        transform: translateY(-8px);
        box-shadow: var(--shadow-lg);
    }
    
    .book-cover {
        height: 150px;
        background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
    }
    
    .book-cover i {
        font-size: 3rem;
        color: white;
        opacity: 0.9;
    }
    
    .book-format {
        position: absolute;
        top: 1rem;
        right: 1rem;
        background: rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        color: white;
        font-size: 0.75rem;
        font-weight: 500;
    }
    
    .book-info {
        padding: 1.5rem;
        flex: 1;
        display: flex;
        flex-direction: column;
    }
    
    .book-meta {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.5rem;
        font-size: 0.75rem;
        color: var(--text-secondary);
    }
    
    .book-title {
        font-size: 1.25rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
    
    .book-author {
        color: var(--text-secondary);
        margin-bottom: 1rem;
        font-size: 0.875rem;
    }
    
    .book-description {
        color: var(--text-secondary);
        font-size: 0.875rem;
        margin-bottom: 1rem;
        flex: 1;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
    
    .book-stats {
        display: flex;
        gap: 1rem;
        margin-bottom: 1rem;
        font-size: 0.75rem;
        color: var(--text-secondary);
    }
    
    .book-stat {
        display: flex;
        align-items: center;
        gap: 0.25rem;
    }
    
    .book-stat i {
        color: var(--primary-color);
    }
    
    .book-actions {
        display: flex;
        gap: 0.5rem;
        margin-top: auto;
    }
    
    .empty-state {
        display: none;
        text-align: center;
        padding: 4rem 2rem;
    }
    
    .empty-state i {
        font-size: 4rem;
        color: var(--primary-color);
        margin-bottom: 1rem;
        opacity: 0.5;
    }
    
    .empty-state h3 {
        font-size: 1.5rem;
        margin-bottom: 0.5rem;
        color: var(--text-primary);
    }
    
    .empty-state p {
        color: var(--text-secondary);
    }
    
    .empty-state a {
        color: var(--primary-color);
        text-decoration: none;
        font-weight: 500;
    }
    
    .loading-state {
        display: none;
        text-align: center;
        padding: 4rem 2rem;
    }
    
    .spinner {
        width: 50px;
        height: 50px;
        border: 3px solid var(--border-color);
        border-top-color: var(--primary-color);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 1rem;
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    
    .loading-state p {
        color: var(--text-secondary);
    }
    
    .pagination {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 0.5rem;
        margin-top: 3rem;
        flex-wrap: wrap;
    }
    
    .page-btn {
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--background);
        border: 2px solid var(--border-color);
        border-radius: var(--radius);
        color: var(--text-primary);
        font-weight: 500;
        cursor: pointer;
        transition: var(--transition);
    }
    
    .page-btn:hover {
        border-color: var(--primary-color);
        color: var(--primary-color);
    }
    
    .page-btn.active {
        background: var(--primary-color);
        border-color: var(--primary-color);
        color: white;
    }
    
    .page-dots {
        color: var(--text-secondary);
        padding: 0 0.5rem;
    }
    
    .book-modal {
        max-width: 800px;
        width: 95%;
        max-height: 90vh;
        overflow-y: auto;
    }
    
    .book-preview {
        padding: 1rem;
    }
    
    .preview-header {
        display: flex;
        gap: 2rem;
        margin-bottom: 2rem;
        flex-wrap: wrap;
    }
    
    .preview-cover {
        width: 150px;
        height: 200px;
        background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
        border-radius: var(--radius);
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        flex-shrink: 0;
    }
    
    .preview-cover i {
        font-size: 4rem;
        color: white;
    }
    
    .preview-format {
        position: absolute;
        top: 1rem;
        right: 1rem;
        background: rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        color: white;
        font-size: 0.75rem;
        font-weight: 500;
    }
    
    .preview-info {
        flex: 1;
        min-width: 300px;
    }
    
    .preview-info h2 {
        font-size: 2rem;
        margin-bottom: 0.5rem;
    }
    
    .preview-author {
        color: var(--text-secondary);
        font-size: 1.125rem;
        margin-bottom: 1rem;
    }
    
    .preview-meta {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
        margin-bottom: 1rem;
    }
    
    .preview-meta span {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: var(--surface);
        padding: 0.5rem 1rem;
        border-radius: 20px;
        font-size: 0.875rem;
        color: var(--text-secondary);
    }
    
    .preview-meta i {
        color: var(--primary-color);
    }
    
    .preview-content {
        border-top: 1px solid var(--border-color);
        padding-top: 2rem;
    }
    
    .preview-content h3 {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1rem;
        color: var(--primary-color);
    }
    
    .preview-content p {
        color: var(--text-secondary);
        margin-bottom: 2rem;
        line-height: 1.6;
    }
    
    .preview-stats {
        display: flex;
        gap: 2rem;
        margin-bottom: 2rem;
    }
    
    .stat-item {
        text-align: center;
    }
    
    .stat-value {
        font-size: 2rem;
        font-weight: 700;
        color: var(--primary-color);
    }
    
    .stat-label {
        color: var(--text-secondary);
        font-size: 0.875rem;
    }
    
    .preview-actions {
        display: flex;
        gap: 1rem;
        margin-bottom: 2rem;
        flex-wrap: wrap;
    }
    
    .btn-preview {
        flex: 1;
        min-width: 200px;
        padding: 1rem;
        border: none;
        border-radius: var(--radius);
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        transition: var(--transition);
    }
    
    .btn-preview.read-btn {
        background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
        color: white;
    }
    
    .btn-preview.download-btn {
        background: var(--surface);
        color: var(--text-primary);
        border: 2px solid var(--border-color);
    }
    
    .btn-preview:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow);
    }
    
    .text-preview {
        background: var(--surface);
        border-radius: var(--radius);
        padding: 1.5rem;
        margin-top: 2rem;
    }
    
    .text-content {
        background: var(--background);
        padding: 1.5rem;
        border-radius: var(--radius);
        max-height: 300px;
        overflow-y: auto;
        font-family: monospace;
        white-space: pre-wrap;
        word-break: break-word;
        font-size: 0.875rem;
        color: var(--text-primary);
        border: 1px solid var(--border-color);
    }
`;

// Добавляем стили для библиотеки
const libraryStyleSheet = document.createElement('style');
libraryStyleSheet.textContent = libraryStyles;
document.head.appendChild(libraryStyleSheet);

// Инициализация библиотеки при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.libraryManager = new LibraryManager();
});