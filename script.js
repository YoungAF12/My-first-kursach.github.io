// Основной скрипт приложения
document.addEventListener('DOMContentLoaded', function() {
    // Элементы DOM
    const themeToggle = document.getElementById('themeToggle');
    const bookUpload = document.getElementById('bookUpload');
    const welcomeUpload = document.getElementById('welcomeUpload');
    const booksList = document.getElementById('booksList');
    const bookCount = document.getElementById('bookCount');
    const currentBookTitle = document.getElementById('currentBookTitle');
    const fullscreenToggle = document.getElementById('fullscreenToggle');
    const closeBookBtn = document.getElementById('closeBook');
    const pdfViewer = document.getElementById('pdfViewer');
    const txtViewer = document.getElementById('txtViewer');
    const welcomeScreen = document.getElementById('welcomeScreen');
    const loadingIndicator = document.getElementById('loadingIndicator');
    
    // Элементы для PDF
    const pdfCanvas = document.getElementById('pdfCanvas');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const currentPageSpan = document.getElementById('currentPage');
    const totalPagesSpan = document.getElementById('totalPages');
    
    // Элементы для TXT
    const txtContent = document.getElementById('txtContent');
    const prevTxtPageBtn = document.getElementById('prevTxtPage');
    const nextTxtPageBtn = document.getElementById('nextTxtPage');
    const currentTxtPageSpan = document.getElementById('currentTxtPage');
    const totalTxtPagesSpan = document.getElementById('totalTxtPages');
    
    // Переменные состояния
    let currentBook = null;
    let currentBookType = null; // 'pdf' или 'txt'
    let pdfDoc = null;
    let pageNum = 1;
    let pageRendering = false;
    let pageNumPending = null;
    let txtPages = [];
    let currentTxtPage = 1;
    let books = JSON.parse(localStorage.getItem('it-library-books')) || [];
    
    // Инициализация приложения
    initApp();
    
    // Инициализация приложения
    function initApp() {
        updateBookCount();
        renderBooksList();
        setupEventListeners();
        setupKeyboardNavigation();
        
        // Проверяем, есть ли сохраненная тема
        const savedTheme = localStorage.getItem('it-library-theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
        
        // Отображаем количество книг
        updateBookCount();
    }
    
    // Настройка обработчиков событий
    function setupEventListeners() {
        // Переключение темы
        themeToggle.addEventListener('click', toggleTheme);
        
        // Загрузка книг
        bookUpload.addEventListener('change', handleBookUpload);
        welcomeUpload.addEventListener('change', handleBookUpload);
        
        // Переключение полноэкранного режима
        fullscreenToggle.addEventListener('click', toggleFullscreen);
        
        // Закрытие книги
        closeBookBtn.addEventListener('click', closeBook);
        
        // Навигация по PDF
        prevPageBtn.addEventListener('click', prevPage);
        nextPageBtn.addEventListener('click', nextPage);
        
        // Навигация по TXT
        prevTxtPageBtn.addEventListener('click', prevTxtPage);
        nextTxtPageBtn.addEventListener('click', nextTxtPage);
        
        // Обработка выхода из полноэкранного режима
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    }
    
    // Настройка навигации с клавиатуры
    function setupKeyboardNavigation() {
        document.addEventListener('keydown', function(e) {
            // Игнорируем клавиши, если пользователь вводит текст
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            switch(e.key) {
                case 'ArrowLeft':
                    if (currentBookType === 'pdf') prevPage();
                    else if (currentBookType === 'txt') prevTxtPage();
                    break;
                case 'ArrowRight':
                    if (currentBookType === 'pdf') nextPage();
                    else if (currentBookType === 'txt') nextTxtPage();
                    break;
                case 'Escape':
                    if (document.fullscreenElement) exitFullscreen();
                    break;
            }
        });
    }
    
    // Переключение темы
    function toggleTheme() {
        if (document.body.classList.contains('dark-theme')) {
            document.body.classList.remove('dark-theme');
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            localStorage.setItem('it-library-theme', 'light');
        } else {
            document.body.classList.add('dark-theme');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            localStorage.setItem('it-library-theme', 'dark');
        }
    }
    
    // Обработка загрузки книги
    async function handleBookUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        // Проверяем формат файла
        const fileType = file.type;
        const fileName = file.name;
        const fileExt = fileName.split('.').pop().toLowerCase();
        
        if (fileExt !== 'pdf' && fileExt !== 'txt') {
            showNotification('Пожалуйста, загрузите файл в формате PDF или TXT', 'error');
            return;
        }
        
        // Показываем индикатор загрузки
        showLoading(true);
        
        try {
            // Создаем уникальное имя файла
            const timestamp = Date.now();
            const uniqueFileName = `${timestamp}_${fileName}`;
            
            // Загружаем файл в Firebase Storage
            const storageRef = storage.ref();
            const fileRef = storageRef.child(`books/${uniqueFileName}`);
            await fileRef.put(file);
            
            // Получаем URL для скачивания
            const downloadURL = await fileRef.getDownloadURL();
            
            // Создаем объект книги
            const book = {
                id: timestamp,
                name: fileName,
                type: fileExt,
                url: downloadURL,
                uploadedAt: new Date().toISOString()
            };
            
            // Добавляем книгу в список
            books.push(book);
            localStorage.setItem('it-library-books', JSON.stringify(books));
            
            // Обновляем интерфейс
            updateBookCount();
            renderBooksList();
            
            // Загружаем книгу для чтения
            await loadBook(book);
            
            showNotification(`Книга "${fileName}" успешно загружена`, 'success');
        } catch (error) {
            console.error('Ошибка при загрузке книги:', error);
            showNotification('Ошибка при загрузке книги', 'error');
        } finally {
            showLoading(false);
            // Сбрасываем значение input
            e.target.value = '';
        }
    }
    
    // Загрузка книги для чтения
    async function loadBook(book) {
        currentBook = book;
        currentBookTitle.textContent = book.name;
        closeBookBtn.style.display = 'flex';
        
        // Скрываем экран приветствия
        welcomeScreen.style.display = 'none';
        
        if (book.type === 'pdf') {
            currentBookType = 'pdf';
            txtViewer.style.display = 'none';
            pdfViewer.style.display = 'flex';
            
            // Загружаем PDF
            await loadPDF(book.url);
        } else if (book.type === 'txt') {
            currentBookType = 'txt';
            pdfViewer.style.display = 'none';
            txtViewer.style.display = 'flex';
            
            // Загружаем TXT
            await loadTXT(book.url);
        }
        
        // Обновляем активную книгу в списке
        updateActiveBookInList(book.id);
        
        // Показываем стрелки навигации для мобильных устройств
        setupMobileNavigation();
    }
    
    // Загрузка PDF
    async function loadPDF(url) {
        try {
            // Загружаем PDF с помощью PDF.js
            const loadingTask = pdfjsLib.getDocument(url);
            pdfDoc = await loadingTask.promise;
            
            // Обновляем информацию о страницах
            totalPagesSpan.textContent = pdfDoc.numPages;
            
            // Рендерим первую страницу
            pageNum = 1;
            renderPDFPage(pageNum);
        } catch (error) {
            console.error('Ошибка при загрузке PDF:', error);
            showNotification('Ошибка при загрузке PDF файла', 'error');
        }
    }
    
    // Рендеринг страницы PDF
    async function renderPDFPage(num) {
        pageRendering = true;
        
        try {
            const page = await pdfDoc.getPage(num);
            const context = pdfCanvas.getContext('2d');
            
            // Устанавливаем размер canvas в зависимости от размера контейнера
            const container = pdfCanvas.parentElement;
            const scale = Math.min(container.clientWidth / page.getViewport({scale: 1}).width, 1.5);
            const viewport = page.getViewport({scale});
            
            pdfCanvas.height =
