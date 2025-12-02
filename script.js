// Глобальные переменные для PDF
let pdfDoc = null;
let currentPage = 1;
let totalPages = 1;
let fontSize = 16;

// Устанавливаем worker для pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Загрузка файла
    document.getElementById('file-input').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const fileExtension = file.name.split('.').pop().toLowerCase();
        
        if (fileExtension === 'txt') {
            loadTxtFile(file);
        } else if (fileExtension === 'pdf') {
            loadPdfFile(file);
        } else {
            alert('Пожалуйста, выберите файл в формате .txt или .pdf');
        }
    });
});

// Загрузка текстового файла
function loadTxtFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        const bookContent = document.getElementById('book-content');
        bookContent.innerHTML = '<pre>' + escapeHtml(content) + '</pre>';
        bookContent.style.display = 'block';
        bookContent.style.fontSize = fontSize + 'px';
        
        // Скрываем PDF viewer
        document.getElementById('pdf-viewer').style.display = 'none';
        document.getElementById('pdf-controls').style.display = 'none';
        
        // Подсветка синтаксиса для кода в тексте
        setTimeout(() => {
            document.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
        }, 100);
        
        // Добавляем в закладки
        addBookmark(file.name);
    };
    reader.readAsText(file);
}

// Загрузка PDF файла
function loadPdfFile(file) {
    const pdfViewer = document.getElementById('pdf-viewer');
    const bookContent = document.getElementById('book-content');
    const pdfControls = document.getElementById('pdf-controls');
    
    // Показываем PDF viewer, скрываем текстовый контент
    bookContent.style.display = 'none';
    pdfViewer.style.display = 'block';
    pdfControls.style.display = 'flex';
    
    // Показываем загрузку
    pdfViewer.innerHTML = '<p>Загрузка PDF...</p>';
    
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
            
            // Добавляем в закладки
            addBookmark(file.name + ' (стр. 1)');
            
        }).catch(function(error) {
            console.error('Ошибка при загрузке PDF:', error);
            pdfViewer.innerHTML = '<p style="color: red;">Ошибка при загрузке PDF файла</p>';
            alert('Ошибка при загрузке PDF файла. Убедитесь, что файл не поврежден.');
        });
    };
    fileReader.readAsArrayBuffer(file);
}

// Рендеринг страницы PDF
function renderPage(pageNum) {
    if (!pdfDoc) return;
    
    pdfDoc.getPage(pageNum).then(function(page) {
        const scale = 1.8;
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
            pdfViewer.innerHTML = '';
            pdfViewer.appendChild(canvas);
            
            updatePageInfo();
            
            // Добавляем закладку для текущей страницы
            const currentFile = document.getElementById('file-input').files[0];
            if (currentFile) {
                updateCurrentBookmark(currentFile.name + ' (стр. ' + pageNum + ')');
            }
        });
    }).catch(function(error) {
        console.error('Ошибка при рендеринге страницы:', error);
        document.getElementById('pdf-viewer').innerHTML = '<p style="color: red;">Ошибка при отображении страницы</p>';
    });
}

// Навигация по PDF
function prevPage() {
    if (currentPage <= 1) return;
    currentPage--;
    renderPage(currentPage);
}

function nextPage() {
    if (currentPage >= totalPages) return;
    currentPage++;
    renderPage(currentPage);
}

function goToPage(pageNum) {
    const page = parseInt(pageNum);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        renderPage(currentPage);
    }
}

function updatePageInfo() {
    document.getElementById('page-info').textContent = `Страница: ${currentPage}/${totalPages}`;
    document.getElementById('page-slider').value = currentPage;
}

// Экранирование HTML для безопасности
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Тема
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// Загрузка темы из localStorage
function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    }
}

// Размер шрифта
function increaseFont() {
    fontSize += 1;
    document.getElementById('book-content').style.fontSize = fontSize + 'px';
    localStorage.setItem('fontSize', fontSize);
}

function decreaseFont() {
    if (fontSize > 12) {
        fontSize -= 1;
        document.getElementById('book-content').style.fontSize = fontSize + 'px';
        localStorage.setItem('fontSize', fontSize);
    }
}

// Загрузка размера шрифта из localStorage
function loadFontSize() {
    const savedSize = localStorage.getItem('fontSize');
    if (savedSize) {
        fontSize = parseInt(savedSize);
        document.getElementById('book-content').style.fontSize = fontSize + 'px';
    }
}

// Добавление закладок
function addBookmark(name) {
    const bookmarksList = document.getElementById('bookmarks-list');
    const bookmark = document.createElement('li');
    bookmark.textContent = name;
    bookmark.onclick = function() {
        alert('Закладка: ' + name);
    };
    bookmarksList.appendChild(bookmark);
}

function updateCurrentBookmark(name) {
    const bookmarksList = document.getElementById('bookmarks-list');
    const items = bookmarksList.getElementsByTagName('li');
    if (items.length > 0) {
        items[items.length - 1].textContent = name;
    }
}

// Инициализация при загрузке
loadTheme();
loadFontSize();