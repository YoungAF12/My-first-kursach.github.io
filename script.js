// ==================== КОНФИГУРАЦИЯ FIREBASE ====================
// Импортируем из отдельного файла
const firebaseConfig = window.firebaseConfig || {
    apiKey: "AIzaSyDqnau8N2mHjhOTMpxXqYe8EDGfxqGqQn0",
    authDomain: "my-first-kyrsachic.firebaseapp.com",
    projectId: "my-first-kyrsachic",
    storageBucket: "my-first-kyrsachic.firebasestorage.app",
    messagingSenderId: "741117010262",
    appId: "1:741117010262:web:2972f2e62517ccc2b9f6f7"
};

// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ И КЭШ ====================
const DOM = {
    elements: null,
    
    init() {
        this.elements = {
            // Основные элементы
            fileInput: document.getElementById('file-input'),
            loadBtn: document.getElementById('load-btn'),
            startBtn: document.getElementById('start-btn'),
            themeBtn: document.getElementById('theme-btn'),
            fullscreenBtn: document.getElementById('fullscreen-btn'),
            saveBtn: document.getElementById('save-btn'),
            exportBtn: document.getElementById('export-btn'),
            bookmarkBtn: document.getElementById('bookmark-btn'),
            searchBtn: document.getElementById('search-btn'),
            
            // Управление шрифтом
            decreaseFontBtn: document.getElementById('decrease-font-btn'),
            increaseFontBtn: document.getElementById('increase-font-btn'),
            fontSize: document.getElementById('font-size'),
            
            // Навигация PDF
            pdfNav: document.getElementById('pdf-nav'),
            prevPageBtn: document.getElementById('prev-page-btn'),
            nextPageBtn: document.getElementById('next-page-btn'),
            pageInfo: document.getElementById('page-info'),
            
            // Поиск
            searchContainer: document.getElementById('search-container'),
            searchInput: document.getElementById('search-input'),
            searchPrevBtn: document.getElementById('search-prev-btn'),
            searchNextBtn: document.getElementById('search-next-btn'),
            searchResults: document.getElementById('search-results'),
            searchCloseBtn: document.getElementById('search-close-btn'),
            
            // Контейнеры контента
            welcomeScreen: document.getElementById('welcome-screen'),
            bookContent: document.getElementById('book-content'),
            pdfViewer: document.getElementById('pdf-viewer'),
            bookInfo: document.getElementById('book-info'),
            bookTitle: document.getElementById('book-title'),
            bookStats: document.getElementById('book-stats'),
            
            // Уведомления и индикаторы
            notification: document.getElementById('notification'),
            fullscreenHint: document.getElementById('fullscreen-hint'),
            progressContainer: document.getElementById('progress-container'),
            progressFill: document.querySelector('.progress-fill'),
            progressText: document.querySelector('.progress-text'),
            
            // Мобильная навигация
            mobileNav: document.getElementById('mobile-nav'),
            mobilePrevBtn: document.getElementById('mobile-prev-btn'),
            mobileNextBtn: document.getElementById('mobile-next-btn'),
            
            // Облачные книги
            cloudBooks: document.getElementById('cloud-books'),
            cloudList: document.getElementById('cloud-list'),
            
            // Восстановление сессии
            restoreSession: document.getElementById('restore-session'),
            lastBookInfo: document.getElementById('last-book-info'),
            restoreBtn: document.getElementById('restore-btn'),
            
            // Закладки
            bookmarkDialog: document.getElementById('bookmark-dialog'),
            bookmarkName: document.getElementById('bookmark-name'),
            bookmarkSaveBtn: document.getElementById('bookmark-save-btn'),
            bookmarkCancelBtn: document.getElementById('bookmark-cancel-btn'),
            bookmarksSection: document.getElementById('bookmarks-section'),
            bookmarksList: document.getElementById('bookmarks-list')
        };
        return this.elements;
    }
};

// Состояние приложения
const AppState = {
    firebaseApp: null,
    firestore: null,
    pdfDoc: null,
    currentPage: 1,
    totalPages: 1,
    fontSize: 16,
    currentBook: null,
    currentBookId: null,
    currentBookType: '',
    isFullscreen: false,
    isBookFullscreen: false,
    touchStartX: 0,
    touchStartY: 0,
    isSearchActive: false,
    searchResults: [],
    currentSearchIndex: -1,
    bookmarks: new Map(),
    pageCache: new Map(),
    renderQueue: [],
    isRendering: false
};

// ==================== ОСНОВНЫЕ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showNotification(message, type = 'info') {
    const { notification } = DOM.elements;
    if (!notification) return;
    
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.style.display = 'none';
        }, 300);
    }, 3000);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showProgress(text = 'Загрузка...') {
    const { progressContainer, progressText } = DOM.elements;
    if (progressContainer && progressText) {
        progressText.textContent = text;
        progressContainer.style.display = 'block';
    }
}

function updateProgress(percent) {
    const { progressFill, progressText } = DOM.elements;
    if (progressFill) {
        progressFill.style.width = `${percent}%`;
    }
    if (progressText) {
        progressText.textContent = `Загрузка: ${Math.round(percent)}%`;
    }
}

function hideProgress() {
    const { progressContainer } = DOM.elements;
    if (progressContainer) {
        setTimeout(() => {
            progressContainer.style.display = 'none';
            const progressFill = document.querySelector('.progress-fill');
            if (progressFill) progressFill.style.width = '0%';
        }, 500);
    }
}

// ==================== ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('📚 IT Books Reader запущен');
    
    // Инициализация DOM кэша
    DOM.init();
    
    // Настройка PDF.js worker
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
    
    try {
        // Инициализация Firebase
        if (firebase.apps.length === 0) {
            AppState.firebaseApp = firebase.initializeApp(firebaseConfig);
        } else {
            AppState.firebaseApp = firebase.apps[0];
        }
        AppState.firestore = firebase.firestore();
        console.log('✅ Firebase инициализирован');
        loadCloudBooks();
    } catch (error) {
        console.log('⚠️ Firebase не инициализирован, работаем локально:', error);
    }
    
    // Инициализация обработчиков событий
    initEventListeners();
    
    // Загрузка настроек
    loadSettings();
    
    // Загрузка последней сессии
    loadLastSession();
    
    // Загрузка закладок
    loadBookmarks();
    
    // Проверка онлайн статуса
    checkOnlineStatus();
    
    console.log('✅ Приложение готово');
});

// ==================== ИНИЦИАЛИЗАЦИЯ ОБРАБОТЧИКОВ СОБЫТИЙ ====================
function initEventListeners() {
    console.log('🔄 Настройка обработчиков событий...');
    const el = DOM.elements;
    
    try {
        // Основные кнопки
        if (el.loadBtn) el.loadBtn.addEventListener('click', () => el.fileInput.click());
        if (el.startBtn) el.startBtn.addEventListener('click', () => el.fileInput.click());
        if (el.fileInput) el.fileInput.addEventListener('change', handleFileSelect);
        if (el.themeBtn) el.themeBtn.addEventListener('click', toggleTheme);
        if (el.fullscreenBtn) el.fullscreenBtn.addEventListener('click', toggleFullscreen);
        if (el.saveBtn) el.saveBtn.addEventListener('click', saveToCloud);
        if (el.exportBtn) el.exportBtn.addEventListener('click', exportSettings);
        if (el.bookmarkBtn) el.bookmarkBtn.addEventListener('click', showBookmarkDialog);
        
        // Управление шрифтом
        if (el.increaseFontBtn) el.increaseFontBtn.addEventListener('click', increaseFont);
        if (el.decreaseFontBtn) el.decreaseFontBtn.addEventListener('click', decreaseFont);
        
        // Навигация PDF
        if (el.prevPageBtn) el.prevPageBtn.addEventListener('click', prevPage);
        if (el.nextPageBtn) el.nextPageBtn.addEventListener('click', nextPage);
        
        // Поиск
        if (el.searchBtn) el.searchBtn.addEventListener('click', toggleSearch);
        if (el.searchInput) el.searchInput.addEventListener('input', debounce(performSearch, 300));
        if (el.searchPrevBtn) el.searchPrevBtn.addEventListener('click', () => navigateSearch(-1));
        if (el.searchNextBtn) el.searchNextBtn.addEventListener('click', () => navigateSearch(1));
        if (el.searchCloseBtn) el.searchCloseBtn.addEventListener('click', closeSearch);
        
        // Восстановление сессии
        if (el.restoreBtn) el.restoreBtn.addEventListener('click', restoreLastSession);
        
        // Закладки
        if (el.bookmarkSaveBtn) el.bookmarkSaveBtn.addEventListener('click', saveBookmark);
        if (el.bookmarkCancelBtn) el.bookmarkCancelBtn.addEventListener('click', () => {
            el.bookmarkDialog.style.display = 'none';
        });
        
        // Мобильная навигация
        if (el.mobilePrevBtn) el.mobilePrevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            prevPage();
        });
        if (el.mobileNextBtn) el.mobileNextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            nextPage();
        });
        
        // Горячие клавиши
        document.addEventListener('keydown', handleKeyPress);
        
        // Обработчики полного экрана
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);
        
        // Обработчики касаний для мобильных устройств
        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchend', handleTouchEnd, { passive: true });
        
        // Обработчик изменения размера окна
        window.addEventListener('resize', debounce(handleResize, 250));
        
        // Обработчик выхода из приложения
        window.addEventListener('beforeunload', saveSession);
        
        // Глобальный обработчик ошибок
        window.addEventListener('error', function(e) {
            console.error('Глобальная ошибка:', e.error);
            showNotification(`Ошибка: ${e.message}`, 'error');
        });
        
        console.log('✅ Обработчики событий настроены');
    } catch (error) {
        console.error('Ошибка инициализации обработчиков:', error);
        showNotification('Ошибка инициализации', 'error');
    }
}

// ==================== ОБРАБОТКА КАСАНИЙ ДЛЯ МОБИЛЬНЫХ УСТРОЙСТВ ====================
function handleTouchStart(e) {
    AppState.touchStartX = e.touches[0].clientX;
    AppState.touchStartY = e.touches[0].clientY;
}

function handleTouchEnd(e) {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const deltaX = touchEndX - AppState.touchStartX;
    const deltaY = touchEndY - AppState.touchStartY;
    const minSwipeDistance = 50;
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (Math.abs(deltaX) > minSwipeDistance) {
            if (deltaX > 0) {
                prevPage();
            } else {
                nextPage();
            }
        }
    } else {
        if (Math.abs(deltaY) > minSwipeDistance) {
            if (deltaY > 0) {
                decreaseFont();
            } else {
                increaseFont();
            }
        }
    }
}

// ==================== ОБРАБОТКА ЗАГРУЗКИ ФАЙЛОВ ====================
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) {
        showNotification('❌ Файл не выбран', 'error');
        return;
    }
    
    try {
        validateFile(file);
        openBook(file);
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function validateFile(file) {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedExtensions = ['txt', 'pdf'];
    
    if (file.size > maxSize) {
        throw new Error(`Файл слишком большой (макс. ${formatFileSize(maxSize)})`);
    }
    
    const ext = file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(ext)) {
        throw new Error('Поддерживаются только файлы .txt и .pdf');
    }
    
    return true;
}

function openBook(file) {
    AppState.currentBook = file;
    AppState.currentBookType = file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'txt';
    
    const el = DOM.elements;
    
    // Обновляем информацию о книге
    if (el.bookTitle) {
        el.bookTitle.textContent = file.name;
    }
    
    if (el.bookStats) {
        el.bookStats.textContent = `${formatFileSize(file.size)} • ${AppState.currentBookType.toUpperCase()}`;
    }
    
    if (el.bookInfo) {
        el.bookInfo.style.display = 'flex';
    }
    
    // Скрываем приветственный экран
    if (el.welcomeScreen) {
        el.welcomeScreen.style.display = 'none';
    }
    
    // Показываем кнопки
    if (el.bookmarkBtn) {
        el.bookmarkBtn.style.display = 'inline-flex';
    }
    
    if (el.searchBtn) {
        el.searchBtn.style.display = 'inline-flex';
    }
    
    if (el.exportBtn) {
        el.exportBtn.style.display = 'inline-flex';
    }
    
    // Загружаем книгу
    if (AppState.currentBookType === 'txt') {
        loadTxtFile(file);
    } else {
        loadPdfFile(file);
    }
    
    showNotification(`📖 Открыта книга: ${file.name}`, 'success');
    
    // Показываем кнопки навигации для мобильных устройств
    if (window.innerWidth <= 768 && AppState.currentBookType === 'pdf') {
        showMobileNavigation();
    }
}

function loadTxtFile(file) {
    const el = DOM.elements;
    const reader = new FileReader();
    
    reader.onloadstart = () => {
        showProgress('Чтение текстового файла...');
    };
    
    reader.onload = function(e) {
        const content = e.target.result;
        
        if (el.bookContent) {
            el.bookContent.style.display = 'block';
            el.bookContent.innerHTML = `<pre>${escapeHtml(content)}</pre>`;
            el.bookContent.style.fontSize = AppState.fontSize + 'px';
        }
        
        if (el.pdfViewer) el.pdfViewer.style.display = 'none';
        if (el.pdfNav) el.pdfNav.style.display = 'none';
        
        updateFontSizeDisplay();
        hideProgress();
        
        // Сохраняем сессию
        saveSession();
    };
    
    reader.onerror = function() {
        hideProgress();
        showNotification('❌ Ошибка чтения файла', 'error');
    };
    
    reader.onprogress = (e) => {
        if (e.lengthComputable) {
            const percent = (e.loaded / e.total) * 100;
            updateProgress(percent);
        }
    };
    
    reader.readAsText(file);
}

function loadPdfFile(file) {
    const el = DOM.elements;
    const reader = new FileReader();
    
    reader.onloadstart = () => {
        showProgress('Загрузка PDF...');
    };
    
    reader.onload = function(e) {
        const typedarray = new Uint8Array(e.target.result);
        
        if (el.pdfViewer) {
            el.pdfViewer.innerHTML = '<div class="pdf-loading">Загрузка PDF...</div>';
            el.pdfViewer.style.display = 'block';
        }
        if (el.bookContent) el.bookContent.style.display = 'none';
        if (el.pdfNav) el.pdfNav.style.display = 'flex';
        
        // Очищаем кэш при загрузке нового PDF
        AppState.pageCache.clear();
        
        pdfjsLib.getDocument({
            data: typedarray,
            onProgress: (progress) => {
                const percent = (progress.loaded / progress.total) * 100;
                updateProgress(percent);
            }
        }).promise.then(function(pdf) {
            AppState.pdfDoc = pdf;
            AppState.totalPages = pdf.numPages;
            AppState.currentPage = 1;
            
            renderPage(AppState.currentPage);
            updatePageInfo();
            hideProgress();
            
            // Сохраняем сессию
            saveSession();
            
        }).catch(function(error) {
            console.error('Ошибка загрузки PDF:', error);
            if (el.pdfViewer) {
                el.pdfViewer.innerHTML = '<div class="pdf-error">❌ Ошибка загрузки PDF</div>';
            }
            hideProgress();
            showNotification('❌ Ошибка загрузки PDF файла', 'error');
        });
    };
    
    reader.onerror = function() {
        hideProgress();
        showNotification('❌ Ошибка чтения файла', 'error');
    };
    
    reader.readAsArrayBuffer(file);
}

// ==================== PDF НАВИГАЦИЯ И РЕНДЕРИНГ ====================
async function renderPage(pageNum) {
    if (!AppState.pdfDoc) return;
    
    // Проверяем кэш
    if (AppState.pageCache.has(pageNum)) {
        const cachedCanvas = AppState.pageCache.get(pageNum);
        displayPage(cachedCanvas, pageNum);
        return;
    }
    
    // Добавляем в очередь рендеринга
    if (AppState.isRendering) {
        AppState.renderQueue.push(pageNum);
        return;
    }
    
    AppState.isRendering = true;
    
    try {
        const page = await AppState.pdfDoc.getPage(pageNum);
        const scale = window.innerWidth < 768 ? 1.2 : 1.8;
        const viewport = page.getViewport({ scale: scale });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        canvas.className = 'pdf-page';
        
        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };
        
        await page.render(renderContext).promise;
        
        // Кэшируем отрендеренную страницу
        AppState.pageCache.set(pageNum, canvas);
        
        // Ограничиваем размер кэша
        if (AppState.pageCache.size > 5) {
            const firstKey = AppState.pageCache.keys().next().value;
            AppState.pageCache.delete(firstKey);
        }
        
        displayPage(canvas, pageNum);
        
    } catch (error) {
        console.error('Ошибка рендеринга страницы:', error);
        showNotification('❌ Ошибка отображения страницы', 'error');
    } finally {
        AppState.isRendering = false;
        
        // Обрабатываем следующую страницу из очереди
        if (AppState.renderQueue.length > 0) {
            const nextPage = AppState.renderQueue.shift();
            setTimeout(() => renderPage(nextPage), 100);
        }
    }
}

function displayPage(canvas, pageNum) {
    const el = DOM.elements;
    if (el.pdfViewer) {
        el.pdfViewer.innerHTML = '';
        el.pdfViewer.appendChild(canvas);
        addPageNumberToCanvas(canvas, pageNum);
    }
}

function addPageNumberToCanvas(canvas, pageNum) {
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.font = '14px Georgia';
    ctx.fillStyle = 'rgba(139, 115, 85, 0.7)';
    ctx.fillText(`Страница ${pageNum} из ${AppState.totalPages}`, 20, canvas.height - 20);
    ctx.restore();
}

function prevPage() {
    if (AppState.currentBookType !== 'pdf') return;
    if (AppState.currentPage > 1) {
        AppState.currentPage--;
        renderPage(AppState.currentPage);
        updatePageInfo();
        saveSession();
    }
}

function nextPage() {
    if (AppState.currentBookType !== 'pdf') return;
    if (AppState.currentPage < AppState.totalPages) {
        AppState.currentPage++;
        renderPage(AppState.currentPage);
        updatePageInfo();
        saveSession();
    }
}

function updatePageInfo() {
    const el = DOM.elements;
    if (el.pageInfo) {
        el.pageInfo.textContent = `Стр. ${AppState.currentPage}/${AppState.totalPages}`;
    }
}

// ==================== ГОРЯЧИЕ КЛАВИШИ ====================
function handleKeyPress(e) {
    // Ctrl+F для поиска
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        toggleSearch();
        return;
    }
    
    // ESC для выхода из поиска/полного экрана
    if (e.key === 'Escape') {
        if (AppState.isSearchActive) {
            closeSearch();
            return;
        }
        if (AppState.isFullscreen) {
            exitFullscreen();
            return;
        }
        if (AppState.isBookFullscreen) {
            toggleBookFullscreen();
            return;
        }
    }
    
    // Стрелки влево/вправо для навигации по PDF
    if (AppState.currentBookType === 'pdf') {
        if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
            e.preventDefault();
            prevPage();
        } else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
            e.preventDefault();
            nextPage();
        }
    }
    
    // Стрелки вверх/вниз для изменения шрифта
    if (e.key === 'ArrowUp') {
        e.preventDefault();
        increaseFont();
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        decreaseFont();
    }
    
    // Клавиша F для полного экрана
    if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
    }
    
    // B для закладки
    if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        showBookmarkDialog();
    }
}

// ==================== УПРАВЛЕНИЕ ШРИФТОМ ====================
function increaseFont() {
    if (AppState.fontSize < 32) {
        AppState.fontSize += 2;
        updateFontSize();
        showNotification(`🔤 Шрифт: ${AppState.fontSize}px`, 'info');
    }
}

function decreaseFont() {
    if (AppState.fontSize > 12) {
        AppState.fontSize -= 2;
        updateFontSize();
        showNotification(`🔤 Шрифт: ${AppState.fontSize}px`, 'info');
    }
}

function updateFontSize() {
    const el = DOM.elements;
    if (el.bookContent) {
        el.bookContent.style.fontSize = AppState.fontSize + 'px';
    }
    updateFontSizeDisplay();
    saveSettings();
}

function updateFontSizeDisplay() {
    const el = DOM.elements;
    if (el.fontSize) {
        el.fontSize.textContent = AppState.fontSize + 'px';
    }
}

// ==================== УПРАВЛЕНИЕ ТЕМОЙ ====================
function toggleTheme() {
    const body = document.body;
    body.classList.toggle('dark');
    
    const isDark = body.classList.contains('dark');
    const el = DOM.elements;
    
    if (el.themeBtn) {
        el.themeBtn.textContent = isDark ? '☀️ Светлая' : '🌙 Тёмная';
    }
    
    saveSettings();
    showNotification(isDark ? '🌙 Тёмная тема' : '☀️ Светлая тема', 'info');
}

// ==================== ПОИСК ПО ТЕКСТУ ====================
function toggleSearch() {
    const el = DOM.elements;
    if (!el.searchContainer) return;
    
    AppState.isSearchActive = !AppState.isSearchActive;
    
    if (AppState.isSearchActive) {
        el.searchContainer.style.display = 'flex';
        el.searchInput.focus();
        showNotification('🔍 Режим поиска', 'info');
    } else {
        closeSearch();
    }
}

function closeSearch() {
    const el = DOM.elements;
    AppState.isSearchActive = false;
    AppState.searchResults = [];
    AppState.currentSearchIndex = -1;
    
    if (el.searchContainer) {
        el.searchContainer.style.display = 'none';
    }
    
    if (el.searchInput) {
        el.searchInput.value = '';
    }
    
    if (el.searchResults) {
        el.searchResults.textContent = '';
    }
    
    // Убираем подсветку
    removeSearchHighlights();
}

function performSearch() {
    const el = DOM.elements;
    const query = el.searchInput.value.trim();
    
    if (!query || !el.bookContent || AppState.currentBookType !== 'txt') {
        return;
    }
    
    const content = el.bookContent.textContent;
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    const matches = [...content.matchAll(regex)];
    
    AppState.searchResults = matches.map(match => match.index);
    AppState.currentSearchIndex = -1;
    
    if (matches.length > 0) {
        el.searchResults.textContent = `${matches.length} совпадений`;
        navigateSearch(1); // Перейти к первому результату
    } else {
        el.searchResults.textContent = 'Не найдено';
        removeSearchHighlights();
    }
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function navigateSearch(direction) {
    if (AppState.searchResults.length === 0) return;
    
    AppState.currentSearchIndex += direction;
    
    if (AppState.currentSearchIndex < 0) {
        AppState.currentSearchIndex = AppState.searchResults.length - 1;
    } else if (AppState.currentSearchIndex >= AppState.searchResults.length) {
        AppState.currentSearchIndex = 0;
    }
    
    highlightSearchResult();
    
    const el = DOM.elements;
    if (el.searchResults) {
        el.searchResults.textContent = `${AppState.currentSearchIndex + 1}/${AppState.searchResults.length}`;
    }
}

function highlightSearchResult() {
    const el = DOM.elements;
    if (!el.bookContent || AppState.currentSearchIndex === -1) return;
    
    const content = el.bookContent.textContent;
    const query = el.searchInput.value.trim();
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    
    let highlighted = content;
    let matchIndex = 0;
    
    highlighted = highlighted.replace(regex, (match, p1, offset) => {
        matchIndex++;
        if (matchIndex === AppState.currentSearchIndex + 1) {
            return `<mark class="search-highlight current">${p1}</mark>`;
        }
        return `<mark class="search-highlight">${p1}</mark>`;
    });
    
    el.bookContent.innerHTML = `<pre>${highlighted}</pre>`;
    el.bookContent.style.fontSize = AppState.fontSize + 'px';
    
    // Скроллим к текущему результату
    const currentHighlight = el.bookContent.querySelector('.search-highlight.current');
    if (currentHighlight) {
        currentHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function removeSearchHighlights() {
    const el = DOM.elements;
    if (!el.bookContent) return;
    
    const content = el.bookContent.textContent;
    el.bookContent.innerHTML = `<pre>${escapeHtml(content)}</pre>`;
    el.bookContent.style.fontSize = AppState.fontSize + 'px';
}

// ==================== ЗАКЛАДКИ ====================
function showBookmarkDialog() {
    const el = DOM.elements;
    if (!el.bookmarkDialog || !AppState.currentBook) return;
    
    const pageText = AppState.currentBookType === 'pdf' ? `Страница ${AppState.currentPage}` : 'Текстовый файл';
    el.bookmarkName.value = `Закладка: ${pageText}`;
    el.bookmarkDialog.style.display = 'flex';
}

function saveBookmark() {
    const el = DOM.elements;
    const name = el.bookmarkName.value.trim() || `Закладка от ${new Date().toLocaleDateString()}`;
    
    const bookmark = {
        id: Date.now().toString(),
        name: name,
        bookName: AppState.currentBook.name,
        bookType: AppState.currentBookType,
        page: AppState.currentPage,
        totalPages: AppState.totalPages,
        fontSize: AppState.fontSize,
        timestamp: Date.now(),
        date: new Date().toLocaleString()
    };
    
    // Сохраняем в локальное хранилище
    let bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '{}');
    if (!bookmarks[AppState.currentBook.name]) {
        bookmarks[AppState.currentBook.name] = [];
    }
    
    bookmarks[AppState.currentBook.name].push(bookmark);
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
    
    // Обновляем состояние
    AppState.bookmarks.set(bookmark.id, bookmark);
    
    el.bookmarkDialog.style.display = 'none';
    showNotification('📍 Закладка сохранена', 'success');
    
    // Обновляем список закладок
    loadBookmarks();
}

function loadBookmarks() {
    const el = DOM.elements;
    if (!el.bookmarksList || !el.bookmarksSection) return;
    
    const bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '{}');
    
    // Очищаем состояние
    AppState.bookmarks.clear();
    
    // Собираем все закладки
    let allBookmarks = [];
    Object.entries(bookmarks).forEach(([bookName, bookBookmarks]) => {
        bookBookmarks.forEach(bookmark => {
            AppState.bookmarks.set(bookmark.id, bookmark);
            allBookmarks.push({...bookmark, bookName});
        });
    });
    
    if (allBookmarks.length > 0) {
        el.bookmarksSection.style.display = 'block';
        el.bookmarksList.innerHTML = '';
        
        // Сортируем по дате (новые первые)
        allBookmarks.sort((a, b) => b.timestamp - a.timestamp);
        
        // Показываем последние 10 закладок
        allBookmarks.slice(0, 10).forEach(bookmark => {
            const bookmarkElement = document.createElement('div');
            bookmarkElement.className = 'bookmark-item';
            bookmarkElement.innerHTML = `
                <strong>${bookmark.name}</strong>
                <div style="font-size: 0.9em; color: #666; margin: 5px 0;">
                    Книга: ${bookmark.bookName}
                </div>
                <div class="bookmark-page">
                    ${bookmark.bookType === 'pdf' ? `Страница ${bookmark.page}/${bookmark.totalPages}` : 'Текстовый файл'}
                </div>
                <div style="font-size: 0.8em; color: #888; margin-top: 5px;">
                    ${bookmark.date}
                </div>
            `;
            
            bookmarkElement.onclick = function() {
                navigateToBookmark(bookmark);
            };
            
            el.bookmarksList.appendChild(bookmarkElement);
        });
    } else {
        el.bookmarksSection.style.display = 'none';
    }
}

function navigateToBookmark(bookmark) {
    // Здесь можно реализовать навигацию к закладке
    // Для этого нужна возможность открыть книгу по имени
    showNotification(`Переход к закладке: ${bookmark.name}`, 'info');
}

// ==================== ЭКСПОРТ НАСТРОЕК ====================
function exportSettings() {
    if (!AppState.currentBook) {
        showNotification('❌ Нет открытой книги для экспорта', 'error');
        return;
    }
    
    const settings = {
        book: {
            name: AppState.currentBook.name,
            type: AppState.currentBookType,
            size: AppState.currentBook.size
        },
        reading: {
            fontSize: AppState.fontSize,
            theme: document.body.classList.contains('dark') ? 'dark' : 'light',
            currentPage: AppState.currentPage,
            totalPages: AppState.totalPages
        },
        timestamp: new Date().toISOString(),
        app: 'IT Books Reader'
    };
    
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${AppState.currentBook.name.replace(/\.[^/.]+$/, '')}_settings.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
    showNotification('📤 Настройки экспортированы', 'success');
}

// ==================== ПОЛНЫЙ ЭКРАН ====================
function toggleFullscreen() {
    if (window.innerWidth <= 768) {
        toggleBookFullscreen();
    } else {
        if (!AppState.isFullscreen) {
            enterFullscreen();
        } else {
            exitFullscreen();
        }
    }
}

function toggleBookFullscreen() {
    const el = DOM.elements;
    
    AppState.isBookFullscreen = !AppState.isBookFullscreen;
    
    if (AppState.isBookFullscreen) {
        // Вход в полноэкранный режим книги
        if (el.bookContent && el.bookContent.style.display !== 'none') {
            el.bookContent.classList.add('book-fullscreen');
        }
        if (el.pdfViewer && el.pdfViewer.style.display !== 'none') {
            el.pdfViewer.classList.add('book-fullscreen');
        }
        
        document.body.classList.add('book-fullscreen-mode');
        showMobileNavigation();
        showNotification('📖 Книга на полном экране', 'info');
        
        // Добавляем обработчик для выхода по клику
        document.addEventListener('click', handleBookFullscreenClick);
    } else {
        // Выход из полноэкранного режима книги
        if (el.bookContent) el.bookContent.classList.remove('book-fullscreen');
        if (el.pdfViewer) el.pdfViewer.classList.remove('book-fullscreen');
        
        document.body.classList.remove('book-fullscreen-mode');
        hideMobileNavigation();
        showNotification('📖 Выход из полного экрана книги', 'info');
        
        document.removeEventListener('click', handleBookFullscreenClick);
    }
}

function handleBookFullscreenClick(e) {
    if (!e.target.closest('.mobile-nav-btn') && !e.target.closest('canvas')) {
        toggleBookFullscreen();
    }
}

function showMobileNavigation() {
    const el = DOM.elements;
    if ((AppState.currentBookType === 'pdf' || AppState.currentBookType === 'txt') && el.mobileNav) {
        el.mobileNav.style.display = 'flex';
    }
}

function hideMobileNavigation() {
    const el = DOM.elements;
    if (el.mobileNav) {
        el.mobileNav.style.display = 'none';
    }
}

function enterFullscreen() {
    const elem = document.documentElement;
    
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
    } else if (elem.mozRequestFullScreen) {
        elem.mozRequestFullScreen();
    } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
    }
}

function exitFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    }
}

function handleFullscreenChange() {
    AppState.isFullscreen = !!(document.fullscreenElement || 
                               document.webkitFullscreenElement || 
                               document.mozFullScreenElement ||
                               document.msFullscreenElement);
    
    const el = DOM.elements;
    
    if (AppState.isFullscreen) {
        if (el.fullscreenHint) el.fullscreenHint.style.display = 'block';
        if (el.fullscreenBtn) el.fullscreenBtn.textContent = '📺 Выйти';
        showNotification('📺 Полный экран включен', 'info');
    } else {
        if (el.fullscreenHint) el.fullscreenHint.style.display = 'none';
        if (el.fullscreenBtn) el.fullscreenBtn.textContent = '📺 Полный экран';
        showNotification('📺 Полный экран выключен', 'info');
    }
}

// ==================== FIREBASE (ОБЛАЧНОЕ ХРАНИЛИЩЕ) ====================
async function saveToCloud() {
    if (!AppState.currentBook) {
        showNotification('❌ Сначала загрузите книгу', 'error');
        return;
    }
    
    if (!AppState.firestore) {
        showNotification('❌ Облачное хранилище не доступно', 'error');
        return;
    }
    
    try {
        showNotification('💾 Сохранение в облако...', 'info');
        showProgress('Сохранение в облако...');
        
        const reader = new FileReader();
        
        if (AppState.currentBookType === 'txt') {
            reader.readAsText(AppState.currentBook);
        } else {
            reader.readAsDataURL(AppState.currentBook);
        }
        
        reader.onload = async function() {
            try {
                const bookData = {
                    name: AppState.currentBook.name,
                    type: AppState.currentBookType,
                    size: AppState.currentBook.size,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    fontSize: AppState.fontSize,
                    currentPage: AppState.currentPage
                };
                
                if (AppState.currentBookType === 'txt') {
                    bookData.content = reader.result;
                } else {
                    bookData.content = reader.result.split(',')[1];
                }
                
                const docRef = await AppState.firestore.collection('books').add(bookData);
                AppState.currentBookId = docRef.id;
                
                hideProgress();
                showNotification('✅ Книга сохранена в облако!', 'success');
                loadCloudBooks();
                
            } catch (error) {
                hideProgress();
                console.error('Ошибка сохранения:', error);
                showNotification('❌ Ошибка сохранения в облако', 'error');
            }
        };
        
        reader.onerror = function() {
            hideProgress();
            showNotification('❌ Ошибка чтения файла', 'error');
        };
        
    } catch (error) {
        hideProgress();
        console.error('Ошибка:', error);
        showNotification('❌ Ошибка сохранения', 'error');
    }
}

async function loadCloudBooks() {
    if (!AppState.firestore) return;
    
    try {
        const snapshot = await AppState.firestore.collection('books')
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();
        
        const el = DOM.elements;
        
        if (!snapshot.empty && el.cloudList && el.cloudBooks) {
            el.cloudBooks.style.display = 'block';
            el.cloudList.innerHTML = '';
            
            snapshot.forEach(doc => {
                const book = doc.data();
                const bookElement = document.createElement('div');
                bookElement.className = 'cloud-book';
                bookElement.innerHTML = `
                    <div><strong>${book.name}</strong></div>
                    <div style="font-size: 0.9em; color: #666; margin-top: 5px;">
                        ${formatFileSize(book.size)} • ${book.type.toUpperCase()}
                    </div>
                    <div style="font-size: 0.8em; color: #888; margin-top: 3px;">
                        ${book.timestamp ? new Date(book.timestamp.seconds * 1000).toLocaleDateString() : ''}
                    </div>
                `;
                
                bookElement.onclick = function() {
                    loadCloudBook(doc.id, book);
                };
                
                el.cloudList.appendChild(bookElement);
            });
        } else if (el.cloudBooks) {
            el.cloudBooks.style.display = 'none';
        }
        
    } catch (error) {
        console.error('Ошибка загрузки книг:', error);
    }
}

async function loadCloudBook(bookId, bookData) {
    try {
        showNotification('📥 Загрузка из облака...', 'info');
        showProgress('Загрузка книги...');
        
        let file;
        
        if (bookData.type === 'txt') {
            const blob = new Blob([bookData.content], { type: 'text/plain' });
            file = new File([blob], bookData.name, { type: 'text/plain' });
        } else {
            const byteString = atob(bookData.content);
            const arrayBuffer = new ArrayBuffer(byteString.length);
            const uintArray = new Uint8Array(arrayBuffer);
            
            for (let i = 0; i < byteString.length; i++) {
                uintArray[i] = byteString.charCodeAt(i);
            }
            
            const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
            file = new File([blob], bookData.name, { type: 'application/pdf' });
        }
        
        // Восстанавливаем настройки
        if (bookData.fontSize) {
            AppState.fontSize = bookData.fontSize;
            updateFontSize();
        }
        
        if (bookData.currentPage) {
            AppState.currentPage = bookData.currentPage;
        }
        
        openBook(file);
        AppState.currentBookId = bookId;
        hideProgress();
        
    } catch (error) {
        hideProgress();
        console.error('Ошибка загрузки книги:', error);
        showNotification('❌ Ошибка загрузки из облака', 'error');
    }
}

// ==================== НАСТРОЙКИ И СЕССИИ ====================
function loadSettings() {
    // Загрузка темы
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark');
        const el = DOM.elements;
        if (el.themeBtn) {
            el.themeBtn.textContent = '☀️ Светлая';
        }
    }
    
    // Загрузка размера шрифта
    const savedFontSize = localStorage.getItem('fontSize');
    if (savedFontSize) {
        AppState.fontSize = parseInt(savedFontSize);
        updateFontSize();
    }
}

function saveSettings() {
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    localStorage.setItem('fontSize', AppState.fontSize.toString());
}

function saveSession() {
    if (!AppState.currentBook) return;
    
    const session = {
        bookName: AppState.currentBook.name,
        bookType: AppState.currentBookType,
        currentPage: AppState.currentPage,
        totalPages: AppState.totalPages,
        fontSize: AppState.fontSize,
        timestamp: Date.now()
    };
    
    localStorage.setItem('lastSession', JSON.stringify(session));
}

function loadLastSession() {
    const session = JSON.parse(localStorage.getItem('lastSession') || 'null');
    const el = DOM.elements;
    
    if (session && el.restoreSession && el.lastBookInfo) {
        el.restoreSession.style.display = 'block';
        el.lastBookInfo.innerHTML = `
            <div><strong>${session.bookName}</strong></div>
            <div style="font-size: 0.9em; color: #666; margin-top: 5px;">
                ${session.bookType.toUpperCase()} • Страница ${session.currentPage}
                ${session.totalPages > 1 ? `из ${session.totalPages}` : ''}
            </div>
            <div style="font-size: 0.8em; color: #888; margin-top: 5px;">
                ${new Date(session.timestamp).toLocaleString()}
            </div>
        `;
    }
}

function restoreLastSession() {
    const session = JSON.parse(localStorage.getItem('lastSession') || 'null');
    if (!session) return;
    
    showNotification('↩️ Восстановление последней сессии...', 'info');
    
    // Здесь можно реализовать загрузку книги по имени
    // Пока просто показываем уведомление
    showNotification(`Последняя книга: ${session.bookName}`, 'info');
}

// ==================== УТИЛИТЫ ====================
function handleResize() {
    if (AppState.currentBookType === 'pdf' && AppState.pdfDoc) {
        // При изменении размера перерисовываем текущую страницу
        renderPage(AppState.currentPage);
    }
}

function checkOnlineStatus() {
    if (!navigator.onLine) {
        showNotification('📴 Работаем в офлайн-режиме', 'warning');
    }
    
    window.addEventListener('online', () => {
        showNotification('🌐 Онлайн-режим восстановлен', 'success');
    });
    
    window.addEventListener('offline', () => {
        showNotification('📴 Работаем в офлайн-режиме', 'warning');
    });
}

// ==================== SERVICE WORKER РЕГИСТРАЦИЯ ====================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('sw.js')
            .then(function(registration) {
                console.log('Service Worker зарегистрирован:', registration);
            })
            .catch(function(error) {
                console.log('Service Worker ошибка:', error);
            });
    });
}

// Экспорт для отладки
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AppState,
        DOM,
        showNotification,
        escapeHtml,
        formatFileSize
    };
}
