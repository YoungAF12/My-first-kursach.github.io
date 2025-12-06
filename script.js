// Основные переменные
let currentFontSize = 16;
let pdfDoc = null;
let currentPage = 1;

// Установка PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Загрузка книги
function loadBook() {
    document.getElementById('file-input').click();
}

document.getElementById('file-input').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const ext = file.name.split('.').pop().toLowerCase();
    
    if (ext === 'txt') {
        loadTxtFile(file);
    } else if (ext === 'pdf') {
        loadPdfFile(file);
    } else {
        alert('Выберите файл .txt или .pdf');
    }
});

// Загрузка TXT файла
function loadTxtFile(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const content = e.target.result;
        document.getElementById('welcome-screen').style.display = 'none';
        document.getElementById('book-content').style.display = 'block';
        document.getElementById('pdf-viewer').style.display = 'none';
        
        document.getElementById('book-content').innerHTML = `
            <h3>${file.name}</h3>
            <pre>${escapeHtml(content)}</pre>
        `;
        document.getElementById('book-content').style.fontSize = currentFontSize + 'px';
    };
    
    reader.readAsText(file);
}

// Загрузка PDF файла
function loadPdfFile(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const typedarray = new Uint8Array(e.target.result);
        
        pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
            pdfDoc = pdf;
            currentPage = 1;
            
            document.getElementById('welcome-screen').style.display = 'none';
            document.getElementById('book-content').style.display = 'none';
            document.getElementById('pdf-viewer').style.display = 'block';
            
            renderPage(currentPage);
        });
    };
    
    reader.readAsArrayBuffer(file);
}

// Отображение страницы PDF
function renderPage(pageNum) {
    pdfDoc.getPage(pageNum).then(function(page) {
        const scale = 1.5;
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

// Функции управления
function toggleTheme() {
    document.body.classList.toggle('dark');
}

function increaseFont() {
    currentFontSize += 2;
    document.getElementById('book-content').style.fontSize = currentFontSize + 'px';
}

function decreaseFont() {
    if (currentFontSize > 12) {
        currentFontSize -= 2;
        document.getElementById('book-content').style.fontSize = currentFontSize + 'px';
    }
}

// Вспомогательная функция
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
