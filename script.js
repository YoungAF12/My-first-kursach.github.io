// Инициализация Firebase
firebase.initializeApp({
    apiKey: "AIzaSyC6kqLtB2oVq1cV6M4Pq9zQwXpYdNzqQr0",
    authDomain: "it-library-courses.firebaseapp.com",
    projectId: "it-library-courses",
    storageBucket: "it-library-courses.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef1234567890"
});

const storage = firebase.storage();

// Глобальные переменные
let currentBook = null;
let currentPage = 1;
let totalPages = 1;
let isFullscreen = false;
let zoomLevel = 1;
let bookContent = '';
let pdfDoc = null;

// DOM элементы
const elements = {
    themeToggle: document.getElementById('themeToggle'),
    uploadBtn: document.getElementById('uploadBtn'),
    uploadArea: document.getElementById('uploadArea'),
    fileInput: document.getElementById('fileInput'),
    fileInfo: document.getElementById('fileInfo'),
    fileName: document.getElementById('fileName'),
    readBtn: document.getElementById('readBtn'),
    uploadSection: document.getElementById('uploadSection'),
    readerSection: document.getElementById('readerSection'),
    bookTitle: document.getElementById('bookTitle'),
    readerContent: document.getElementById('readerContent'),
    currentPage: document.getElementById('currentPage'),
    totalPages: document.getElementById('totalPages'),
    prevPage: document.getElementById('prevPage'),
    nextPage: document.getElementById('nextPage'),
    fullscreenBtn: document.getElementById('fullscreenBtn'),
    closeReader: document.getElementById('closeReader'),
    zoomOut: document.getElementById('zoomOut'),
    zoomIn: document.getElementById('zoomIn'),
    zoomLevel: document.getElementById('zoomLevel'),
    fullscreenOverlay: document.getElementById('fullscreenOverlay'),
    exitFullscreen: document.getElementById('exitFullscreen'),
    fullscreenContent: document.getElementById('fullscreenContent'),
    prevPageFull: document.getElementById('prevPageFull'),
    nextPageFull: document.getElementById('nextPageFull')
};

// Инициализация приложения
function init() {
    // Проверка темы в localStorage
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-theme');
        elements.themeToggle.innerHTML = '<span class="theme-icon">☀️</span>';
    }
    
    // Назначение обработчиков событий
    setupEventListeners();
    
    // Установка обработчиков для навигации стрелками
    document.addEventListener('keydown', handleKeyNavigation);
    
    console.log('Приложение инициализировано');
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Переключение темы
    elements.themeToggle.addEventListener('click', toggleTheme);
    
    // Загрузка файла
    elements.uploadBtn.addEventListener('click', () => elements.fileInput.click());
    elements.uploadArea.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', handleFileSelect);
    
    // Чтение книги
    elements.readBtn.addEventListener('click', startReading);
    
    // Навигация по страницам
    elements.prevPage.addEventListener('click', () => changePage(-1));
    elements.nextPage.addEventListener('click', () => changePage(1));
    
    // Зум
    elements.zoomOut.addEventListener('click', () => adjustZoom(-0.1));
    elements.zoomIn.addEventListener('click', () => adjustZoom(0.1));
    
    // Полноэкранный режим
    elements.fullscreenBtn.addEventListener('click', enterFullscreen);
    elements.exitFullscreen.addEventListener('click', exitFullscreen);
    
    // Закрытие читалки
    elements.closeReader.addEventListener('click', closeReader);
    
    // Навигация в полноэкранном режиме
    elements.prevPageFull.addEventListener('click', () => changePage(-1));
    elements.nextPageFull.addEventListener('click', () => changePage(1));
    
    // Обработка перетаскивания файла
    elements.uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.uploadArea.style.borderColor = 'var(--accent-color)';
        elements.uploadArea.style.backgroundColor = 'rgba(74, 111, 165, 0.1)';
    });
    
    elements.uploadArea.addEventListener('dragleave', () => {
        elements.uploadArea.style.borderColor = 'var(--border-color)';
        elements.uploadArea.style.backgroundColor = 'transparent';
    });
    
    elements.uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.uploadArea.style.borderColor = 'var(--border-color)';
        elements.uploadArea.style.backgroundColor = 'transparent';
        
        if (e.dataTransfer.files.length) {
            elements.fileInput.files = e.dataTransfer.files;
            handleFileSelect();
        }
    });
}

// Переключение темы
function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    elements.themeToggle.innerHTML = isDark 
        ? '<span class="theme-icon">☀️</span>' 
        : '<span class="theme-icon">🌙</span>';
}

// Обработка выбора файла
function handleFileSelect() {
    const file = elements.fileInput.files[0];
    if (!file) return;
    
    // Проверка типа файла
    const fileType = file.type;
    const validTypes = ['application/pdf', 'text/plain'];
    
    if (!validTypes.includes(fileType) && !file.name.endsWith('.txt') && !file.name.endsWith('.pdf')) {
        alert('Пожалуйста, выберите файл в формате PDF или TXT');
        return;
    }
    
    // Проверка размера файла (максимум 10 MB)
    if (file.size > 10 * 1024 * 1024) {
        alert('Файл слишком большой. Максимальный размер: 10 MB');
        return;
    }
    
    // Показать информацию о файле
    elements.fileName.textContent = file.name;
    elements.fileInfo.style.display = 'block';
    currentBook = file;
    
    // Загрузка на Firebase Storage (без регистрации)
    uploadToFirebase(file);
}

// Загрузка файла в Firebase Storage
function uploadToFirebase(file) {
    const storageRef = storage.ref();
    const fileRef = storageRef.child('books/' + Date.now() + '_' + file.name);
    
    elements.readBtn.disabled = true;
    elements.readBtn.innerHTML = '<span class="btn-icon">⏳</span> Загрузка...';
    
    fileRef.put(file)
        .then((snapshot) => {
            console.log('Файл успешно загружен в Firebase');
            elements.readBtn.disabled = false;
            elements.readBtn.innerHTML = '<span class="btn-icon">👁️</span> Начать чтение';
        })
        .catch((error) => {
            console.error('Ошибка загрузки в Firebase:', error);
            alert('Ошибка загрузки файла. Книга будет доступна только локально.');
            elements.readBtn.disabled = false;
            elements.readBtn.innerHTML = '<span class="btn-icon">👁️</span> Начать чтение';
        });
}

// Начало чтения книги
function startReading() {
    if (!currentBook) return;
    
    elements.uploadSection.style.display = 'none';
    elements.readerSection.style.display = 'block';
    elements.bookTitle.textContent = currentBook.name;
    
    // Обработка файла в зависимости от типа
    if (currentBook.type === 'application/pdf' || currentBook.name.endsWith('.pdf')) {
        loadPDF(currentBook);
    } else {
        loadTXT(currentBook);
    }
}

// Загрузка PDF файла
function loadPDF(file) {
    const fileReader = new FileReader();
    
    fileReader.onload = function(event) {
        const typedarray = new Uint8Array(event.target.result);
        
        // Используем PDF.js для рендеринга PDF
        pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
            pdfDoc = pdf;
            totalPages = pdf.numPages;
            elements.totalPages.textContent = totalPages;
            
            // Отображаем первую страницу
            renderPage(1);
        }).catch(function(error) {
            console.error('Ошибка загрузки PDF:', error);
            elements.readerContent.innerHTML = '<div class="book-placeholder"><p>Ошибка загрузки PDF файла</p></div>';
        });
    };
    
    fileReader.readAsArrayBuffer(file);
}

// Рендеринг страницы PDF
function renderPage(pageNum) {
    if (!pdfDoc) return;
    
    pdfDoc.getPage(pageNum).then(function(page) {
        const scale = 1.5 * zoomLevel;
        const viewport = page.getViewport({ scale: scale });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        canvas.className = 'pdf-canvas fade-in';
        
        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };
        
        elements.readerContent.innerHTML = '';
        elements.readerContent.appendChild(canvas);
        
        page.render(renderContext);
        
        // Обновляем также для полного экрана
        if (isFullscreen) {
            elements.fullscreenContent.innerHTML = '';
            const fullscreenCanvas = canvas.cloneNode(true);
            elements.fullscreenContent.appendChild(fullscreenCanvas);
            page.render({ ...renderContext, canvasContext: fullscreenCanvas.getContext('2d') });
        }
        
        // Обновляем номер текущей страницы
        currentPage = pageNum;
        elements.currentPage.textContent = currentPage;
    });
}

// Загрузка TXT файла
function loadTXT(file) {
    const fileReader = new FileReader();
    
    fileReader.onload = function(event) {
        bookContent = event.target.result;
        totalPages = Math.ceil(bookContent.length / 2000); // Примерно 2000 символов на страницу
        elements.totalPages.textContent = totalPages;
        
        // Отображаем первую страницу
        renderTextPage(1);
    };
    
    fileReader.readAsText(file, 'UTF-8');
}

// Рендеринг страницы текста
function renderTextPage(pageNum) {
    if (!bookContent) return;
    
    const charsPerPage = 2000;
    const start = (pageNum - 1) * charsPerPage;
    const end = Math.min(start + charsPerPage, bookContent.length);
    const pageContent = bookContent.substring(start, end);
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'txt-content fade-in';
    contentDiv.style.fontSize = (16 * zoomLevel) + 'px';
    contentDiv.textContent = pageContent;
    
    elements.readerContent.innerHTML = '';
    elements.readerContent.appendChild(contentDiv);
    
    // Обновляем также для полного экрана
    if (isFullscreen) {
        elements.fullscreenContent.innerHTML = '';
        const fullscreenContent = contentDiv.cloneNode(true);
        fullscreenContent.style.fontSize = (18 * zoomLevel) + 'px';
        elements.fullscreenContent.appendChild(fullscreenContent);
    }
    
    // Обновляем номер текущей страницы
    currentPage = pageNum;
    elements.currentPage.textContent = pageNum;
}

// Смена страницы
function changePage(delta) {
    const newPage = currentPage + delta;
    
    if (newPage < 1 || newPage > totalPages) return;
    
    if (pdfDoc) {
        renderPage(newPage);
    } else if (bookContent) {
        renderTextPage(newPage);
    }
}

// Навигация с помощью клавиатуры
function handleKeyNavigation(e) {
    if (isFullscreen || elements.readerSection.style.display === 'block') {
        switch(e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                changePage(-1);
                break;
            case 'ArrowRight':
                e.preventDefault();
                changePage(1);
                break;
            case 'Escape':
                if (isFullscreen) exitFullscreen();
                break;
        }
    }
}

// Изменение масштаба
function adjustZoom(delta) {
    zoomLevel = Math.max(0.5, Math.min(2, zoomLevel + delta));
    elements.zoomLevel.textContent = Math.round(zoomLevel * 100) + '%';
    
    // Перерисовываем текущую страницу с новым масштабом
    if (pdfDoc) {
        renderPage(currentPage);
    } else if (bookContent) {
        renderTextPage(currentPage);
    }
}

// Вход в полноэкранный режим
function enterFullscreen() {
    isFullscreen = true;
    elements.fullscreenOverlay.style.display = 'flex';
    
    // Копируем контент в полноэкранный режим
    if (pdfDoc) {
        renderPage(currentPage);
    } else if (bookContent) {
        renderTextPage(currentPage);
    }
    
    // На мобильных устройствах скрываем навигационные стрелки через 3 секунды
    if (window.innerWidth <= 768) {
        setTimeout(() => {
            elements.prevPageFull.style.opacity = '0.2';
            elements.nextPageFull.style.opacity = '0.2';
        }, 3000);
        
        // Показываем стрелки при касании
        elements.fullscreenOverlay.addEventListener('touchstart', () => {
            elements.prevPageFull.style.opacity = '0.5';
            elements.nextPageFull.style.opacity = '0.5';
            setTimeout(() => {
                elements.prevPageFull.style.opacity = '0.2';
                elements.nextPageFull.style.opacity = '0.2';
            }, 2000);
        });
    }
}

// Выход из полноэкранного режима
function exitFullscreen() {
    isFullscreen = false;
    elements.fullscreenOverlay.style.display = 'none';
}

// Закрытие читалки
function closeReader() {
    elements.readerSection.style.display = 'none';
    elements.uploadSection.style.display = 'block';
    elements.fileInfo.style.display = 'none';
    elements.fileInput.value = '';
    currentBook = null;
    pdfDoc = null;
    bookContent = '';
    currentPage = 1;
    zoomLevel = 1;
    elements.zoomLevel.textContent = '100%';
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', init);
