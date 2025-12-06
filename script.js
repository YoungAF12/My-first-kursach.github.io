// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
let pdfDoc = null;
let currentPage = 1;
let totalPages = 1;
let fontSize = 18;
let currentBook = null;
let currentBookName = '';
let currentBookType = '';

// ==================== ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('📚 IT Books Reader загружен');
    
    // Настраиваем загрузку файлов
    document.getElementById('file-input').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        handleFileUpload(file);
    });
    
    // Загружаем сохраненные настройки и закладки
    loadLocalSettings();
    loadBookmarks();
    
    // Инициализируем PDF.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
});

// ==================== ОБРАБОТКА ЗАГРУЗКИ ФАЙЛОВ ====================
function handleFileUpload(file) {
    if (!file) {
        showNotification('❌ Файл не выбран', 'error');
        return;
    }
    
    currentBook = file;
    currentBookName = file.name;
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    // Скрываем приветственный экран
    document.getElementById('welcome-content').style.display = 'none';
    
    // Обновляем информацию о текущей книге
    updateCurrentBookInfo(file);
    
    if (fileExtension === 'txt') {
        loadTxtFile(file);
    } else if (fileExtension === 'pdf') {
        loadPdfFile(file);
    } else {
        showNotification('❌ Выберите файл в формате .txt или .pdf', 'error');
        // Показываем приветственный экран обратно
        document.getElementById('welcome-content').style.display = 'block';
    }
}

function updateCurrentBookInfo(file) {
    const fileSize = formatFileSize(file.size);
    const fileType = file.type || getFileType(file.name);
    const uploadDate = new Date().toLocaleString('ru-RU');
    
    document.getElementById('current-book-info').innerHTML = `
        <div class="book-details">
            <div class="book-title">📖 ${file.name}</div>
            <div class="book-meta">
                <span>📊 Размер: ${fileSize}</span>
                <span>📄 Тип: ${fileType}</span>
                <span>📅 Загружено: ${uploadDate}</span>
            </div>
        </div>
    `;
}

function getFileType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    return ext === 'txt' ? 'Текстовый файл' : 'PDF документ';
}

// ==================== ЗАГРУЗКА TXT ФАЙЛОВ ====================
function loadTxtFile(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const content = e.target.result;
        const bookContent = document.getElementById('book-content');
        
        // Очищаем контент и показываем
        bookContent.innerHTML = '';
        bookContent.style.display = 'block';
        bookContent.style.fontSize = fontSize + 'px';
        
        // Создаем предформатированный текст с кодом
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        
        // Экранируем HTML для безопасности
        code.textContent = escapeHtml(content);
        pre.appendChild(code);
        bookContent.appendChild(pre);
        
        // Скрываем PDF viewer
        document.getElementById('pdf-viewer').style.display = 'none';
        document.getElementById('pdf-controls').style.display = 'none';
        
        // Подсветка синтаксиса
        setTimeout(() => {
            hljs.highlightElement(code);
            
            // Добавляем обработчики для выделения текста
            setupTextSelection();
        }, 100);
        
        // Автоматически добавляем первую закладку
        addBookmark(`📄 Начало книги: ${file.name}`);
        
        showNotification(`✅ Книга "${file.name}" загружена`, 'success');
    };
    
    reader.onerror = function() {
        showNotification('❌ Ошибка чтения файла', 'error');
        document.getElementById('welcome-content').style.display = 'block';
    };
    
    reader.readAsText(file);
}

// ==================== ЗАГРУЗКА PDF ФАЙЛОВ ====================
function loadPdfFile(file) {
    const pdfViewer = document.getElementById('pdf-viewer');
    const bookContent = document.getElementById('book-content');
    const pdfControls = document.getElementById('pdf-controls');
    
    // Показываем PDF viewer, скрываем текстовый контент
    bookContent.style.display = 'none';
    pdfViewer.style.display = 'block';
    pdfControls.style.display = 'flex';
    
    // Показываем индикатор загрузки
    pdfViewer.innerHTML = `
        <div class="pdf-loading">
            <div class="spinner"></div>
            <p>📚 Загрузка PDF файла...</p>
        </div>
    `;
    
    const fileReader = new FileReader();
    
    fileReader.onload = function() {
        const typedarray = new Uint8Array(this.result);
        
        pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
            pdfDoc = pdf;
            totalPages = pdf.numPages;
            currentPage = 1;
            
            // Обновляем элементы управления
            const pageSlider = document.getElementById('page-slider');
            pageSlider.max = totalPages;
            pageSlider.value = 1;
            
            updatePageInfo();
            
            // Загружаем первую страницу
            renderPage(currentPage);
            
            // Добавляем первую закладку
            addBookmark(`📕 Начало книги: ${file.name}`);
            
            showNotification(`✅ PDF книга "${file.name}" загружена`, 'success');
            
        }).catch(function(error) {
            console.error('Ошибка загрузки PDF:', error);
            pdfViewer.innerHTML = `
                <div class="pdf-error">
                    <span style="font-size: 48px;">❌</span>
                    <h3>Ошибка загрузки PDF</h3>
                    <p>Файл поврежден или имеет неверный формат</p>
                    <button onclick="document.getElementById('welcome-content').style.display='block'; pdfViewer.style.display='none'">
                        Вернуться к выбору книги
                    </button>
                </div>
            `;
            showNotification('❌ Ошибка загрузки PDF файла', 'error');
        });
    };
    
    fileReader.onerror = function() {
        showNotification('❌ Ошибка чтения файла', 'error');
        document.getElementById('welcome-content').style.display = 'block';
    };
    
    fileReader.readAsArrayBuffer(file);
}

// ==================== РЕНДЕРИНГ СТРАНИЦ PDF ====================
function renderPage(pageNum) {
    if (!pdfDoc) return;
    
    pdfDoc.getPage(pageNum).then(function(page) {
        const scale = 2.0;
        const viewport = page.getViewport({ scale: scale });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Настройки рендеринга для лучшего качества
        const renderContext = {
            canvasContext: context,
            viewport: viewport,
            enableWebGL: true,
            renderInteractiveForms: false
        };
        
        page.render(renderContext).promise.then(function() {
            const pdfViewer = document.getElementById('pdf-viewer');
            
            // Создаем контейнер для страницы
            const pageContainer = document.createElement('div');
            pageContainer.className = 'pdf-page-container';
            pageContainer.style.position = 'relative';
            pageContainer.style.margin = '0 auto';
            pageContainer.style.maxWidth = '100%';
            
            // Добавляем номер страницы
            const pageNumber = document.createElement('div');
            pageNumber.className = 'pdf-page-number';
            pageNumber.textContent = `Страница ${pageNum} из ${totalPages}`;
            pageNumber.style.cssText = `
                position: absolute;
                bottom: 20px;
                right: 20px;
                background: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 600;
            `;
            
            canvas.style.cssText = `
                width: 100%;
                height: auto;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                border-radius: 16px;
                display: block;
                border: 2px solid #e2e8f0;
                transition: all 0.3s ease;
            `;
            
            body.dark-theme && (canvas.style.borderColor = '#475569');
            
            pageContainer.appendChild(canvas);
            pageContainer.appendChild(pageNumber);
            pdfViewer.innerHTML = '';
            pdfViewer.appendChild(pageContainer);
            
            updatePageInfo();
            
            // Добавляем эффект загрузки
            canvas.style.opacity = '0';
            setTimeout(() => {
                canvas.style.opacity = '1';
                canvas.style.transform = 'translateY(0)';
            }, 50);
            
        }).catch(function(error) {
            console.error('Ошибка рендеринга страницы:', error);
            document.getElementById('pdf-viewer').innerHTML = `
                <div class="pdf-error">
                    <span style="font-size: 48px;">⚠️</span>
                    <h3>Ошибка отображения страницы</h3>
                    <button onclick="renderPage(${pageNum})">Попробовать снова</button>
                </div>
            `;
        });
    }).catch(function(error) {
        console.error('Ошибка получения страницы:', error);
    });
}

// ==================== НАВИГАЦИЯ ПО PDF ====================
function prevPage() {
    if (currentPage <= 1) return;
    currentPage--;
    renderPage(currentPage);
    addBookmark(`📕 ${currentBookName} - Страница ${currentPage}`);
}

function nextPage() {
    if (currentPage >= totalPages) return;
    currentPage++;
    renderPage(currentPage);
    addBookmark(`📕 ${currentBookName} - Страница ${currentPage}`);
}

function goToPage(pageNum) {
    const page = parseInt(pageNum);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        renderPage(currentPage);
        addBookmark(`📕 ${currentBookName} - Страница ${currentPage}`);
    }
}

function updatePageInfo() {
    document.getElementById('page-info').textContent = `Страница: ${currentPage}/${totalPages}`;
    document.getElementById('page-slider').value = currentPage;
}

// ==================== СИСТЕМА ЗАКЛАДОК ====================
function addBookmark(text) {
    let bookmarkText = text;
    
    if (!bookmarkText) {
        if (currentBookType === 'pdf') {
            bookmarkText = prompt('Введите название закладки для текущей страницы:', 
                                 `${currentBookName} - Страница ${currentPage}`);
        } else {
            // Получаем выделенный текст
            const selectedText = getSelectedText();
            if (selectedText && selectedText.length > 0 && selectedText.length < 100) {
                bookmarkText = prompt('Введите название закладки (или используйте выделенный текст):', 
                                     `🔖 ${selectedText.substring(0, 50)}...`);
            } else {
                bookmarkText = prompt('Введите название закладки:', 
                                     `📖 ${currentBookName}`);
            }
        }
        
        if (!bookmarkText) return;
    }
    
    // Скрываем пустое состояние
    document.getElementById('bookmarks-empty').style.display = 'none';
    document.getElementById('bookmarks-list').classList.add('show');
    
    const bookmarksList = document.getElementById('bookmarks-list');
    const timestamp = new Date().toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    const bookmark = document.createElement('li');
    bookmark.innerHTML = `
        <div class="bookmark-content">
            <div class="bookmark-text">${bookmarkText}</div>
            <div class="bookmark-time">${timestamp}</div>
        </div>
        <button class="delete-bookmark" title="Удалить закладку">×</button>
    `;
    
    // Обработчик клика по закладке
    bookmark.onclick = function(e) {
        if (!e.target.classList.contains('delete-bookmark')) {
            showNotification(`📍 Закладка: ${bookmarkText}`, 'info');
            
            // Если это PDF и закладка содержит номер страницы
            const pageMatch = bookmarkText.match(/Страница (\d+)/);
            if (pageMatch && currentBookType === 'pdf') {
                const pageNum = parseInt(pageMatch[1]);
                if (pageNum >= 1 && pageNum <= totalPages) {
                    goToPage(pageNum);
                }
            }
        }
    };
    
    // Обработчик удаления закладки
    const deleteBtn = bookmark.querySelector('.delete-bookmark');
    deleteBtn.onclick = function(e) {
        e.stopPropagation();
        bookmark.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            bookmark.remove();
            saveBookmarks();
            
            // Если закладок не осталось, показываем пустое состояние
            if (bookmarksList.children.length === 0) {
                document.getElementById('bookmarks-empty').style.display = 'block';
                document.getElementById('bookmarks-list').classList.remove('show');
            }
        }, 300);
        
        showNotification('🗑️ Закладка удалена', 'info');
    };
    
    bookmarksList.appendChild(bookmark);
    saveBookmarks();
    showNotification('🔖 Закладка добавлена', 'success');
    
    // Анимация добавления
    bookmark.style.animation = 'slideInRight 0.4s ease-out';
}

function getSelectedText() {
    if (window.getSelection) {
        return window.getSelection().toString();
    } else if (document.selection && document.selection.type != "Control") {
        return document.selection.createRange().text;
    }
    return '';
}

function setupTextSelection() {
    const bookContent = document.getElementById('book-content');
    bookContent.addEventListener('mouseup', function() {
        const selectedText = getSelectedText();
        if (selectedText && selectedText.length > 0) {
            // Можно добавить контекстное меню для быстрого добавления закладки
            // Пока просто показываем уведомление
            if (selectedText.length < 100) {
                showNotification(`📝 Выделен текст: "${selectedText}"`, 'info');
            }
        }
    });
}

function saveBookmarks() {
    const bookmarksList = document.getElementById('bookmarks-list');
    const bookmarks = [];
    
    Array.from(bookmarksList.children).forEach(li => {
        const text = li.querySelector('.bookmark-text').textContent;
        const time = li.querySelector('.bookmark-time').textContent;
        bookmarks.push({ text, time });
    });
    
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
    console.log('💾 Закладки сохранены:', bookmarks.length);
}

function loadBookmarks() {
    const savedBookmarks = localStorage.getItem('bookmarks');
    if (savedBookmarks) {
        try {
            const bookmarks = JSON.parse(savedBookmarks);
            const bookmarksList = document.getElementById('bookmarks-list');
            
            if (bookmarks.length > 0) {
                document.getElementById('bookmarks-empty').style.display = 'none';
                bookmarksList.classList.add('show');
                
                bookmarks.forEach(bm => {
                    const bookmark = document.createElement('li');
                    bookmark.innerHTML = `
                        <div class="bookmark-content">
                            <div class="bookmark-text">${bm.text}</div>
                            <div class="bookmark-time">${bm.time}</div>
                        </div>
                        <button class="delete-bookmark" title="Удалить закладку">×</button>
                    `;
                    
                    bookmark.onclick = function(e) {
                        if (!e.target.classList.contains('delete-bookmark')) {
                            showNotification(`📍 Закладка: ${bm.text}`, 'info');
                        }
                    };
                    
                    const deleteBtn = bookmark.querySelector('.delete-bookmark');
                    deleteBtn.onclick = function(e) {
                        e.stopPropagation();
                        bookmark.style.animation = 'fadeOut 0.3s ease';
                        setTimeout(() => {
                            bookmark.remove();
                            saveBookmarks();
                            if (bookmarksList.children.length === 0) {
                                document.getElementById('bookmarks-empty').style.display = 'block';
                                bookmarksList.classList.remove('show');
                            }
                        }, 300);
                        showNotification('🗑️ Закладка удалена', 'info');
                    };
                    
                    bookmarksList.appendChild(bookmark);
                });
                
                console.log('📖 Загружено закладок:', bookmarks.length);
            }
        } catch (error) {
            console.error('Ошибка загрузки закладок:', error);
            localStorage.removeItem('bookmarks');
        }
    }
}

function exportBookmarks() {
    const savedBookmarks = localStorage.getItem('bookmarks');
    if (!savedBookmarks || JSON.parse(savedBookmarks).length === 0) {
        showNotification('📭 Нет закладок для экспорта', 'warning');
        return;
    }
    
    const bookmarks = JSON.parse(savedBookmarks);
    let exportText = '📚 Закладки из IT Books Reader\n';
    exportText += '================================\n\n';
    
    bookmarks.forEach((bm, index) => {
        exportText += `${index + 1}. ${bm.text}\n`;
        exportText += `   Время: ${bm.time}\n\n`;
    });
    
    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookmarks_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('📥 Закладки экспортированы', 'success');
}

// ==================== НАСТРОЙКИ ИНТЕРФЕЙСА ====================
function toggleTheme() {
    const body = document.body;
    body.classList.toggle('dark-theme');
    
    const isDark = body.classList.contains('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    // Анимация переключения темы
    const reader = document.querySelector('.reader');
    reader.style.transition = 'all 0.5s ease';
    
    showNotification(isDark ? '🌙 Включена темная тема' : '☀️ Включена светлая тема', 'info');
}

function increaseFont() {
    if (fontSize < 30) {
        fontSize += 2;
        updateFontSize();
        showNotification(`🔤 Размер шрифта: ${fontSize}px`, 'info');
    } else {
        showNotification('🔤 Максимальный размер шрифта', 'warning');
    }
}

function decreaseFont() {
    if (fontSize > 12) {
        fontSize -= 2;
        updateFontSize();
        showNotification(`🔤 Размер шрифта: ${fontSize}px`, 'info');
    } else {
        showNotification('🔤 Минимальный размер шрифта', 'warning');
    }
}

function updateFontSize() {
    const bookContent = document.getElementById('book-content');
    bookContent.style.fontSize = fontSize + 'px';
    localStorage.setItem('fontSize', fontSize);
}

function loadLocalSettings() {
    // Загрузка темы
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    }
    
    // Загрузка размера шрифта
    const savedSize = localStorage.getItem('fontSize');
    if (savedSize) {
        fontSize = parseInt(savedSize);
        updateFontSize();
    }
    
    console.log('⚙️ Настройки загружены');
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================
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
    
    // Устанавливаем стили в зависимости от типа
    let bgColor, textColor;
    switch(type) {
        case 'success':
            bgColor = '#10b981';
            textColor = '#ffffff';
            break;
        case 'error':
            bgColor = '#ef4444';
            textColor = '#ffffff';
            break;
        case 'warning':
            bgColor = '#f59e0b';
            textColor = '#ffffff';
            break;
        case 'info':
        default:
            bgColor = '#6366f1';
            textColor = '#ffffff';
            break;
    }
    
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 30px;
        background: ${bgColor};
        color: ${textColor};
        padding: 18px 28px;
        border-radius: 14px;
        box-shadow: 0 12px 35px rgba(0,0,0,0.2);
        z-index: 10000;
        font-weight: 600;
        font-size: 16px;
        max-width: 400px;
        animation: slideInRight 0.3s ease-out;
        display: flex;
        align-items: center;
        gap: 15px;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,0.1);
    `;
    
    // Добавляем иконку
    const iconMap = {
        'success': '✅',
        'error': '❌',
        'warning': '⚠️',
        'info': 'ℹ️'
    };
    
    notification.innerHTML = `${iconMap[type] || 'ℹ️'} ${message}`;
    
    // Автоматическое скрытие
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            notification.style.display = 'none';
        }, 300);
    }, 3000);
}

// Добавляем стили для анимации скрытия
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100px); opacity: 0; }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; transform: scale(1); }
        to { opacity: 0; transform: scale(0.9); }
    }
    
    .pdf-loading {
        text-align: center;
        padding: 60px 30px;
    }
    
    .spinner {
        width: 50px;
        height: 50px;
        border: 4px solid #e2e8f0;
        border-top: 4px solid #6366f1;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 20px;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .pdf-error {
        text-align: center;
        padding: 60px 30px;
        background: #fef2f2;
        border-radius: 16px;
        border: 2px solid #fecaca;
    }
    
    body.dark-theme .pdf-error {
        background: #450a0a;
        border-color: #991b1b;
    }
    
    .bookmark-content {
        flex: 1;
    }
    
    .bookmark-text {
        font-weight: 600;
        margin-bottom: 5px;
        color: #1e293b;
    }
    
    body.dark-theme .bookmark-text {
        color: #f1f5f9;
    }
    
    .bookmark-time {
        font-size: 12px;
        color: #64748b;
    }
    
    body.dark-theme .bookmark-time {
        color: #94a3b8;
    }
    
    .book-details {
        padding: 20px;
        background: #f8fafc;
        border-radius: 12px;
        border: 2px solid #e2e8f0;
    }
    
    body.dark-theme .book-details {
        background: #0f172a;
        border-color: #334155;
    }
    
    .book-title {
        font-size: 18px;
        font-weight: 700;
        color: #1e293b;
        margin-bottom: 10px;
    }
    
    body.dark-theme .book-title {
        color: #f1f5f9;
    }
    
    .book-meta {
        display: flex;
        flex-direction: column;
        gap: 8px;
        font-size: 14px;
        color: #64748b;
    }
    
    body.dark-theme .book-meta {
        color: #94a3b8;
    }
`;
document.head.appendChild(style);

// ==================== ДОПОЛНИТЕЛЬНЫЕ ФУНКЦИИ ====================
function printBook() {
    if (!currentBook) {
        showNotification('📭 Сначала загрузите книгу', 'warning');
        return;
    }
    
    if (currentBookType === 'pdf') {
        showNotification('🖨️ Для печати PDF используйте кнопку печати в навигации', 'info');
        return;
    }
    
    const printContent = document.getElementById('book-content').innerHTML;
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${currentBookName} - IT Books Reader</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
                pre { white-space: pre-wrap; background: #f5f5f5; padding: 20px; border-radius: 5px; }
                h1 { color: #333; }
                .print-info { color: #666; font-size: 12px; margin-bottom: 20px; }
                @media print {
                    body { margin: 0; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <h1>${currentBookName}</h1>
            <div class="print-info">
                Распечатано из IT Books Reader • ${new Date().toLocaleString('ru-RU')}
            </div>
            <div class="content">
                ${printContent}
            </div>
            <div class="no-print" style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                <button onclick="window.print()">🖨️ Печать</button>
                <button onclick="window.close()">✖️ Закрыть</button>
            </div>
        </body>
        </html>
    `);
    
    printWindow.document.close();
}

function clearAll() {
    if (confirm('Вы уверены, что хотите очистить все закладки и сбросить настройки?')) {
        // Очищаем закладки
        localStorage.removeItem('bookmarks');
        document.getElementById('bookmarks-list').innerHTML = '';
        document.getElementById('bookmarks-empty').style.display = 'block';
        document.getElementById('bookmarks-list').classList.remove('show');
        
        // Очищаем текущую книгу
        currentBook = null;
        document.getElementById('current-book-info').innerHTML = '<p>Книга не загружена</p>';
        document.getElementById('welcome-content').style.display = 'block';
        document.getElementById('book-content').style.display = 'none';
        document.getElementById('pdf-viewer').style.display = 'none';
        document.getElementById('pdf-controls').style.display = 'none';
        
        // Сбрасываем тему и шрифт к значениям по умолчанию
        localStorage.removeItem('theme');
        localStorage.removeItem('fontSize');
        document.body.classList.remove('dark-theme');
        fontSize = 18;
        updateFontSize();
        
        showNotification('🗑️ Все данные очищены', 'success');
    }
}

// Определяем тип текущей книги при загрузке файла
document.getElementById('file-input').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        currentBookType = file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'txt';
    }
});

// Инициализируем приложение
console.log('🚀 IT Books Reader запущен в локальном режиме');
