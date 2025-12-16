// viewer.js - Просмотр книг в браузере

class BookViewer {
    constructor() {
        this.currentBook = null;
        this.currentPage = 1;
        this.totalPages = 1;
        this.zoomLevel = 1.0;
        this.init();
    }
    
    init() {
        this.initViewer();
        this.initEventListeners();
    }
    
    initViewer() {
        // Создаем контейнер для просмотра, если его нет
        if (!document.getElementById('bookViewerModal')) {
            const modalHTML = `
                <div class="modal-overlay" id="bookViewerModal">
                    <div class="modal-content book-viewer-modal">
                        <div class="viewer-header">
                            <div class="viewer-title" id="viewerTitle"></div>
                            <div class="viewer-controls">
                                <button class="viewer-btn" id="zoomOut" title="Уменьшить">
                                    <i class="fas fa-search-minus"></i>
                                </button>
                                <span class="viewer-zoom" id="zoomLevel">100%</span>
                                <button class="viewer-btn" id="zoomIn" title="Увеличить">
                                    <i class="fas fa-search-plus"></i>
                                </button>
                                <button class="viewer-btn" id="prevPage" title="Предыдущая страница">
                                    <i class="fas fa-chevron-left"></i>
                                </button>
                                <span class="viewer-page-info">
                                    Страница <span id="currentPage">1</span> из <span id="totalPages">1</span>
                                </span>
                                <button class="viewer-btn" id="nextPage" title="Следующая страница">
                                    <i class="fas fa-chevron-right"></i>
                                </button>
                                <button class="viewer-btn" id="fullscreen" title="Полный экран">
                                    <i class="fas fa-expand"></i>
                                </button>
                                <button class="viewer-btn" id="downloadFromViewer" title="Скачать">
                                    <i class="fas fa-download"></i>
                                </button>
                                <button class="viewer-close" id="closeViewer">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                        <div class="viewer-content" id="viewerContent">
                            <div class="viewer-loading">
                                <div class="spinner"></div>
                                <p>Загрузка книги...</p>
                            </div>
                        </div>
                        <div class="viewer-footer">
                            <div class="viewer-progress">
                                <input type="range" id="pageSlider" min="1" value="1" step="1">
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }
    }
    
    initEventListeners() {
        // Кнопки управления
        document.getElementById('zoomIn').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoomOut').addEventListener('click', () => this.zoomOut());
        document.getElementById('prevPage').addEventListener('click', () => this.prevPage());
        document.getElementById('nextPage').addEventListener('click', () => this.nextPage());
        document.getElementById('fullscreen').addEventListener('click', () => this.toggleFullscreen());
        document.getElementById('closeViewer').addEventListener('click', () => this.close());
        document.getElementById('downloadFromViewer').addEventListener('click', () => this.downloadBook());
        document.getElementById('pageSlider').addEventListener('input', (e) => this.goToPage(parseInt(e.target.value)));
        
        // Закрытие по клику вне окна
        document.getElementById('bookViewerModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.close();
            }
        });
        
        // Горячие клавиши
        document.addEventListener('keydown', (e) => {
            if (!this.isOpen()) return;
            
            switch(e.key) {
                case 'Escape':
                    this.close();
                    break;
                case 'ArrowLeft':
                    this.prevPage();
                    break;
                case 'ArrowRight':
                    this.nextPage();
                    break;
                case '+':
                case '=':
                    if (e.ctrlKey) this.zoomIn();
                    break;
                case '-':
                    if (e.ctrlKey) this.zoomOut();
                    break;
                case '0':
                    if (e.ctrlKey) this.resetZoom();
                    break;
                case 'f':
                case 'F':
                    if (e.ctrlKey) this.toggleFullscreen();
                    break;
            }
        });
    }
    
    // Показать книгу
    showBook(book) {
        this.currentBook = book;
        this.currentPage = 1;
        this.zoomLevel = 1.0;
        
        // Обновляем заголовок
        document.getElementById('viewerTitle').textContent = `${book.title} - ${book.author}`;
        
        // Показываем модальное окно
        document.getElementById('bookViewerModal').classList.add('active');
        
        // Загружаем содержимое книги
        this.loadBookContent(book);
        
        // Увеличиваем счетчик просмотров
        bookStorage.incrementViews(book.id);
    }
    
    // Загрузить содержимое книги
    async loadBookContent(book) {
        const viewerContent = document.getElementById('viewerContent');
        
        try {
            if (book.format === 'txt') {
                await this.loadTextBook(book, viewerContent);
            } else if (book.format === 'pdf') {
                await this.loadPDFBook(book, viewerContent);
            }
        } catch (error) {
            viewerContent.innerHTML = `
                <div class="viewer-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Ошибка загрузки книги</h3>
                    <p>${error.message}</p>
                    <button class="btn-primary" onclick="bookViewer.downloadBook()">
                        <i class="fas fa-download"></i> Скачать книгу
                    </button>
                </div>
            `;
        }
    }
    
    // Загрузка текстовой книги
    async loadTextBook(book, container) {
        if (!book.fileContent) {
            throw new Error('Содержимое книги не найдено');
        }
        
        // Разбиваем текст на страницы
        const wordsPerPage = 500;
        const words = book.fileContent.split(/\s+/);
        this.totalPages = Math.ceil(words.length / wordsPerPage);
        
        // Обновляем информацию о страницах
        this.updatePageInfo();
        
        // Показываем первую страницу
        this.renderTextPage(words, 1, wordsPerPage, container);
    }
    
    // Рендер текстовой страницы
    renderTextPage(words, page, wordsPerPage, container) {
        const start = (page - 1) * wordsPerPage;
        const end = start + wordsPerPage;
        const pageWords = words.slice(start, end);
        
        container.innerHTML = `
            <div class="text-viewer" style="transform: scale(${this.zoomLevel})">
                <div class="text-content">
                    ${this.escapeHtml(pageWords.join(' '))}
                </div>
                <div class="page-number">Страница ${page}</div>
            </div>
        `;
    }
    
    // Загрузка PDF книги
    async loadPDFBook(book, container) {
        if (!book.fileContent) {
            throw new Error('Содержимое PDF не найдено');
        }
        
        try {
            // Создаем Blob URL для PDF
            const pdfUrl = await this.createPDFBlobUrl(book);
            
            container.innerHTML = `
                <div class="pdf-viewer">
                    <iframe 
                        src="${pdfUrl}" 
                        width="100%" 
                        height="100%" 
                        frameborder="0"
                        title="Просмотр PDF: ${book.title}"
                    ></iframe>
                </div>
            `;
            
            // Для PDF показываем только одну "страницу"
            this.totalPages = 1;
            this.updatePageInfo();
            
        } catch (error) {
            // Если не удалось загрузить PDF напрямую, используем Google Docs Viewer
            await this.loadPDFWithGoogleDocs(book, container);
        }
    }
    
    // Создание URL для PDF
    async createPDFBlobUrl(book) {
        if (!book.fileContent) {
            throw new Error('Содержимое PDF не найдено');
        }
        
        // Если это base64, декодируем
        if (book.fileContent.startsWith('data:application/pdf;base64,')) {
            const base64Data = book.fileContent.split(',')[1];
            const binaryData = atob(base64Data);
            const bytes = new Uint8Array(binaryData.length);
            
            for (let i = 0; i < binaryData.length; i++) {
                bytes[i] = binaryData.charCodeAt(i);
            }
            
            const blob = new Blob([bytes], { type: 'application/pdf' });
            return URL.createObjectURL(blob);
        } else {
            // Если это просто бинарные данные
            const blob = new Blob([book.fileContent], { type: 'application/pdf' });
            return URL.createObjectURL(blob);
        }
    }
    
    // Загрузка PDF через Google Docs Viewer
    async loadPDFWithGoogleDocs(book, container) {
        try {
            const pdfUrl = await this.createPDFBlobUrl(book);
            const googleDocsUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl)}&embedded=true`;
            
            container.innerHTML = `
                <div class="pdf-viewer">
                    <iframe 
                        src="${googleDocsUrl}" 
                        width="100%" 
                        height="100%" 
                        frameborder="0"
                        title="Просмотр PDF: ${book.title}"
                    ></iframe>
                </div>
            `;
            
            this.totalPages = 1;
            this.updatePageInfo();
            
        } catch (error) {
            throw new Error('Не удалось загрузить PDF файл');
        }
    }
    
    // Управление страницами
    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.updatePage();
        }
    }
    
    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.updatePage();
        }
    }
    
    goToPage(page) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            this.updatePage();
        }
    }
    
    updatePage() {
        if (this.currentBook && this.currentBook.format === 'txt') {
            const words = this.currentBook.fileContent.split(/\s+/);
            const wordsPerPage = 500;
            this.renderTextPage(words, this.currentPage, wordsPerPage, document.getElementById('viewerContent'));
        }
        
        this.updatePageInfo();
    }
    
    updatePageInfo() {
        document.getElementById('currentPage').textContent = this.currentPage;
        document.getElementById('totalPages').textContent = this.totalPages;
        document.getElementById('pageSlider').max = this.totalPages;
        document.getElementById('pageSlider').value = this.currentPage;
    }
    
    // Управление масштабом
    zoomIn() {
        if (this.zoomLevel < 3.0) {
            this.zoomLevel += 0.25;
            this.applyZoom();
        }
    }
    
    zoomOut() {
        if (this.zoomLevel > 0.5) {
            this.zoomLevel -= 0.25;
            this.applyZoom();
        }
    }
    
    resetZoom() {
        this.zoomLevel = 1.0;
        this.applyZoom();
    }
    
    applyZoom() {
        const textViewer = document.querySelector('.text-viewer');
        if (textViewer) {
            textViewer.style.transform = `scale(${this.zoomLevel})`;
        }
        document.getElementById('zoomLevel').textContent = `${Math.round(this.zoomLevel * 100)}%`;
    }
    
    // Полноэкранный режим
    toggleFullscreen() {
        const modal = document.querySelector('.book-viewer-modal');
        if (!document.fullscreenElement) {
            if (modal.requestFullscreen) {
                modal.requestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }
    
    // Скачать книгу из просмотрщика
    downloadBook() {
        if (this.currentBook) {
            // Используем существующий функционал скачивания
            if (window.libraryManager) {
                window.libraryManager.downloadBook(this.currentBook.id);
            } else if (window.app) {
                window.app.downloadBook(this.currentBook.id);
            }
        }
    }
    
    // Проверка открыт ли просмотрщик
    isOpen() {
        const modal = document.getElementById('bookViewerModal');
        return modal ? modal.classList.contains('active') : false;
    }
    
    // Закрыть просмотрщик
    close() {
        const modal = document.getElementById('bookViewerModal');
        if (modal) {
            modal.classList.remove('active');
        }
        
        // Очищаем содержимое
        const viewerContent = document.getElementById('viewerContent');
        if (viewerContent) {
            viewerContent.innerHTML = `
                <div class="viewer-loading">
                    <div class="spinner"></div>
                    <p>Загрузка книги...</p>
                </div>
            `;
        }
        
        this.currentBook = null;
    }
    
    // Экранирование HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Глобальный экземпляр просмотрщика
window.bookViewer = new BookViewer();
