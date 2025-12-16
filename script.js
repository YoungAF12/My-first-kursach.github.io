// ==================== КОНФИГУРАЦИЯ FIREBASE ====================
// ВАЖНО: firebase-config.js должен быть подключен перед этим файлом
// Если его нет, используем пустой объект
const firebaseConfig = window.firebaseConfig || {};

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
    if (!notification) {
        console.log('Уведомление (нет элемента):', message);
        return;
    }
    
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
    
    try {
        // Проверяем, есть ли конфиг Firebase
        if (firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== "ВАШ_API_KEY_ЗДЕСЬ") {
            // Инициализация Firebase
            if (firebase.apps.length === 0) {
                firebaseApp = firebase.initializeApp(firebaseConfig);
            } else {
                firebaseApp = firebase.apps[0];
            }
            firestore = firebase.firestore();
            console.log('✅ Firebase инициализирован');
            loadCloudBooks();
        } else {
            console.log('⚠️ Firebase не настроен, работаем локально');
            const cloudBooks = document.getElementById('cloud-books');
            if (cloudBooks) cloudBooks.style.display = 'none';
        }
    } catch (error) {
        console.log('⚠️ Ошибка Firebase, работаем локально:', error);
    }
    
    // Установка PDF.js worker
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 
            'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
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
    
    console.log('✅ Обработчики событий настроены');
}

// ==================== ОБРАБОТКА ЗАГРУЗКИ ФАЙЛОВ ====================
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) {
        showNotification('❌ Файл не выбран', 'error');
        return;
    }
    
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
        showNotification(`❌ Файл слишком большой (макс. ${formatFileSize(maxSize)})`, 'error');
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
    
    const bookMeta = document.getElementById('book-meta');
    if (bookMeta) {
        bookMeta.textContent = `${formatFileSize(file.size)} • ${currentBookType.toUpperCase()}`;
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
        showNotification('❌ Ошибка отображения страницы', 'error');
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
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            prevPage();
        } else if (e.key === 'ArrowRight') {
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
        themeBtn.textContent = isDark ? '☀️ Светлая тема' : '🌙 Тёмная тема';
    }
    
    saveSettings();
    showNotification(isDark ? '🌙 Тёмная тема' : '☀️ Светлая тема', 'info');
}

// ==================== ПОЛНЫЙ ЭКРАН ====================
function toggleFullscreen() {
    if (!isFullscreen) {
        enterFullscreen();
    } else {
        exitFullscreen();
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
        if (fullscreenBtn) fullscreenBtn.textContent = '📺 Выйти из полного экрана';
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
        showNotification('❌ Облачное хранилище не настроено', 'error');
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
            try {
                const bookData = {
                    name: currentBook.name,
                    type: currentBookType,
                    size: currentBook.size,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    fontSize: fontSize,
                    currentPage: currentPage
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
                
            } catch (error) {
                console.error('Ошибка сохранения:', error);
                showNotification('❌ Ошибка сохранения в облако', 'error');
            }
        };
        
        reader.onerror = function() {
            showNotification('❌ Ошибка чтения файла', 'error');
        };
        
    } catch (error) {
        console.error('Ошибка:', error);
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
        
        if (bookData.currentPage) {
            currentPage = bookData.currentPage;
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
            themeBtn.textContent = '☀️ Светлая тема';
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
