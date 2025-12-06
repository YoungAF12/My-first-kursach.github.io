// ==================== КОНФИГУРАЦИЯ FIREBASE ====================
const firebaseConfig = {
    apiKey: "AIzaSyDqnau8N2mHjhOTMpxXqYe8EDGfxqGqQn0",
    authDomain: "my-first-kyrsachic.firebaseapp.com",
    projectId: "my-first-kyrsachic",
    storageBucket: "my-first-kyrsachic.firebasestorage.app",
    messagingSenderId: "741117010262",
    appId: "1:741117010262:web:2972f2e62517ccc2b9f6f7"
};

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
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

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    console.log('📚 IT Books Reader запущен');
    
    // Инициализация Firebase
    try {
        firebaseApp = firebase.initializeApp(firebaseConfig);
        firestore = firebase.firestore();
        console.log('✅ Firebase инициализирован');
        loadCloudBooks();
    } catch (error) {
        console.log('⚠️ Firebase не инициализирован, работаем локально');
    }
    
    // Установка PDF.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    
    // Настройка обработчиков файлов
    document.getElementById('file-input').addEventListener('change', handleFileSelect);
    
    // Настройка горячих клавиш
    document.addEventListener('keydown', handleKeyPress);
    
    // Загрузка настроек
    loadSettings();
    
    // Настройка полного экрана
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    console.log('✅ Приложение готово');
});

// ==================== ОБРАБОТЧИКИ ФАЙЛОВ ====================
function loadBook() {
    document.getElementById('file-input').click();
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const ext = file.name.split('.').pop().toLowerCase();
    
    if (ext === 'txt' || ext === 'pdf') {
        openBook(file);
    } else {
        showNotification('❌ Выберите файл .txt или .pdf', 'error');
    }
}

function openBook(file) {
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
    const reader = new FileReader();
    
    reader.onload = function(e) {
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
    
    reader.readAsText(file);
}

function loadPdfFile(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const typedarray = new Uint8Array(e.target.result);
        
        // Показываем индикатор загрузки
        document.getElementById('pdf-viewer').innerHTML = '<p>Загрузка PDF...</p>';
        document.getElementById('pdf-viewer').style.display = 'block';
        document.getElementById('book-content').style.display = 'none';
        document.getElementById('pdf-nav').style.display = 'flex';
        
        pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
            pdfDoc = pdf;
            totalPages = pdf.numPages;
            currentPage = 1;
            
            renderPage(currentPage);
            updatePageInfo();
            
        }).catch(function(error) {
            console.error('Ошибка загрузки PDF:', error);
            document.getElementById('pdf-viewer').innerHTML = '<p style="color: red;">❌ Ошибка загрузки PDF</p>';
        });
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
            document.getElementById('pdf-viewer').innerHTML = '';
            document.getElementById('pdf-viewer').appendChild(canvas);
        });
    });
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderPage(currentPage);
        updatePageInfo();
    }
}

function nextPage() {
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
    bookContent.style.fontSize = fontSize + 'px';
    updateFontSizeDisplay();
    saveSettings();
}

function updateFontSizeDisplay() {
    document.getElementById('font-size').textContent = fontSize + 'px';
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
    const container = document.querySelector('.container');
    
    if (isFullscreen) {
        hint.style.display = 'block';
        container.style.padding = '10px';
        document.body.classList.add('fullscreen');
    } else {
        hint.style.display = 'none';
        container.style.padding = '20px';
        document.body.classList.remove('fullscreen');
    }
}

// ==================== ТЕМА ====================
function toggleTheme() {
    document.body.classList.toggle('dark');
    saveSettings();
    
    const isDark = document.body.classList.contains('dark');
    document.getElementById('theme-btn').textContent = isDark ? '☀️ Светлая' : '🌙 Темная';
    showNotification(isDark ? '🌙 Темная тема' : '☀️ Светлая тема', 'info');
}

// ==================== FIREBASE (ПРОСТАЯ БАЗА) ====================
async function saveToCloud() {
    if (!currentBook || !firestore) {
        showNotification('❌ Не удалось сохранить в облако', 'error');
        return;
    }
    
    try {
        showNotification('💾 Сохранение в облако...', 'info');
        
        // Конвертируем файл в base64
        const reader = new FileReader();
        reader.readAsDataURL(currentBook);
        
        reader.onload = async function() {
            const bookData = {
                name: currentBook.name,
                type: currentBookType,
                size: currentBook.size,
                content: reader.result.split(',')[1], // Убираем префикс data:...
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                fontSize: fontSize
            };
            
            // Сохраняем в Firestore
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
        
        if (snapshot.empty) {
            cloudBooks.style.display = 'none';
            return;
        }
        
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
        
    } catch (error) {
        console.error('Ошибка загрузки книг:', error);
    }
}

async function loadCloudBook(bookId, bookData) {
    try {
        showNotification('📥 Загрузка из облака...', 'info');
        
        // Создаем файл из base64
        const byteString = atob(bookData.content);
        const arrayBuffer = new ArrayBuffer(byteString.length);
        const uintArray = new Uint8Array(arrayBuffer);
        
        for (let i = 0; i < byteString.length; i++) {
            uintArray[i] = byteString.charCodeAt(i);
        }
        
        const blob = new Blob([arrayBuffer], { type: bookData.type === 'pdf' ? 'application/pdf' : 'text/plain' });
        const file = new File([blob], bookData.name, { type: blob.type });
        
        // Восстанавливаем настройки
        if (bookData.fontSize) {
            fontSize = bookData.fontSize;
            updateFontSize();
        }
        
        // Открываем книгу
        openBook(file);
        currentBookId = bookId;
        
    } catch (error) {
        console.error('Ошибка загрузки книги:', error);
        showNotification('❌ Ошибка загрузки из облака', 'error');
    }
}

// ==================== НАСТРОЙКИ ====================
function loadSettings() {
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
}

function saveSettings() {
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    localStorage.setItem
