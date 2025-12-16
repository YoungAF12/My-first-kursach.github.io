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
let isDarkTheme = false;

// DOM элементы
const elements = {
    // Тема
    themeSwitch: document.getElementById('themeSwitch'),
    
    // Загрузка
    uploadBtn: document.getElementById('uploadBtn'),
    uploadZone: document.getElementById('uploadZone'),
    fileInput: document.getElementById('fileInput'),
    
    // Читалка
    readerSection: document.getElementById('readerSection'),
    backToLibrary: document.getElementById('backToLibrary'),
    readerArea: document.getElementById('readerArea'),
    readerPlaceholder: document.getElementById('readerPlaceholder'),
    readerContent: document.getElementById('readerContent'),
    
    // Информация о книге
    bookTitle: document.getElementById('bookTitle'),
    bookFormat: document.getElementById('bookFormat'),
    bookSize: document.getElementById('bookSize'),
    
    // Навигация
    currentPage: document.getElementById('currentPage'),
    totalPages: document.getElementById('totalPages'),
    prevPage: document.getElementById('prevPage'),
    nextPage: document.getElementById('nextPage'),
    progressBar: document.getElementById('progressBar'),
    
    // Зум
    zoomLevel: document.getElementById('zoomLevel'),
    zoomOut: document.getElementById('zoomOut'),
    zoomIn: document.getElementById('zoomIn'),
    
    // Полный экран
    fullscreenBtn: document.getElementById('fullscreenBtn'),
    fullscreenModal: document.getElementById('fullscreenModal'),
    exitFullscreen: document.getElementById('exitFullscreen'),
    fullscreenContent: document.getElementById('fullscreenContent'),
    fullscreenTitle: document.getElementById('fullscreenTitle'),
    fsCurrentPage: document.getElementById('fsCurrentPage'),
    fsTotalPages: document.getElementById('fsTotalPages'),
    prevPageFull: document.getElementById('prevPageFull'),
    nextPageFull: document.getElementById('nextPageFull'),
    
    // Уведомления
    notification: document.getElementById('notification')
};

// Инициализация приложения
function init() {
    // Проверка темы
    if (localStorage.getItem('theme') === 'dark') {
        isDarkTheme = true;
        document.body.classList.add('dark-theme');
        elements.themeSwitch.checked = true;
    }
    
    // Настройка обработчиков
    setupEventListeners();
    
    // Обработка клавиатуры
    document.addEventListener('keydown', handleKeyNavigation);
    
    // Показать приветственное сообщение
    showNotification('Добро пожаловать в минималистичный читатель IT-книг', 'info');
    
    console.log('Приложение инициализировано');
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Тема
    elements.themeSwitch.addEventListener('change', toggleTheme);
    
    // Загрузка файла
    elements.uploadBtn.addEventListener('click', () => elements.fileInput.click());
    elements.uploadZone.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', handleFileSelect);
    
    // Возврат в библиотеку
    elements.backToLibrary.addEventListener('click', closeReader);
    
    // Навигация
    elements.prevPage.addEventListener('click', () => changePage(-1));
    elements.nextPage.addEventListener('click', () => changePage(1));
    
    // Зум
    elements.zoomOut.addEventListener('click', () => adjustZoom(-0.1));
    elements.zoomIn.addEventListener('click', () => adjustZoom(0.1));
    
    // Полный экран
    elements.fullscreenBtn.addEventListener('click', enterFullscreen);
    elements.exitFullscreen.addEventListener('click', exitFullscreen);
    elements.prevPageFull.addEventListener('click', () => changePage(-1));
    elements.nextPageFull.addEventListener('click', () => changePage(1));
    
    // Drag and drop
    elements.uploadZone.addEventListener('dragover', handleDragOver);
    elements.uploadZone.addEventListener('dragleave', handleDragLeave);
    elements.uploadZone.addEventListener('drop', handleFileDrop);
}

// Переключение темы
function toggleTheme() {
    isDarkTheme = !isDarkTheme;
    document.body.classList.toggle('dark-theme');
    localStorage.setItem('theme', isDarkTheme ? 'dark' : 'light');
    
    showNotification(isDarkTheme ? 'Тёмная тема активирована' : 'Светлая тема активирована', 'info');
}

// Drag and drop
function handleDragOver(e) {
    e.preventDefault();
    elements.uploadZone.style.borderColor = 'var(--color-primary)';
    elements.uploadZone.style.background = 'var(--color-surface-alt)';
}

function handleDragLeave() {
    elements.uploadZone.style.borderColor = 'var(--color-border)';
    elements.uploadZone.style.background = 'var(--color-surface)';
}

function handleFileDrop(e) {
    e.preventDefault();
    handleDragLeave();
    
    if (e.dataTransfer.files.length) {
        elements.fileInput.files = e.dataTransfer.files;
        handleFileSelect();
    }
}

// Обработка выбора файла
function handleFileSelect() {
    const file = elements.fileInput.files[0];
    if (!file) return;
    
    // Проверка типа файла
    const isValidType = file.type === 'application/pdf' || 
                       file.type === 'text/plain' || 
                       file.name.endsWith('.pdf') || 
                       file.name.endsWith('.txt');
    
    if (!isValidType) {
        showNotification('Пожалуйста, выберите файл в формате PDF или TXT', 'error');
        return;
    }
    
    // Проверка размера
    if (file.size > 10 * 1024 * 1024) {
        showNotification('Файл слишком большой. Максимальный размер: 10 MB', 'error');
        return;
    }
    
    currentBook = file;
    
    // Загрузка на Firebase
    uploadToFirebase(file);
    
    // Показать информацию о файле
    elements.bookTitle.textContent = file.name;
    elements.bookFormat.textContent = file.name.endsWith('.pdf') ? 'PDF' : 'TXT';
    elements.bookSize.textContent = formatFileSize(file.size);
    elements.fullscreenTitle.textContent = file.name;
    
    // Перейти к читалке
    startReading();
}

// Форматирование размера файла
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' Б';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' КБ';
    return (bytes / (1024 * 1024)).toFixed(1) + ' МБ';
}

// Загрузка на Firebase
function uploadToFirebase(file) {
    const storageRef = storage.ref();
    const timestamp = Date.now();
    const fileRef = storageRef.child(`books/${timestamp}_${file.name}`);
    
    showNotification('Загрузка файла на сервер...', 'info');
    
    fileRef.put(file)
        .then(() => {
            showNotification('Книга успешно загружена', 'success');
        })
        .catch((error) => {
            console.error('Ошибка загрузки:', error);
            showNotification('Книга загружена локально (ошибка Firebase)', 'warning');
        });
}

// Начало чтения
function startReading() {
    // Скрыть главную секцию, показать читалку
    document.querySelector('.hero-section').style.display = 'none';
    document.querySelector('.features-section').style.display = 'none';
    elements.readerSection.style.display = 'block';
    
    // Скрыть плейсхолдер, показать контент
    elements.readerPlaceholder.style.display = 'none';
    elements.readerContent.style.display = 'block';
    
    // Загрузить книгу
    if (currentBook.type === 'application/pdf' || currentBook.name.endsWith('.pdf')) {
        loadPDF(currentBook);
    } else {
        loadTXT(currentBook);
    }
}

// Загрузка PDF
function loadPDF(file) {
    const fileReader = new FileReader();
    
    fileReader.onload = function(event) {
        const typedarray = new Uint8Array(event.target.result);
        
        pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
            pdfDoc = pdf;
            totalPages = pdf.numPages;
            elements.totalPages.textContent = totalPages;
            elements.fsTotalPages.textContent = totalPages;
            
            renderPage(1);
            updateProgress();
        }).catch(function(error) {
            console.error('Ошибка загрузки PDF:', error);
            showNotification('Ошибка загрузки PDF файла', 'error');
            elements.readerContent.innerHTML = '<p class="text-center">Ошибка загрузки PDF файла</p>';
        });
    };
    
    fileReader.readAsArrayBuffer(file);
}

// Загрузка TXT
function loadTXT(file) {
    const fileReader = new FileReader();
    
    fileReader.onload = function(event) {
        bookContent = event.target.result;
        totalPages = Math.ceil(bookContent.length / 3000);
        elements.totalPages.textContent = totalPages;
        elements.fsTotalPages.textContent = totalPages;
        
        renderTextPage(1);
        updateProgress();
    };
    
    fileReader.readAsText(file, 'UTF-8');
}

// Рендеринг страницы PDF
function renderPage(pageNum) {
    if (!pdfDoc || pageNum < 1 || pageNum > totalPages) return;
    
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
        
        // Для полного экрана
        if (isFullscreen) {
            elements.fullscreenContent.innerHTML = '';
            const fullscreenCanvas = canvas.cloneNode(true);
            elements.fullscreenContent.appendChild(fullscreenCanvas);
            page.render({ ...renderContext, canvasContext: fullscreenCanvas.getContext('2d') });
        }
        
        currentPage = pageNum;
        updatePageDisplay();
    });
}

// Рендеринг текстовой страницы
function renderTextPage(pageNum) {
    if (!bookContent || pageNum < 1 || pageNum > totalPages) return;
    
    const charsPerPage = 3000;
    const start = (pageNum - 1) * charsPerPage;
    const end = Math.min(start + charsPerPage, bookContent.length);
    const pageContent = bookContent.substring(start, end);
    
    // Форматирование кода (простой вариант)
    let formattedContent = pageContent
        .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'txt-content fade-in';
    contentDiv.innerHTML = formattedContent;
    contentDiv.style.fontSize = (16 * zoomLevel) + 'px';
    
    elements.readerContent.innerHTML = '';
    elements.readerContent.appendChild(contentDiv);
    
    // Для полного экрана
    if (isFullscreen) {
        elements.fullscreenContent.innerHTML = '';
        const fullscreenContent = contentDiv.cloneNode(true);
        fullscreenContent.style.fontSize = (18 * zoomLevel) + 'px';
        elements.fullscreenContent.appendChild(fullscreenContent);
    }
    
    currentPage = pageNum;
    updatePageDisplay();
}

// Обновление отображения страницы
function updatePageDisplay() {
    elements.currentPage.textContent = currentPage;
    elements.fsCurrentPage.textContent = currentPage;
    updateProgress();
}

// Обновление прогресса
function updateProgress() {
    const progress = (currentPage / totalPages) * 100;
    elements.progressBar.style.width = `${progress}%`;
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
    
    // Анимация перехода
    elements.readerContent.classList.remove('fade-in');
    void elements.readerContent.offsetWidth; // Триггер рефлоу
    elements.readerContent.classList.add('fade-in');
}

// Навигация с клавиатуры
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
            case '-':
                e.preventDefault();
                adjustZoom(-0.1);
                break;
            case '+':
            case '=':
                e.preventDefault();
                adjustZoom(0.1);
                break;
            case 'Escape':
                if (isFullscreen) exitFullscreen();
                break;
            case 'F11':
                e.preventDefault();
                if (!isFullscreen) enterFullscreen();
                break;
        }
    }
}

// Изменение масштаба
function adjustZoom(delta) {
    zoomLevel = Math.max(0.5, Math.min(2, zoomLevel + delta));
    elements.zoomLevel.textContent = Math.round(zoomLevel * 100) + '%';
    
    if (pdfDoc) {
        renderPage(currentPage);
    } else if (bookContent) {
        renderTextPage(currentPage);
    }
}

// Вход в полноэкранный режим
function enterFullscreen() {
    isFullscreen = true;
    elements.fullscreenModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Обновить контент
    if (pdfDoc) {
        renderPage(currentPage);
    } else if (bookContent) {
        renderTextPage(currentPage);
    }
    
    // Адаптивная навигация для мобильных
    if (window.innerWidth <= 768) {
        elements.prevPageFull.style.opacity = '0.3';
        elements.nextPageFull.style.opacity = '0.3';
        
        setTimeout(() => {
            elements.prevPageFull.style.opacity = '0.1';
            elements.nextPageFull.style.opacity = '0.1';
        }, 3000);
        
        elements.fullscreenModal.addEventListener('touchstart', () => {
            elements.prevPageFull.style.opacity = '0.3';
            elements.nextPageFull.style.opacity = '0.3';
            
            setTimeout(() => {
                elements.prevPageFull.style.opacity = '0.1';
                elements.nextPageFull.style.opacity = '0.1';
            }, 2000);
        });
    }
    
    showNotification('Режим полного экрана. Используйте стрелки для навигации.', 'info');
}

// Выход из полноэкранного режима
function exitFullscreen() {
    isFullscreen = false;
    elements.fullscreenModal.style.display = 'none';
    document.body.style.overflow = '';
}

// Закрытие читалки
function closeReader() {
    elements.readerSection.style.display = 'none';
    document.querySelector('.hero-section').style.display = '';
    document.querySelector('.features-section').style.display = '';
    
    elements.readerPlaceholder.style.display = 'flex';
    elements.readerContent.style.display = 'none';
    elements.readerContent.innerHTML = '';
    
    // Сброс состояния
    currentBook = null;
    pdfDoc = null;
    bookContent = '';
    currentPage = 1;
    zoomLevel = 1;
    elements.zoomLevel.textContent = '100%';
    elements.fileInput.value = '';
}

// Показать уведомление
function showNotification(message, type = 'info') {
    elements.notification.textContent = message;
    elements.notification.className = 'notification';
    
    // Цвет в зависимости от типа
    if (type === 'error') {
        elements.notification.style.borderLeftColor = 'var(--color-error)';
    } else if (type === 'success') {
        elements.notification.style.borderLeftColor = 'var(--color-success)';
    } else if (type === 'warning') {
        elements.notification.style.borderLeftColor = '#f39c12';
    } else {
        elements.notification.style.borderLeftColor = 'var(--color-primary)';
    }
    
    elements.notification.classList.add('show');
    
    // Автоматическое скрытие
    setTimeout(() => {
        elements.notification.classList.remove('show');
    }, 3000);
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', init);
