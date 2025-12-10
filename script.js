// ==================== КОНФИГУРАЦИЯ FIREBASE ====================
const firebaseConfig = {
    apiKey: "AIzaSyDqnau8N2mHjhOTMpxXqYe8EDGfxqGqQn0",
    authDomain: "my-first-kyrsachic.firebaseapp.com",
    projectId: "my-first-kyrsachic",
    storageBucket: "my-first-kyrsachic.firebasestorage.app",
    messagingSenderId: "741117010262",
    appId: "1:741117010262:web:2972f2e62517ccc2b9f6f7"
};

// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
let firebaseApp = null;
let firestore = null;
let pdfDoc = null;
let currentPage = 1;
let totalPages = 1;
let fontSize = 16;
let currentBook = null;
let currentBookId = null;
let currentBookType = '';
let isFullscreen = false;
let isBookFullscreen = false;
let touchStartX = 0;
let touchStartY = 0;

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
    const notification = document.getElementById('notification');
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

// ==================== ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('📚 IT Books Reader запущен');
    
    // Инициализация Firebase
    try {
        if (firebase.apps.length === 0) {
            firebaseApp = firebase.initializeApp(firebaseConfig);
        } else {
            firebaseApp = firebase.apps[0];
        }
        firestore = firebase.firestore();
        console.log('✅ Firebase инициализирован');
        loadCloudBooks();
    } catch (error) {
        console.log('⚠️ Firebase не инициализирован, работаем локально:', error);
    }
    
    // Установка PDF.js worker
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
    
    // Инициализация обработчиков событий
    initEventListeners();
    
    // Загрузка настроек
    loadSettings();
    
    console.log('✅ Приложение готово');
});

// ==================== ИНИЦИАЛИЗАЦИЯ ОБРАБОТЧИКОВ СОБЫТИЙ ====================
function initEventListeners() {
    console.log('🔄 Настройка обработчиков событий...');
    
    // Кнопка загрузки книги
    const loadBtn = document.getElementById('load-btn');
    if (loadBtn) {
        loadBtn.addEventListener('click', function() {
            document.getElementById('file-input').click();
        });
    }
    
    // Кнопка начала чтения
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
        startBtn.addEventListener('click', function() {
            document.getElementById('file-input').click();
        });
    }
    
    // Ввод файла
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
    
    // Кнопка темы
    const themeBtn = document.getElementById('theme-btn');
    if (themeBtn) {
        themeBtn.addEventListener('click', toggleTheme);
    }
    
    // Кнопки шрифта
    const increaseFontBtn = document.getElementById('increase-font-btn');
    if (increaseFontBtn) {
        increaseFontBtn.addEventListener('click', increaseFont);
    }
    
    const decreaseFontBtn = document.getElementById('decrease-font-btn');
    if (decreaseFontBtn) {
        decreaseFontBtn.addEventListener('click', decreaseFont);
    }
    
    // Кнопка полного экрана
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', toggleFullscreen);
    }
    
    // Кнопки навигации PDF
    const prevPageBtn = document.getElementById('prev-page-btn');
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', prevPage);
    }
    
    const nextPageBtn = document.getElementById('next-page-btn');
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', nextPage);
    }
    
    // Кнопка сохранения
    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveToCloud);
    }
    
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
    
    console.log('✅ Обработчики событий настроены');
}

// ==================== ОБРАБОТКА КАСАНИЙ ДЛЯ МОБИЛЬНЫХ УСТРОЙСТВ ====================
function handleTouchStart(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}

function handleTouchEnd(e) {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const minSwipeDistance = 50;
    
    // Определяем направление свайпа
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Горизонтальный свайп
        if (Math.abs(deltaX) > minSwipeDistance) {
            if (deltaX > 0) {
                // Свайп вправо - предыдущая страница
                prevPage();
            } else {
                // Свайп влево - следующая страница
                nextPage();
            }
        }
    } else {
        // Вертикальный свайп
        if (Math.abs(deltaY) > minSwipeDistance) {
            if (deltaY > 0) {
                // Свайп вниз - уменьшить шрифт
                decreaseFont();
            } else {
                // Свайп вверх - увеличить шрифт
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
    
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'txt' || ext === 'pdf') {
        openBook(file);
    } else {
        showNotification('❌ Выберите файл .txt или .pdf', 'error');
    }
}

function openBook(file) {
    currentBook = file;
    currentBookType = file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'txt';
    
    // Обновляем информацию о книге
    const bookTitle = document.getElementById('book-title');
    if (bookTitle) {
        bookTitle.textContent = file.name;
    }
    
    const bookInfo = document.getElementById('book-info');
    if (bookInfo) {
        bookInfo.style.display = 'flex';
    }
    
    // Скрываем приветственный экран
    const welcomeScreen = document.getElementById('welcome-screen');
    if (welcomeScreen) {
        welcomeScreen.style.display = 'none';
    }
    
    // Загружаем книгу
    if (currentBookType === 'txt') {
        loadTxtFile(file);
    } else {
        loadPdfFile(file);
    }
    
    showNotification(`📖 Открыта книга: ${file.name}`, 'success');
    
    // Показываем кнопки навигации для мобильных устройств
    if (window.innerWidth <= 768 && currentBookType === 'pdf') {
        showMobileNavigation();
    }
}

function loadTxtFile(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const content = e.target.result;
        const bookContent = document.getElementById('book-content');
        const pdfViewer = document.getElementById('pdf-viewer');
        const pdfNav = document.getElementById('pdf-nav');
        
        if (bookContent) {
            bookContent.style.display = 'block';
            bookContent.innerHTML = `<pre>${escapeHtml(content)}</pre>`;
            bookContent.style.fontSize = fontSize + 'px';
        }
        
        if (pdfViewer) pdfViewer.style.display = 'none';
        if (pdfNav) pdfNav.style.display = 'none';
        
        updateFontSizeDisplay();
    };
    
    reader.onerror = function() {
        showNotification('❌ Ошибка чтения файла', 'error');
    };
    
    reader.readAsText(file);
}

function loadPdfFile(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const typedarray = new Uint8Array(e.target.result);
        const pdfViewer = document.getElementById('pdf-viewer');
        const bookContent = document.getElementById('book-content');
        const pdfNav = document.getElementById('pdf-nav');
        
        if (pdfViewer) {
            pdfViewer.innerHTML = '<div class="pdf-loading">Загрузка PDF...</div>';
            pdfViewer.style.display = 'block';
        }
        if (bookContent) bookContent.style.display = 'none';
        if (pdfNav) pdfNav.style.display = 'flex';
        
        pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
            pdfDoc = pdf;
            totalPages = pdf.numPages;
            currentPage = 1;
            
            renderPage(currentPage);
            updatePageInfo();
            
        }).catch(function(error) {
            console.error('Ошибка загрузки PDF:', error);
            if (pdfViewer) {
                pdfViewer.innerHTML = '<div class="pdf-error">❌ Ошибка загрузки PDF</div>';
            }
            showNotification('❌ Ошибка загрузки PDF файла', 'error');
        });
    };
    
    reader.onerror = function() {
        showNotification('❌ Ошибка чтения файла', 'error');
    };
    
    reader.readAsArrayBuffer(file);
}

// ==================== PDF НАВИГАЦИЯ ====================
function renderPage(pageNum) {
    if (!pdfDoc) return;
    
    pdfDoc.getPage(pageNum).then(function(page) {
        const scale = window.innerWidth < 768 ? 1.2 : 1.8;
        const viewport = page.getViewport({ scale: scale });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };
        
        page.render(renderContext).promise.then(function() {
            const pdfViewer = document.getElementById('pdf-viewer');
            if (pdfViewer) {
                pdfViewer.innerHTML = '';
                pdfViewer.appendChild(canvas);
                addPageNumberToCanvas(canvas, pageNum);
            }
        });
    }).catch(function(error) {
        console.error('Ошибка рендеринга страницы:', error);
    });
}

function addPageNumberToCanvas(canvas, pageNum) {
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.font = '14px Georgia';
    ctx.fillStyle = 'rgba(139, 115, 85, 0.7)';
    ctx.fillText(`Страница ${pageNum} из ${totalPages}`, 20, canvas.height - 20);
    ctx.restore();
}

function prevPage() {
    if (currentBookType !== 'pdf') return;
    if (currentPage > 1) {
        currentPage--;
        renderPage(currentPage);
        updatePageInfo();
    }
}

function nextPage() {
    if (currentBookType !== 'pdf') return;
    if (currentPage < totalPages) {
        currentPage++;
        renderPage(currentPage);
        updatePageInfo();
    }
}

function updatePageInfo() {
    const pageInfo = document.getElementById('page-info');
    if (pageInfo) {
        pageInfo.textContent = `Стр. ${currentPage}/${totalPages}`;
    }
}

// ==================== ГОРЯЧИЕ КЛАВИШИ ====================
function handleKeyPress(e) {
    // Стрелки влево/вправо для навигации по PDF
    if (currentBookType === 'pdf') {
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
    
    // ESC для выхода из полного экрана
    if (e.key === 'Escape') {
        if (isFullscreen) {
            exitFullscreen();
        }
        if (isBookFullscreen) {
            toggleBookFullscreen();
        }
    }
}

// ==================== УПРАВЛЕНИЕ ШРИФТОМ ====================
function increaseFont() {
    if (fontSize < 32) {
        fontSize += 2;
        updateFontSize();
        showNotification(`🔤 Шрифт: ${fontSize}px`, 'info');
    }
}

function decreaseFont() {
    if (fontSize > 12) {
        fontSize -= 2;
        updateFontSize();
        showNotification(`🔤 Шрифт: ${fontSize}px`, 'info');
    }
}

function updateFontSize() {
    const bookContent = document.getElementById('book-content');
    if (bookContent) {
        bookContent.style.fontSize = fontSize + 'px';
    }
    updateFontSizeDisplay();
    saveSettings();
}

function updateFontSizeDisplay() {
    const fontSizeDisplay = document.getElementById('font-size');
    if (fontSizeDisplay) {
        fontSizeDisplay.textContent = fontSize + 'px';
    }
}

// ==================== УПРАВЛЕНИЕ ТЕМОЙ ====================
function toggleTheme() {
    const body = document.body;
    body.classList.toggle('dark');
    
    const isDark = body.classList.contains('dark');
    const themeBtn = document.getElementById('theme-btn');
    
    if (themeBtn) {
        if (isDark) {
            themeBtn.textContent = '☀️ Светлая';
        } else {
            themeBtn.textContent = '🌙 Тёмная';
        }
    }
    
    saveSettings();
    showNotification(isDark ? '🌙 Тёмная тема' : '☀️ Светлая тема', 'info');
}

// ==================== ПОЛНЫЙ ЭКРАН ====================
function toggleFullscreen() {
    if (window.innerWidth <= 768) {
        // На мобильных устройствах - полноэкранный режим только для книги
        toggleBookFullscreen();
    } else {
        // На компьютерах - полноэкранный режим для всего сайта
        if (!isFullscreen) {
            enterFullscreen();
        } else {
            exitFullscreen();
        }
    }
}

function toggleBookFullscreen() {
    const bookContent = document.getElementById('book-content');
    const pdfViewer = document.getElementById('pdf-viewer');
    const header = document.querySelector('header');
    const controls = document.querySelector('.controls');
    const bookInfo = document.getElementById('book-info');
    
    isBookFullscreen = !isBookFullscreen;
    
    if (isBookFullscreen) {
        // Вход в полноэкранный режим книги
        if (bookContent && bookContent.style.display !== 'none') {
            bookContent.classList.add('book-fullscreen');
        }
        if (pdfViewer && pdfViewer.style.display !== 'none') {
            pdfViewer.classList.add('book-fullscreen');
        }
        
        if (header) header.style.display = 'none';
        if (controls) controls.style.display = 'none';
        if (bookInfo) bookInfo.style.display = 'none';
        
        document.body.classList.add('book-fullscreen-mode');
        showMobileNavigation();
        showNotification('📖 Книга на полном экране. Нажмите для выхода.', 'info');
        
        // Добавляем обработчик для выхода по клику
        document.addEventListener('click', handleBookFullscreenClick);
    } else {
        // Выход из полноэкранного режима книги
        if (bookContent) bookContent.classList.remove('book-fullscreen');
        if (pdfViewer) pdfViewer.classList.remove('book-fullscreen');
        
        if (header) header.style.display = 'block';
        if (controls) controls.style.display = 'flex';
        if (bookInfo) bookInfo.style.display = 'flex';
        
        document.body.classList.remove('book-fullscreen-mode');
        hideMobileNavigation();
        showNotification('📖 Выход из полного экрана книги', 'info');
        
        // Удаляем обработчик
        document.removeEventListener('click', handleBookFullscreenClick);
    }
}

function handleBookFullscreenClick(e) {
    if (!e.target.closest('.mobile-nav-btn') && !e.target.closest('canvas')) {
        toggleBookFullscreen();
    }
}

function showMobileNavigation() {
    if (currentBookType === 'pdf' && !document.querySelector('.mobile-nav')) {
        const mobileNav = document.createElement('div');
        mobileNav.className = 'mobile-nav';
        mobileNav.innerHTML = `
            <button id="mobile-prev-btn" class="mobile-nav-btn left">←</button>
            <button id="mobile-next-btn" class="mobile-nav-btn right">→</button>
        `;
        document.body.appendChild(mobileNav);
        
        document.getElementById('mobile-prev-btn').addEventListener('click', function(e) {
            e.stopPropagation();
            prevPage();
        });
        
        document.getElementById('mobile-next-btn').addEventListener('click', function(e) {
            e.stopPropagation();
            nextPage();
        });
    }
}

function hideMobileNavigation() {
    const mobileNav = document.querySelector('.mobile-nav');
    if (mobileNav) {
        mobileNav.remove();
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
    isFullscreen = !!(document.fullscreenElement || 
                     document.webkitFullscreenElement || 
                     document.mozFullScreenElement ||
                     document.msFullscreenElement);
    
    const hint = document.getElementById('fullscreen-hint');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    
    if (isFullscreen) {
        if (hint) hint.style.display = 'block';
        if (fullscreenBtn) fullscreenBtn.textContent = '📺 Выйти';
        showNotification('📺 Полный экран включен', 'info');
    } else {
        if (hint) hint.style.display = 'none';
        if (fullscreenBtn) fullscreenBtn.textContent = '📺 Полный экран';
        showNotification('📺 Полный экран выключен', 'info');
    }
}

// ==================== FIREBASE (ОБЛАЧНОЕ ХРАНИЛИЩЕ) ====================
async function saveToCloud() {
    if (!currentBook) {
        showNotification('❌ Сначала загрузите книгу', 'error');
        return;
    }
    
    if (!firestore) {
        showNotification('❌ Облачное хранилище не доступно', 'error');
        return;
    }
    
    try {
        showNotification('💾 Сохранение в облако...', 'info');
        
        const reader = new FileReader();
        
        if (currentBookType === 'txt') {
            reader.readAsText(currentBook);
        } else {
            reader.readAsDataURL(currentBook);
        }
        
        reader.onload = async function() {
            const bookData = {
                name: currentBook.name,
                type: currentBookType,
                size: currentBook.size,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                fontSize: fontSize
            };
            
            if (currentBookType === 'txt') {
                bookData.content = reader.result;
            } else {
                bookData.content = reader.result.split(',')[1];
            }
            
            const docRef = await firestore.collection('books').add(bookData);
            currentBookId = docRef.id;
            
            showNotification('✅ Книга сохранена в облако!', 'success');
            loadCloudBooks();
        };
        
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        showNotification('❌ Ошибка сохранения', 'error');
    }
}

async function loadCloudBooks() {
    if (!firestore) return;
    
    try {
        const snapshot = await firestore.collection('books')
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();
        
        const cloudList = document.getElementById('cloud-list');
        const cloudBooks = document.getElementById('cloud-books');
        
        if (!snapshot.empty && cloudList && cloudBooks) {
            cloudBooks.style.display = 'block';
            cloudList.innerHTML = '';
            
            snapshot.forEach(doc => {
                const book = doc.data();
                const bookElement = document.createElement('div');
                bookElement.className = 'cloud-book';
                bookElement.innerHTML = `
                    <div><strong>${book.name}</strong></div>
                    <div style="font-size: 0.9em; color: #666; margin-top: 5px;">
                        ${formatFileSize(book.size)} • ${book.type.toUpperCase()}
                    </div>
                `;
                
                bookElement.onclick = function() {
                    loadCloudBook(doc.id, book);
                };
                
                cloudList.appendChild(bookElement);
            });
        } else if (cloudBooks) {
            cloudBooks.style.display = 'none';
        }
        
    } catch (error) {
        console.error('Ошибка загрузки книг:', error);
    }
}

async function loadCloudBook(bookId, bookData) {
    try {
        showNotification('📥 Загрузка из облака...', 'info');
        
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
        
        if (bookData.fontSize) {
            fontSize = bookData.fontSize;
            updateFontSize();
        }
        
        openBook(file);
        currentBookId = bookId;
        
    } catch (error) {
        console.error('Ошибка загрузки книги:', error);
        showNotification('❌ Ошибка загрузки из облака', 'error');
    }
}

// ==================== НАСТРОЙКИ ====================
function loadSettings() {
    // Загрузка темы
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark');
        const themeBtn = document.getElementById('theme-btn');
        if (themeBtn) {
            themeBtn.textContent = '☀️ Светлая';
        }
    }
    
    // Загрузка размера шрифта
    const savedFontSize = localStorage.getItem('fontSize');
    if (savedFontSize) {
        fontSize = parseInt(savedFontSize);
        updateFontSize();
    }
}

function saveSettings() {
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    localStorage.setItem('fontSize', fontSize.toString());
}

// ==================== ДОПОЛНИТЕЛЬНЫЕ ФУНКЦИИ ====================
function addPageMarginsToContent() {
    const bookContent = document.getElementById('book-content');
    if (bookContent) {
        const content = bookContent.querySelector('pre');
        if (content) {
            // Добавляем отступы как у книги
            const lines = content.textContent.split('\n');
            const formattedLines = lines.map(line => {
                if (line.trim().length === 0) return '\n';
                return '  ' + line + '\n';
            });
            content.textContent = formattedLines.join('');
        }
    }
}

// Инициализация при загрузке страницы
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🚀 IT Books Reader запущен');
    });
} else {
    console.log('🚀 IT Books Reader запущен (документ уже загружен)');
}
