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

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

// Экранирование HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Форматирование размера файла
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Показать уведомление
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.style.display = 'block';
    
    // Устанавливаем цвет в зависимости от типа
    let bgColor = '#4361ee'; // синий по умолчанию
    if (type === 'error') bgColor = '#ef4444';
    if (type === 'success') bgColor = '#10b981';
    if (type === 'warning') bgColor = '#f59e0b';
    
    notification.style.background = bgColor;
    
    // Автоматическое скрытие
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
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
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    
    // Инициализация обработчиков событий
    initEventListeners();
    
    // Загрузка настроек
    loadSettings();
    
    console.log('✅ Приложение готово');
});

// ==================== ИНИЦИАЛИЗАЦИЯ ОБРАБОТЧИКОВ ====================
function initEventListeners() {
    console.log('🔄 Настройка обработчиков событий...');
    
    // Кнопка загрузки книги
    document.getElementById('load-btn').addEventListener('click', function() {
        document.getElementById('file-input').click();
    });
    
    // Кнопка начала чтения
    document.getElementById('start-btn').addEventListener('click', function() {
        document.getElementById('file-input').click();
    });
    
    // Ввод файла
    document.getElementById('file-input').addEventListener('change', handleFileSelect);
    
    // Кнопка темы
    document.getElementById('theme-btn').addEventListener('click', toggleTheme);
    
    // Кнопки шрифта
    document.getElementById('increase-font-btn').addEventListener('click', increaseFont);
    document.getElementById('decrease-font-btn').addEventListener('click', decreaseFont);
    
    // Кнопка полного экрана
    document.getElementById('fullscreen-btn').addEventListener('click', toggleFullscreen);
    
    // Кнопки навигации PDF
    document.getElementById('prev-page-btn').addEventListener('click', prevPage);
    document.getElementById('next-page-btn').addEventListener('click', nextPage);
    
    // Кнопка сохранения
    document.getElementById('save-btn').addEventListener('click', saveToCloud);
    
    // Горячие клавиши
    document.addEventListener('keydown', handleKeyPress);
    
    // Полный экран
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    console.log('✅ Обработчики событий настроены');
}

// ==================== ОБРАБОТЧИКИ ФАЙЛОВ ====================
function handleFileSelect(e) {
    console.log('📁 Выбор файла...');
    const file = e.target.files[0];
    if (!file) {
        console.log('❌ Файл не выбран');
        return;
    }
    
    const ext = file.name.split('.').pop().toLowerCase();
    console.log(`📄 Выбран файл: ${file.name}, расширение: ${ext}`);
    
    if (ext === 'txt' || ext === 'pdf') {
        openBook(file);
    } else {
        showNotification('❌ Выберите файл .txt или .pdf', 'error');
    }
}

function openBook(file) {
    console.log(`📖 Открытие книги: ${file.name}`);
    currentBook = file;
    currentBookType = file.name.endsWith('.pdf') ? 'pdf' : 'txt';
    
    // Обновляем информацию о книге
    document.getElementById('book-title').textContent = file.name;
    document.getElementById('book-info').style.display = 'flex';
    
    // Скрываем приветственный экран
    document.getElementById('welcome-screen').style.display = 'none';
    
    // Загружаем книгу
    if (currentBookType === 'txt') {
        loadTxtFile(file);
    } else {
        loadPdfFile(file);
    }
    
    showNotification(`📖 Открыта книга: ${file.name}`, 'success');
}

function loadTxtFile(file) {
    console.log('📝 Загрузка TXT файла...');
    const reader = new FileReader();
    
    reader.onload = function(e) {
        console.log('✅ TXT файл загружен');
        const content = e.target.result;
        const bookContent = document.getElementById('book-content');
        
        // Показываем текстовый контент, скрываем PDF
        bookContent.style.display = 'block';
        document.getElementById('pdf-viewer').style.display = 'none';
        document.getElementById('pdf-nav').style.display = 'none';
        
        // Обновляем контент
        bookContent.innerHTML = `<pre>${escapeHtml(content)}</pre>`;
        bookContent.style.fontSize = fontSize + 'px';
        
        // Обновляем размер шрифта в интерфейсе
        updateFontSizeDisplay();
    };
    
    reader.onerror = function() {
        console.error('❌ Ошибка чтения TXT файла');
        showNotification('❌ Ошибка чтения файла', 'error');
    };
    
    reader.readAsText(file);
}

function loadPdfFile(file) {
    console.log('📕 Загрузка PDF файла...');
    const reader = new FileReader();
    
    reader.onload = function(e) {
        console.log('✅ PDF файл прочитан, начинаем обработку...');
        const typedarray = new Uint8Array(e.target.result);
        
        // Показываем индикатор загрузки
        document.getElementById('pdf-viewer').innerHTML = '<p>Загрузка PDF...</p>';
        document.getElementById('pdf-viewer').style.display = 'block';
        document.getElementById('book-content').style.display = 'none';
        document.getElementById('pdf-nav').style.display = 'flex';
        
        pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
            console.log(`✅ PDF загружен, страниц: ${pdf.numPages}`);
            pdfDoc = pdf;
            totalPages = pdf.numPages;
            currentPage = 1;
            
            renderPage(currentPage);
            updatePageInfo();
            
        }).catch(function(error) {
            console.error('❌ Ошибка загрузки PDF:', error);
            document.getElementById('pdf-viewer').innerHTML = '<p style="color: red;">❌ Ошибка загрузки PDF</p>';
            showNotification('❌ Ошибка загрузки PDF файла', 'error');
        });
    };
    
    reader.onerror = function() {
        console.error('❌ Ошибка чтения PDF файла');
        showNotification('❌ Ошибка чтения файла', 'error');
    };
    
    reader.readAsArrayBuffer(file);
}

// ==================== PDF НАВИГАЦИЯ ====================
function renderPage(pageNum) {
    console.log(`📄 Рендеринг страницы ${pageNum}`);
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
            console.log(`✅ Страница ${pageNum} отрисована`);
            document.getElementById('pdf-viewer').innerHTML = '';
            document.getElementById('pdf-viewer').appendChild(canvas);
        });
    }).catch(function(error) {
        console.error('❌ Ошибка рендеринга страницы:', error);
    });
}

function prevPage() {
    console.log('← Предыдущая страница');
    if (currentPage > 1) {
        currentPage--;
        renderPage(currentPage);
        updatePageInfo();
    }
}

function nextPage() {
    console.log('→ Следующая страница');
    if (currentPage < totalPages) {
        currentPage++;
        renderPage(currentPage);
        updatePageInfo();
    }
}

function updatePageInfo() {
    document.getElementById('page-info').textContent = `Стр. ${currentPage}/${totalPages}`;
}

// ==================== ГОРЯЧИЕ КЛАВИШИ ====================
function handleKeyPress(e) {
    console.log(`⌨️ Нажата клавиша: ${e.key}`);
    
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
    
    // Стрелки вверх/вниз для изменения размера шрифта
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
    if (e.key === 'Escape' && isFullscreen) {
        exitFullscreen();
    }
}

// ==================== УПРАВЛЕНИЕ ШРИФТОМ ====================
function increaseFont() {
    console.log('🔤 Увеличить шрифт');
    if (fontSize < 32) {
        fontSize += 2;
        updateFontSize();
        showNotification(`🔤 Шрифт: ${fontSize}px`, 'info');
    }
}

function decreaseFont() {
    console.log('🔤 Уменьшить шрифт');
    if (fontSize > 12) {
        fontSize -= 2;
        updateFontSize();
        showNotification(`🔤 Шрифт: ${fontSize}px`, 'info');
    }
}

function updateFontSize() {
    const bookContent = document.getElementById('book-content');
    bookContent.style.fontSize = fontSize + 'px';
    updateFontSizeDisplay();
    saveSettings();
}

function updateFontSizeDisplay() {
    document.getElementById('font-size').textContent = fontSize + 'px';
}

// ==================== ПОЛНЫЙ ЭКРАН ====================
function toggleFullscreen() {
    console.log('📺 Переключение полного экрана');
    if (!isFullscreen) {
        enterFullscreen();
    } else {
        exitFullscreen();
    }
}

function enterFullscreen() {
    console.log('▶️ Вход в полный экран');
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
    console.log('◀️ Выход из полного экрана');
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
    
    console.log(`📺 Полный экран: ${isFullscreen}`);
    
    const hint = document.getElementById('fullscreen-hint');
    const container = document.querySelector('.container');
    
    if (isFullscreen) {
        hint.style.display = 'block';
        container.style.padding = '10px';
        document.body.classList.add('fullscreen');
        showNotification('📺 Полный экран включен', 'info');
    } else {
        hint.style.display = 'none';
        container.style.padding = '20px';
        document.body.classList.remove('fullscreen');
        showNotification('📺 Полный экран выключен', 'info');
    }
}

// ==================== ТЕМА ====================
function toggleTheme() {
    console.log('🎨 Переключение темы');
    document.body.classList.toggle('dark');
    saveSettings();
    
    const isDark = document.body.classList.contains('dark');
    document.getElementById('theme-btn').textContent = isDark ? '☀️ Светлая' : '🌙 Темная';
    showNotification(isDark ? '🌙 Темная тема' : '☀️ Светлая тема', 'info');
}

// ==================== FIREBASE ====================
async function saveToCloud() {
    console.log('💾 Сохранение в облако...');
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
        
        // Читаем файл как текст (для TXT) или как base64 (для PDF)
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
            
            // Для TXT сохраняем текст, для PDF сохраняем base64
            if (currentBookType === 'txt') {
                bookData.content = reader.result;
            } else {
                // Для PDF сохраняем только base64 без префикса data:...
                bookData.content = reader.result.split(',')[1];
            }
            
            // Сохраняем в Firestore
            const docRef = await firestore.collection('books').add(bookData);
            currentBookId = docRef.id;
            
            console.log('✅ Книга сохранена в облако, ID:', docRef.id);
            showNotification('✅ Книга сохранена в облако!', 'success');
            loadCloudBooks();
        };
        
    } catch (error) {
        console.error('❌ Ошибка сохранения:', error);
        showNotification('❌ Ошибка сохранения', 'error');
    }
}

async function loadCloudBooks() {
    console.log('☁️ Загрузка облачных книг...');
    if (!firestore) {
        console.log('⚠️ Firebase не доступен');
        return;
    }
    
    try {
        const snapshot = await firestore.collection('books')
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();
        
        const cloudList = document.getElementById('cloud-list');
        const cloudBooks = document.getElementById('cloud-books');
        
        if (snapshot.empty) {
            console.log('📭 Облачных книг нет');
            cloudBooks.style.display = 'none';
            return;
        }
        
        console.log(`📚 Найдено ${snapshot.size} облачных книг`);
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
                console.log(`📥 Загрузка облачной книги: ${book.name}`);
                loadCloudBook(doc.id, book);
            };
            
            cloudList.appendChild(bookElement);
        });
        
    } catch (error) {
        console.error('❌ Ошибка загрузки книг:', error);
    }
}

async function loadCloudBook(bookId, bookData) {
    console.log(`📥 Загрузка книги из облака: ${bookData.name}`);
    try {
        showNotification('📥 Загрузка из облака...', 'info');
        
        let file;
        
        if (bookData.type === 'txt') {
            // Для TXT создаем файл из текста
            const blob = new Blob([bookData.content], { type: 'text/plain' });
            file = new File([blob], bookData.name, { type: 'text/plain' });
        } else {
            // Для PDF создаем файл из base64
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
            fontSize = bookData.fontSize;
            updateFontSize();
        }
        
        // Открываем книгу
        openBook(file);
        currentBookId = bookId;
        
        console.log('✅ Книга загружена из облака');
        
    } catch (error) {
        console.error('❌ Ошибка загрузки книги:', error);
        showNotification('❌ Ошибка загрузки из облака', 'error');
    }
}

// ==================== НАСТРОЙКИ ====================
function loadSettings() {
    console.log('⚙️ Загрузка настроек...');
    // Тема
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark');
        document.getElementById('theme-btn').textContent = '☀️ Светлая';
    }
    
    // Размер шрифта
    const savedFontSize = localStorage.getItem('fontSize');
    if (savedFontSize) {
        fontSize = parseInt(savedFontSize);
        updateFontSize();
    }
    
    console.log('✅ Настройки загружены');
}

function saveSettings() {
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    localStorage.setItem('fontSize', fontSize.toString());
}

// ==================== ЗАГРУЗКА ПРИЛОЖЕНИЯ ====================
console.log('🚀 IT Books Reader запускается...');
