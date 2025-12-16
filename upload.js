// upload.js - Логика загрузки файлов

class UploadManager {
    constructor() {
        this.selectedFile = null;
        this.init();
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
        
        // Клик по области загрузки
        dropArea.addEventListener('click', () => fileInput.click());
        
        // Drag & Drop
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
        
        // Выбор файла через input
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                this.handleFileSelect(e.target.files[0]);
            }
        });
        
        // Удаление выбранного файла
        removeFile.addEventListener('click', (e) => {
            e.stopPropagation();
            this.clearFileSelection();
        });
    }
    
    handleFileSelect(file) {
        // Проверка размера файла (10MB максимум)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            this.showNotification('Файл слишком большой. Максимум 10MB', 'error');
            return;
        }
        
        // Проверка типа файла
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
        const fileName = selectedFile.querySelector('.file-name');
        const fileSize = selectedFile.querySelector('.file-size');
        
        // Форматирование размера файла
        const formatSize = (bytes) => {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };
        
        fileName.textContent = file.name;
        fileSize.textContent = formatSize(file.size);
        selectedFile.style.display = 'flex';
    }
    
    updateFileFormat(extension) {
        const formatSelect = document.getElementById('bookFormat');
        formatSelect.value = extension;
    }
    
    clearFileSelection() {
        this.selectedFile = null;
        const selectedFile = document.getElementById('selectedFile');
        const fileInput = document.getElementById('fileInput');
        const formatSelect = document.getElementById('bookFormat');
        
        selectedFile.style.display = 'none';
        selectedFile.querySelector('.file-name').textContent = 'Файл не выбран';
        selectedFile.querySelector('.file-size').textContent = '-';
        fileInput.value = '';
        formatSelect.value = '';
    }
    
    initForm() {
        const form = document.getElementById('uploadForm');
        const submitBtn = document.getElementById('submitBtn');
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!this.selectedFile) {
                this.showNotification('Пожалуйста, выберите файл', 'error');
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
                // Читаем содержимое файла
                const fileContent = await this.readFileContent(this.selectedFile);
                
                // Добавляем книгу в хранилище
                const bookWithContent = {
                    ...bookData,
                    fileContent: fileContent,
                    size: this.selectedFile.size
                };
                
                // Имитация загрузки
                await this.simulateUpload();
                
                // Сохраняем книгу
                bookStorage.addBook(bookWithContent);
                
                // Успешное завершение
                this.showNotification('Книга успешно загружена!', 'success');
                this.resetForm();
                
                // Перенаправляем в библиотеку через 2 секунды
                setTimeout(() => {
                    window.location.href = 'library.html';
                }, 2000);
                
            } catch (error) {
                this.showNotification('Ошибка при загрузке файла', 'error');
                console.error('Upload error:', error);
            } finally {
                this.hideProgress();
            }
        });
    }
    
    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                resolve(e.target.result);
            };
            
            reader.onerror = () => {
                reject(new Error('Ошибка чтения файла'));
            };
            
            // Для текстовых файлов читаем как текст
            if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
                reader.readAsText(file);
            } else {
                // Для PDF используем base64
                reader.readAsDataURL(file);
            }
        });
    }
    
    simulateUpload() {
        return new Promise((resolve) => {
            let progress = 0;
            const interval = setInterval(() => {
                progress += Math.random() * 15;
                if (progress >= 100) {
                    progress = 100;
                    clearInterval(interval);
                    this.updateProgress(progress, 'Завершено');
                    setTimeout(resolve, 500);
                } else {
                    this.updateProgress(progress, 'Загрузка...');
                }
            }, 200);
        });
    }
    
    initProgress() {
        const progress = document.getElementById('uploadProgress');
        progress.style.display = 'none';
    }
    
    showProgress() {
        const progress = document.getElementById('uploadProgress');
        progress.style.display = 'block';
        this.updateProgress(0, 'Подготовка...');
    }
    
    hideProgress() {
        const progress = document.getElementById('uploadProgress');
        progress.style.display = 'none';
    }
    
    updateProgress(percent, status) {
        const progressFill = document.querySelector('.progress-fill');
        const progressPercent = document.querySelector('.progress-percent');
        const progressStatus = document.querySelector('.progress-status');
        
        progressFill.style.width = `${percent}%`;
        progressPercent.textContent = `${Math.round(percent)}%`;
        progressStatus.textContent = status;
    }
    
    resetForm() {
        document.getElementById('uploadForm').reset();
        this.clearFileSelection();
    }
    
    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationContainer');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(notification);
        
        // Анимация появления
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // Закрытие по кнопке
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            this.removeNotification(notification);
        });
        
        // Автоматическое закрытие
        setTimeout(() => {
            if (document.body.contains(notification)) {
                this.removeNotification(notification);
            }
        }, 5000);
    }
    
    removeNotification(notification) {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.remove();
            }
        }, 300);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.uploadManager = new UploadManager();
});

// Добавляем стили для страницы загрузки
const uploadStyles = `
    .upload-page {
        min-height: 100vh;
        padding: 8rem 1rem 4rem;
        background: var(--surface);
    }
    
    .upload-container {
        max-width: 900px;
        margin: 0 auto;
    }
    
    .upload-header {
        text-align: center;
        margin-bottom: 3rem;
    }
    
    .upload-header h1 {
        font-family: 'Playfair Display', serif;
        font-size: 3rem;
        margin-bottom: 0.5rem;
        background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
    }
    
    .upload-header p {
        color: var(--text-secondary);
        font-size: 1.125rem;
    }
    
    .upload-card {
        background: var(--background);
        border-radius: var(--radius-lg);
        padding: 2.5rem;
        box-shadow: var(--shadow);
        margin-bottom: 2rem;
    }
    
    .upload-area {
        border: 3px dashed var(--border-color);
        border-radius: var(--radius);
        padding: 3rem 2rem;
        text-align: center;
        margin-bottom: 2rem;
        transition: var(--transition);
        cursor: pointer;
    }
    
    .upload-area.drag-over {
        border-color: var(--primary-color);
        background: rgba(99, 102, 241, 0.05);
    }
    
    .upload-area:hover {
        border-color: var(--primary-color);
    }
    
    .upload-icon {
        font-size: 4rem;
        color: var(--primary-color);
        margin-bottom: 1rem;
    }
    
    .upload-area h3 {
        font-size: 1.5rem;
        margin-bottom: 0.5rem;
    }
    
    .upload-area p {
        color: var(--text-secondary);
        margin-bottom: 1rem;
    }
    
    .file-types {
        display: flex;
        gap: 0.5rem;
        justify-content: center;
        margin-bottom: 1rem;
    }
    
    .file-type-tag {
        background: var(--primary-color);
        color: white;
        padding: 0.25rem 1rem;
        border-radius: 20px;
        font-size: 0.875rem;
        font-weight: 500;
    }
    
    .file-size-info {
        font-size: 0.875rem;
        color: var(--text-secondary);
    }
    
    .selected-file {
        display: none;
        align-items: center;
        gap: 1rem;
        background: var(--surface);
        padding: 1rem;
        border-radius: var(--radius);
        margin-bottom: 2rem;
        border: 1px solid var(--border-color);
    }
    
    .selected-file i {
        font-size: 2rem;
        color: var(--primary-color);
    }
    
    .file-info {
        flex: 1;
    }
    
    .file-name {
        display: block;
        font-weight: 500;
        margin-bottom: 0.25rem;
    }
    
    .file-size {
        font-size: 0.875rem;
        color: var(--text-secondary);
    }
    
    .remove-file {
        background: none;
        border: none;
        color: var(--text-secondary);
        font-size: 1.25rem;
        cursor: pointer;
        transition: var(--transition);
    }
    
    .remove-file:hover {
        color: var(--primary-color);
    }
    
    .form-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
    }
    
    .form-group {
        margin-bottom: 1.5rem;
    }
    
    .form-group label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
        font-weight: 500;
        color: var(--text-primary);
    }
    
    .form-group label i {
        color: var(--primary-color);
    }
    
    .form-group input,
    .form-group select,
    .form-group textarea {
        width: 100%;
        padding: 1rem;
        background: var(--surface);
        border: 2px solid var(--border-color);
        border-radius: var(--radius);
        color: var(--text-primary);
        font-size: 1rem;
        transition: var(--transition);
    }
    
    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
        outline: none;
        border-color: var(--primary-color);
    }
    
    .form-actions {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
        margin-top: 2rem;
    }
    
    .btn-cancel {
        padding: 1rem 2rem;
        background: var(--surface);
        border: 2px solid var(--border-color);
        border-radius: var(--radius);
        color: var(--text-primary);
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        transition: var(--transition);
    }
    
    .btn-cancel:hover {
        border-color: var(--primary-color);
        color: var(--primary-color);
    }
    
    .btn-submit {
        padding: 1rem 2rem;
        background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
        border: none;
        border-radius: var(--radius);
        color: white;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        transition: var(--transition);
    }
    
    .btn-submit:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow);
    }
    
    .upload-progress {
        margin-top: 2rem;
        padding: 1rem;
        background: var(--surface);
        border-radius: var(--radius);
        border: 1px solid var(--border-color);
    }
    
    .progress-bar {
        height: 8px;
        background: var(--background);
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 0.75rem;
    }
    
    .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--primary-color), var(--accent-color));
        border-radius: 4px;
        width: 0%;
        transition: width 0.3s ease;
    }
    
    .progress-text {
        display: flex;
        justify-content: space-between;
        font-size: 0.875rem;
        color: var(--text-secondary);
    }
    
    .upload-tips {
        background: var(--background);
        border-radius: var(--radius);
        padding: 2rem;
        box-shadow: var(--shadow);
    }
    
    .upload-tips h3 {
        margin-bottom: 1rem;
        color: var(--primary-color);
    }
    
    .upload-tips ul {
        list-style: none;
    }
    
    .upload-tips li {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 0.75rem;
        color: var(--text-secondary);
    }
    
    .upload-tips li i {
        color: #10b981;
    }
`;

// Добавляем стили для страницы загрузки
const styleSheet = document.createElement('style');
styleSheet.textContent = uploadStyles;
document.head.appendChild(styleSheet);