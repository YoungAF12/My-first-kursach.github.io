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

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================
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
    
    // Добавляем класс для анимации
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.style.display = 'none';
        }, 300);
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
    document.getElementById('theme-btn').addEventListener('click', function() {
        toggleTheme();
    });
    
    // Кнопки шрифта
    document.getElementById('increase-font-btn').addEventListener('click', function() {
        console.log('Клик по кнопке увеличения шрифта');
        increaseFont();
    });
    
    document.getElementById('decrease-font-btn').addEventListener('click', function() {
        console.log('Клик по кнопке уменьшения шрифта');
        decreaseFont();
    });
    
    // Кнопка полного экрана
    document.getElementById('fullscreen-btn').addEventListener('click', function() {
        console.log('Клик по кнопке полного экрана');
        toggleFullscreen();
    });
    
    // Кнопки навигации PDF
    document.getElementById('prev-page-btn').addEventListener('click', function() {
        console.log('Клик по кнопке предыдущей страницы');
        prevPage();
    });
    
    document.getElementById('next-page-btn').addEventListener('click', function() {
        console.log('Клик по кнопке следующей страницы');
        nextPage();
    });
    
    // Кнопка сохранения
    document.getElementById('save-btn').addEventListener('click', function() {
        console.log('Клик по кнопке сохранения');
        saveToCloud();
    });
    
    // Горячие клавиши
    document.addEventListener('keydown', handleKeyPress);
    
    // Полный экран
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    // Свайпы для телефонов (навигация по страницам)
    setupTouchNavigation();
    
    console.log('✅ Обработчики событий настроены');
}

// ==================== НАВИГАЦИЯ КАСАНИЯМИ ДЛЯ ТЕЛЕФОНОВ ====================
function setupTouchNavigation() {
    let touchStartX = 0;
    let touchEndX = 0;
    let touchStartY = 0;
    let touchEndY = 0;
    const minSwipeDistance = 50;
    
    document.addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, false);
    
    document.addEventListener('touchend', function(e) {
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        handleTouchSwipe();
    }, false);
    
    function handleTouchSwipe() {
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        
        // Горизонтальный свайп для навигации по страницам
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            if (Math.abs(deltaX) > minSwipeDistance) {
                if (deltaX > 0) {
                    // Свайп вправо - предыдущая страница
                    prevPage();
                } else {
                    // Свайп влево - следующая страница
                    nextPage();
                }
            }
        }
        // Вертикальный свайп для изменения шрифта (только если книга открыта)
        else if (currentBook && Math.abs(deltaY) > minSwipeDistance) {
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
    
    // Показываем кнопки навигации для PDF на мобильных устройствах
    if (currentBookType === 'pdf' && window.innerWidth <= 768) {
        showMobileNavigation();
    }
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
        document.getElementById('pdf-viewer').innerHTML = '<div class="pdf-loading">Загрузка PDF...</div>';
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
            document.getElementById('pdf-viewer').innerHTML = '<div class="pdf-error">❌ Ошибка загрузки PDF</div>';
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
            
            // Добавляем номер страницы на canvas
            addPageNumberToCanvas(canvas, pageNum);
        });
    }).catch(function(error) {
        console.error('❌ Ошибка рендеринга страницы:', error);
    });
}

function addPageNumberToCanvas(canvas, pageNum) {
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.font = '16px Arial';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillText(`Страница ${pageNum} из ${totalPages}`, 20, canvas.height - 20);
    ctx.restore();
}

function prevPage() {
    console.log('← Предыдущая страница');
    if (currentBookType !== 'pdf') return;
    if (currentPage > 1) {
        currentPage--;
        renderPage(currentPage);
        updatePageInfo();
    }
}

function nextPage() {
    console.log('→ Следующая страница');
    if (currentBookType !== 'pdf') return;
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
        if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
            e.preventDefault();
            prevPage();
        } else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
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
    if (e.key === 'f' || e.key === 'F' || e.key === 'а' || e.key === 'А') {
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

// ==================== ТЕМА ====================
function toggleTheme() {
    console.log('🎨 Переключение темы');
    const body = document.body;
    body.classList.toggle('dark');
    
    const isDark = body.classList.contains('dark');
    const themeBtn = document.getElementById('theme-btn');
    
    if (isDark) {
        themeBtn.textContent = '☀️ Светлая';
        themeBtn.innerHTML = '☀️ Светлая';
    } else {
        themeBtn.textContent = '🌙 Тёмная';
        themeBtn.innerHTML = '🌙 Тёмная';
    }
    
    saveSettings();
    showNotification(isDark ? '🌙 Тёмная тема' : '☀️ Светлая тема', 'info');
}

// ==================== ПОЛНЫЙ ЭКРАН ====================
function toggleFullscreen() {
    console.log('📺 Переключение полного экрана');
    
    if (window.innerWidth <= 768) {
        // На телефоне - полноэкранный режим только для книги
        toggleBookFullscreen();
    } else {
        // На компьютере - полноэкранный режим для всего сайта
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
        if (bookContent.style.display !== 'none') {
            bookContent.classList.add('book-fullscreen');
        }
        if (pdfViewer.style.display !== 'none') {
            pdfViewer.classList.add('book-fullscreen');
        }
        
        header.style.display = 'none';
        controls.style.display = 'none';
        bookInfo.style.display = 'none';
        
        document.body.classList.add('book-fullscreen-mode');
        
        // Показываем кнопки навигации для телефона
        showMobileNavigation();
        
        showNotification('📖 Книга на полном экране. Нажмите для выхода.', 'info');
    } else {
        // Выход из полноэкранного режима книги
        bookContent.classList.remove('book-fullscreen');
        pdfViewer.classList.remove('book-fullscreen');
        
        header.style.display = 'block';
        controls.style.display = 'flex';
        bookInfo.style.display = 'flex';
        
        document.body.classList.remove('book-fullscreen-mode');
        
        // Скрываем кнопки навигации
        hideMobileNavigation();
        
        showNotification('📖 Выход из полного экрана книги', 'info');
    }
}

// Обработчик клика для выхода из полноэкранного режима книги
document.addEventListener('click', function(e) {
    if (isBookFullscreen && !e.target.closest('.mobile-nav') && !e.target.closest('canvas')) {
        toggleBookFullscreen();
    }
});

function showMobileNavigation() {
    // Создаем кнопки навигации для телефонов
    if (currentBookType === 'pdf' && !document.getElementById('mobile-prev-btn')) {
        const mobileNav = document.createElement('div');
        mobileNav.className = 'mobile-nav';
        mobileNav.innerHTML = `
            <button id="mobile-prev-btn" class="mobile-nav-btn left">←</button>
            <button id="mobile-next-btn" class="mobile-nav-btn right">→</button>
        `;
        document.body.appendChild(mobileNav);
        
        // Обработчики для мобильных кнопок
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
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    
    if (isFullscreen) {
        hint.style.display = 'block';
        fullscreenBtn.textContent = '📺 Выйти';
        fullscreenBtn.innerHTML = '📺 Выйти';
        showNotification('📺 Полный экран включен', 'info');
    } else {
        hint.style.display = 'none';
        fullscreenBtn.textContent = '📺 Полный экран';
        fullscreenBtn.innerHTML = '📺 Полный экран';
        showNotification('📺 Полный экран выключен', 'info');
    }
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
        const themeBtn = document.getElementById('theme-btn');
        themeBtn.textContent = '☀️ Светлая';
        themeBtn.innerHTML = '☀️ Светлая';
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
