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
            
            pdfCanvas.height = viewport.height;
            pdfCanvas.width = viewport.width;
            
            // Рендерим страницу
            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };
            
            await page.render(renderContext).promise;
            
            // Обновляем номер текущей страницы
            currentPageSpan.textContent = num;
            pageNum = num;
            
            // Обновляем состояние кнопок навигации
            prevPageBtn.disabled = pageNum <= 1;
            nextPageBtn.disabled = pageNum >= pdfDoc.numPages;
        } catch (error) {
            console.error('Ошибка при рендеринге страницы:', error);
        }
        
        pageRendering = false;
        
        if (pageNumPending !== null) {
            renderPDFPage(pageNumPending);
            pageNumPending = null;
        }
    }
    
    // Предыдущая страница PDF
    function prevPage() {
        if (pageNum <= 1) return;
        pageNum--;
        queueRenderPDFPage(pageNum);
    }
    
    // Следующая страница PDF
    function nextPage() {
        if (pageNum >= pdfDoc.numPages) return;
        pageNum++;
        queueRenderPDFPage(pageNum);
    }
    
    // Постановка в очередь рендеринга страницы PDF
    function queueRenderPDFPage(num) {
        if (pageRendering) {
            pageNumPending = num;
        } else {
            renderPDFPage(num);
        }
    }
    
    // Загрузка TXT
    async function loadTXT(url) {
        try {
            const response = await fetch(url);
            const text = await response.text();
            
            // Разбиваем текст на страницы
            txtPages = splitTextIntoPages(text, 1500); // 1500 символов на страницу
            
            // Обновляем информацию о страницах
            totalTxtPagesSpan.textContent = txtPages.length;
            
            // Отображаем первую страницу
            currentTxtPage = 1;
            renderTXTPage(currentTxtPage);
        } catch (error) {
            console.error('Ошибка при загрузке TXT:', error);
            showNotification('Ошибка при загрузке TXT файла', 'error');
        }
    }
    
    // Разбивка текста на страницы
    function splitTextIntoPages(text, charsPerPage) {
        const pages = [];
        let start = 0;
        
        while (start < text.length) {
            let end = start + charsPerPage;
            
            // Если мы не в конце текста, пытаемся закончить на границе предложения
            if (end < text.length) {
                // Ищем ближайший конец предложения
                const sentenceEnd = Math.max(
                    text.lastIndexOf('.', end),
                    text.lastIndexOf('!', end),
                    text.lastIndexOf('?', end),
                    text.lastIndexOf('\n\n', end)
                );
                
                if (sentenceEnd > start + charsPerPage * 0.5) {
                    end = sentenceEnd + 1;
                }
            } else {
                end = text.length;
            }
            
            pages.push(text.substring(start, end));
            start = end;
        }
        
        return pages;
    }
    
    // Рендеринг страницы TXT
    function renderTXTPage(num) {
        if (num < 1 || num > txtPages.length) return;
        
        currentTxtPage = num;
        txtContent.textContent = txtPages[num - 1];
        currentTxtPageSpan.textContent = num;
        
        // Обновляем состояние кнопок навигации
        prevTxtPageBtn.disabled = currentTxtPage <= 1;
        nextTxtPageBtn.disabled = currentTxtPage >= txtPages.length;
    }
    
    // Предыдущая страница TXT
    function prevTxtPage() {
        if (currentTxtPage <= 1) return;
        renderTXTPage(currentTxtPage - 1);
    }
    
    // Следующая страница TXT
    function nextTxtPage() {
        if (currentTxtPage >= txtPages.length) return;
        renderTXTPage(currentTxtPage + 1);
    }
    
    // Закрытие книги
    function closeBook() {
        currentBook = null;
        currentBookType = null;
        currentBookTitle.textContent = 'Выберите книгу для чтения';
        closeBookBtn.style.display = 'none';
        
        // Показываем экран приветствия
        welcomeScreen.style.display = 'flex';
        pdfViewer.style.display = 'none';
        txtViewer.style.display = 'none';
        
        // Сбрасываем активную книгу в списке
        updateActiveBookInList(null);
        
        // Скрываем стрелки навигации для мобильных устройств
        const mobileArrows = document.querySelector('.mobile-nav-arrows');
        if (mobileArrows) mobileArrows.remove();
    }
    
    // Переключение полноэкранного режима
    function toggleFullscreen() {
        const bookViewer = document.getElementById('bookViewer');
        
        if (!document.fullscreenElement) {
            enterFullscreen(bookViewer);
            fullscreenToggle.innerHTML = '<i class="fas fa-compress"></i>';
        } else {
            exitFullscreen();
            fullscreenToggle.innerHTML = '<i class="fas fa-expand"></i>';
        }
    }
    
    // Вход в полноэкранный режим
    function enterFullscreen(element) {
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
        } else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        }
        
        element.classList.add('fullscreen');
        
        // Добавляем стрелки для мобильных устройств в полноэкранном режиме
        setupMobileNavigation();
    }
    
    // Выход из полноэкранного режима
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
        
        const bookViewer = document.getElementById('bookViewer');
        bookViewer.classList.remove('fullscreen');
        fullscreenToggle.innerHTML = '<i class="fas fa-expand"></i>';
    }
    
    // Обработка изменения полноэкранного режима
    function handleFullscreenChange() {
        const bookViewer = document.getElementById('bookViewer');
        
        if (!document.fullscreenElement) {
            bookViewer.classList.remove('fullscreen');
            fullscreenToggle.innerHTML = '<i class="fas fa-expand"></i>';
            
            // Убираем стрелки навигации для мобильных устройств
            const mobileArrows = document.querySelector('.mobile-nav-arrows');
            if (mobileArrows && !bookViewer.classList.contains('fullscreen')) {
                mobileArrows.remove();
            }
        }
    }
    
    // Настройка навигации для мобильных устройств
    function setupMobileNavigation() {
        // Удаляем существующие стрелки, если они есть
        const existingArrows = document.querySelector('.mobile-nav-arrows');
        if (existingArrows) existingArrows.remove();
        
        // Добавляем стрелки только если книга открыта и мы в полноэкранном режиме
        const bookViewer = document.getElementById('bookViewer');
        if (currentBook && bookViewer.classList.contains('fullscreen')) {
            const mobileArrows = document.createElement('div');
            mobileArrows.className = 'mobile-nav-arrows';
            
            mobileArrows.innerHTML = `
                <button id="mobilePrevPage" class="btn-icon" title="Предыдущая страница">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <button id="mobileNextPage" class="btn-icon" title="Следующая страница">
                    <i class="fas fa-chevron-right"></i>
                </button>
            `;
            
            bookViewer.appendChild(mobileArrows);
            
            // Добавляем обработчики событий
            document.getElementById('mobilePrevPage').addEventListener('click', function() {
                if (currentBookType === 'pdf') prevPage();
                else if (currentBookType === 'txt') prevTxtPage();
            });
            
            document.getElementById('mobileNextPage').addEventListener('click', function() {
                if (currentBookType === 'pdf') nextPage();
                else if (currentBookType === 'txt') nextTxtPage();
            });
        }
    }
    
    // Обновление счетчика книг
    function updateBookCount() {
        bookCount.textContent = books.length;
    }
    
    // Отрисовка списка книг
    function renderBooksList() {
        if (books.length === 0) {
            booksList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-books"></i>
                    <p>Загрузите свою первую книгу</p>
                </div>
            `;
            return;
        }
        
        booksList.innerHTML = '';
        
        books.forEach(book => {
            const isActive = currentBook && currentBook.id === book.id;
            const bookElement = document.createElement('div');
            bookElement.className = `book-item ${isActive ? 'active' : ''}`;
            bookElement.dataset.id = book.id;
            
            const icon = book.type === 'pdf' ? 'fas fa-file-pdf' : 'fas fa-file-alt';
            const typeText = book.type === 'pdf' ? 'PDF' : 'TXT';
            
            bookElement.innerHTML = `
                <div class="book-icon">
                    <i class="${icon}"></i>
                </div>
                <div class="book-info">
                    <h3>${book.name}</h3>
                    <p>${typeText} • ${formatDate(book.uploadedAt)}</p>
                </div>
            `;
            
            bookElement.addEventListener('click', () => {
                loadBook(book);
            });
            
            booksList.appendChild(bookElement);
        });
    }
    
    // Обновление активной книги в списке
    function updateActiveBookInList(bookId) {
        const bookItems = document.querySelectorAll('.book-item');
        
        bookItems.forEach(item => {
            if (parseInt(item.dataset.id) === bookId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }
    
    // Показать/скрыть индикатор загрузки
    function showLoading(show) {
        loadingIndicator.style.display = show ? 'flex' : 'none';
    }
    
    // Показать уведомление
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Показываем уведомление
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Убираем уведомление через 3 секунды
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    // Форматирование даты
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }
});
