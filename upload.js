// upload.js - Загрузка книг с Firebase

class UploadManager {
    constructor() {
        this.selectedFile = null;
        this.initTheme();
        this.init();
    }
    
    initTheme() {
        const savedTheme = localStorage.getItem('digital-library-theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleTheme();
            });
            this.updateThemeIcon();
        }
    }
    
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('digital-library-theme', newTheme);
        this.updateThemeIcon();
    }
    
    updateThemeIcon() {
        const icon = document.querySelector('#themeToggle i');
        if (icon) {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            icon.className = currentTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
            const text = icon.nextElementSibling;
            if (text) {
                text.textContent = currentTheme === 'light' ? 'Тёмная' : 'Светлая';
            }
        }
    }
    
    init() {
        this.initUploadArea();
        this.initForm();
        this.initProgress();
    }
    
    initUploadArea() {
        const dropArea = document.getElementById('dropArea');
        const fileInput = document.getElementById('fileInput');
        const selectedFile = document.getElementById('selectedFile');
        const removeFile = document.getElementById('removeFile');
        
        if (dropArea) dropArea.addEventListener('click', () => fileInput.click());
        
        if (dropArea) {
            dropArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropArea.classList.add('drag-over');
            });
            
            dropArea.addEventListener('dragleave', () => {
                dropArea.classList.remove('drag-over');
            });
            
            dropArea.addEventListener('drop', (e) => {
                e.preventDefault();
                dropArea.classList.remove('drag-over');
                
                if (e.dataTransfer.files.length) {
                    this.handleFileSelect(e.dataTransfer.files[0]);
                }
            });
        }
        
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length) {
                    this.handleFileSelect(e.target.files[0]);
                }
            });
        }
        
        if (removeFile) {
            removeFile.addEventListener('click', (e) => {
                e.stopPropagation();
                this.clearFileSelection();
            });
        }
    }
    
    handleFileSelect(file) {
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (file.size > maxSize) {
            this.showNotification('Файл слишком большой. Максимум 50MB', 'error');
            return;
        }
        
        const fileExtension = file.name.split('.').pop().toLowerCase();
        const allowedExtensions = ['pdf', 'txt'];
        
        if (!allowedExtensions.includes(fileExtension)) {
            this.showNotification('Разрешены только файлы PDF и TXT', 'error');
            return;
        }
        
        this.selectedFile = file;
        this.updateFileDisplay(file);
        this.updateFileFormat(fileExtension);
    }
    
    updateFileDisplay(file) {
        const selectedFile = document.getElementById('selectedFile');
        if (!selectedFile) return;
        
        const fileName = selectedFile.querySelector('.file-name');
        const fileSize = selectedFile.querySelector('.file-size');
        
        const formatSize = (bytes) => {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };
        
        if (fileName) fileName.textContent = file.name;
        if (fileSize) fileSize.textContent = formatSize(file.size);
        selectedFile.style.display = 'flex';
    }
    
    updateFileFormat(extension) {
        const formatSelect = document.getElementById('bookFormat');
        if (formatSelect) {
            formatSelect.value = extension;
        }
    }
    
    clearFileSelection() {
        this.selectedFile = null;
        const selectedFile = document.getElementById('selectedFile');
        const fileInput = document.getElementById('fileInput');
        const formatSelect = document.getElementById('bookFormat');
        
        if (selectedFile) {
            selectedFile.style.display = 'none';
            const fileName = selectedFile.querySelector('.file-name');
            const fileSize = selectedFile.querySelector('.file-size');
            if (fileName) fileName.textContent = 'Файл не выбран';
            if (fileSize) fileSize.textContent = '-';
        }
        
        if (fileInput) fileInput.value = '';
        if (formatSelect) formatSelect.value = '';
    }
    
    initForm() {
        const form = document.getElementById('uploadForm');
        const submitBtn = document.getElementById('submitBtn');
        
        if (form && submitBtn) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                if (!this.selectedFile) {
                    this.showNotification('Пожалуйста, выберите файл', 'error');
                    return;
                }
                
                // Проверяем авторизацию
                if (!authManager.isAuthenticated()) {
                    this.showNotification('Для загрузки книг необходимо войти в систему', 'error');
                    authManager.openAuthModal();
                    return;
                }
                
                // Получаем данные формы
                const bookData = {
                    title: document.getElementById('bookTitle').value.trim(),
                    author: document.getElementById('bookAuthor').value.trim(),
                    genre: document.getElementById('bookGenre').value,
                    format: document.getElementById('bookFormat').value,
                    description: document.getElementById('bookDescription').value.trim()
                };
                
                // Проверка заполнения полей
                if (!bookData.title || !bookData.author || !bookData.genre || !bookData.format) {
                    this.showNotification('Заполните все обязательные поля', 'error');
                    return;
                }
                
                // Показываем прогресс бар
                this.showProgress();
                
                try {
                    // 1. Сначала создаем запись в Firestore
                    const bookResult = await firestoreManager.addBook(bookData);
                    
                    if (!bookResult.success) {
                        throw new Error(bookResult.error);
                    }
                    
                    const bookId = bookResult.id;
                    
                    // 2. Загружаем файл в Storage
                    this.updateProgress(30, 'Загрузка файла...');
                    const uploadResult = await storageManager.uploadFile(this.selectedFile, bookId);
                    
                    if (!uploadResult.success) {
                        // Если загрузка файла не удалась, удаляем запись из Firestore
                        await firestoreManager.deleteBook(bookId);
                        throw new Error(uploadResult.error);
                    }
                    
                    // 3. Обновляем запись в Firestore с URL файла
                    this.updateProgress(70, 'Сохранение данных...');
                    await db.collection('books').doc(bookId).update({
                        fileName: uploadResult.fileName,
                        downloadURL: uploadResult.downloadURL,
                        fileSize: this.selectedFile.size
                    });
                    
                    // 4. Завершение
                    this.updateProgress(100, 'Завершено');
                    
                    // Успешное завершение
                    this.showNotification('Книга успешно загружена!', 'success');
                    this.resetForm();
                    
                    // Перенаправляем в библиотеку через 2 секунды
                    setTimeout(() => {
                        window.location.href = 'library.html';
                    }, 2000);
                    
                } catch (error) {
                    console.error('Ошибка загрузки:', error);
                    this.showNotification(`Ошибка: ${error.message}`, 'error');
                } finally {
                    this.hideProgress();
                }
            });
        }
    }
    
    initProgress() {
        const progress = document.getElementById('uploadProgress');
        if (progress) {
            progress.style.display = 'none';
        }
    }
    
    showProgress() {
        const progress = document.getElementById('uploadProgress');
        if (progress) {
            progress.style.display = 'block';
            this.updateProgress(0, 'Подготовка...');
        }
    }
    
    hideProgress() {
        const progress = document.getElementById('uploadProgress');
        if (progress) {
            progress.style.display = 'none';
        }
    }
    
    updateProgress(percent, status) {
        const progressFill = document.querySelector('.progress-fill');
        const progressPercent = document.querySelector('.progress-percent');
        const progressStatus = document.querySelector('.progress-status');
        
        if (progressFill) progressFill.style.width = `${percent}%`;
        if (progressPercent) progressPercent.textContent = `${Math.round(percent)}%`;
        if (progressStatus) progressStatus.textContent = status;
    }
    
    resetForm() {
        const form = document.getElementById('uploadForm');
        if (form) form.reset();
        this.clearFileSelection();
    }
    
    showNotification(message, type = 'info') {
        let container = document.getElementById('notificationContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notificationContainer';
            container.className = 'notification-container';
            document.body.appendChild(container);
        }
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        });
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 5000);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.uploadManager = new UploadManager();
});
