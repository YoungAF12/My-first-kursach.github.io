// 1. ФУНКЦИЯ ДЛЯ ПРЕОБРАЗОВАНИЯ ССЫЛКИ GOOGLE DRIVE
function getDirectGoogleDriveDownloadUrl(googleDriveUrl) {
    try {
        // Разные форматы Google Drive ссылок:
        // 1. https://drive.google.com/file/d/FILE_ID/view
        // 2. https://drive.google.com/open?id=FILE_ID
        // 3. https://drive.google.com/uc?id=FILE_ID
        
        let fileId = '';
        
        // Извлекаем ID файла разными способами
        if (googleDriveUrl.includes('/d/')) {
            // Формат: /d/FILE_ID/
            const match = googleDriveUrl.match(/\/d\/([^\/]+)/);
            if (match) fileId = match[1];
        } else if (googleDriveUrl.includes('id=')) {
            // Формат: ?id=FILE_ID или &id=FILE_ID
            const match = googleDriveUrl.match(/[\?&]id=([^&]+)/);
            if (match) fileId = match[1];
        }
        
        if (!fileId) return googleDriveUrl; // Возвращаем оригинал, если не нашли ID
        
        // Создаем прямую ссылку для скачивания
        return `https://drive.google.com/uc?export=download&id=${fileId}`;
    } catch (error) {
        console.error('Error parsing Google Drive URL:', error);
        return googleDriveUrl;
    }
}

// 2. АСИНХРОННАЯ ФУНКЦИЯ ДЛЯ СКАЧИВАНИЯ С ПРОВЕРКОЙ
async function downloadBookWithGoogleDrive(bookId) {
    try {
        const book = booksData.find(b => b.id === bookId);
        if (!book) {
            showNotification('Книга не найдена', 'error');
            return;
        }
        
        let downloadUrl = book.fileUrl;
        
        // Проверяем, является ли это ссылкой Google Drive
        const isGoogleDrive = downloadUrl.includes('drive.google.com');
        
        if (isGoogleDrive) {
            // Преобразуем ссылку
            downloadUrl = getDirectGoogleDriveDownloadUrl(downloadUrl);
            
            // Для Google Drive нужно использовать window.open с особыми параметрами
            // чтобы избежать страницы предупреждения
            showNotification('Начато скачивание книги...', 'info');
            
            // Открываем в новом окне/вкладке для скачивания
            const downloadWindow = window.open(downloadUrl, '_blank');
            
            if (!downloadWindow) {
                showNotification('Разрешите всплывающие окна для скачивания', 'warning');
                // Альтернативный метод через iframe
                const iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                iframe.src = downloadUrl;
                document.body.appendChild(iframe);
                setTimeout(() => document.body.removeChild(iframe), 5000);
            }
            
        } else {
            // Для обычных прямых ссылок используем стандартный метод
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `${book.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        
        // Обновляем счетчик скачиваний
        updateDownloadCount(bookId);
        
    } catch (error) {
        console.error('Download error:', error);
        showNotification('Ошибка при скачивании', 'error');
    }
}

// 3. ФУНКЦИЯ ДЛЯ ПРОВЕРКИ ССЫЛКИ НА РАБОТОСПОСОБНОСТЬ
async function checkGoogleDriveLink(fileUrl) {
    if (!fileUrl.includes('drive.google.com')) return { valid: true, directUrl: fileUrl };
    
    try {
        // Пробуем получить прямую ссылку
        const directUrl = getDirectGoogleDriveDownloadUrl(fileUrl);
        
        // Проверяем HEAD запросом
        const response = await fetch(directUrl, { method: 'HEAD' });
        
        const contentLength = response.headers.get('content-length');
        const contentType = response.headers.get('content-type');
        
        // Проверяем, что это не HTML страница
        if (contentType && contentType.includes('text/html')) {
            return { 
                valid: false, 
                directUrl: directUrl,
                error: 'Ссылка ведет на HTML страницу вместо файла'
            };
        }
        
        // Проверяем размер файла (предполагаем, что PDF > 10KB)
        if (contentLength && parseInt(contentLength) < 10240) {
            return {
                valid: false,
                directUrl: directUrl,
                error: 'Файл слишком маленький для PDF'
            };
        }
        
        return { valid: true, directUrl: directUrl };
        
    } catch (error) {
        return { 
            valid: false, 
            directUrl: fileUrl,
            error: error.message 
        };
    }
}

// 4. ОБНОВЛЕННАЯ ФУНКЦИЯ ДЛЯ ОТОБРАЖЕНИЯ КНОПКИ СКАЧИВАНИЯ
function updateBookDownloadButton(book) {
    const isGoogleDrive = book.fileUrl.includes('drive.google.com');
    
    if (isGoogleDrive) {
        return `
            <button class="book-download google-drive-download" data-id="${book.id}">
                <i class="fas fa-cloud-download-alt"></i> Скачать с Google Drive
            </button>
        `;
    } else {
        return `
            <a href="${book.fileUrl}" class="book-download" download="${book.title.replace(/[^a-z0-9]/gi, '_')}.pdf" target="_blank" data-id="${book.id}">
                <i class="fas fa-download"></i> Скачать PDF
            </a>
        `;
    }
}

// 5. ОБРАБОТЧИК ДЛЯ СКАЧИВАНИЯ (в setupEventListeners добавьте):
function setupDownloadHandlers() {
    // Для обычных ссылок
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('book-download') && 
            !e.target.classList.contains('google-drive-download')) {
            e.preventDefault();
            const bookId = e.target.getAttribute('data-id');
            updateDownloadCount(bookId);
            // Ссылка сама откроется благодаря атрибутам href, download и target="_blank"
        }
        
        // Для Google Drive ссылок
        if (e.target.classList.contains('google-drive-download')) {
            e.preventDefault();
            const bookId = e.target.getAttribute('data-id');
            downloadBookWithGoogleDrive(bookId);
        }
    });
}

// 6. ФУНКЦИЯ ДЛЯ ОБНОВЛЕНИЯ СЧЕТЧИКА СКАЧИВАНИЙ
async function updateDownloadCount(bookId) {
    try {
        const book = booksData.find(b => b.id === bookId);
        if (!book) return;
        
        const currentDownloads = book.downloads || 0;
        const newCount = currentDownloads + 1;
        
        // Обновляем в Firestore
        await db.collection("books").doc(bookId).update({
            downloads: newCount
        });
        
        // Обновляем локально
        book.downloads = newCount;
        
    } catch (error) {
        console.error('Error updating download count:', error);
    }
}

// 7. В displayBooks ОБНОВИТЕ HTML ДЛЯ КНОПКИ СКАЧИВАНИЯ:
// Замените существующий код для book-download на:
`
<div class="book-meta" style="margin-top: 15px;">
    <span style="font-size: 0.9rem; color: #666;">Скачано: ${book.downloads || 0}</span>
    ${updateBookDownloadButton(book)}
</div>
`

// 8. В initAuth ИЛИ loadBooksFromFirestore ДОБАВЬТЕ ПРОВЕРКУ ССЫЛОК:
async function validateAllBookLinks() {
    const invalidBooks = [];
    
    for (const book of booksData) {
        if (book.fileUrl && book.fileUrl.includes('drive.google.com')) {
            const result = await checkGoogleDriveLink(book.fileUrl);
            if (!result.valid) {
                console.warn(`Invalid Google Drive link for book: ${book.title}`, result.error);
                invalidBooks.push({ book, error: result.error });
            }
        }
    }
    
    if (invalidBooks.length > 0) {
        console.log(`Found ${invalidBooks.length} books with invalid Google Drive links`);
        // Можно показать уведомление администратору
        if (adminUser) {
            showNotification(`Обнаружено ${invalidBooks.length} нерабочих ссылок на Google Drive`, 'warning');
        }
    }
}

// Вызовите эту функцию после загрузки книг
// В loadBooksFromFirestore:
.then(() => {
    console.log(`Loaded ${booksData.length} books from Firestore`);
    displayBooks(booksData);
    validateAllBookLinks(); // ДОБАВЬТЕ ЭТУ СТРОЧКУ
})
