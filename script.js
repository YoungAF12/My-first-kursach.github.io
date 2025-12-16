// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    // Мобильное меню
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    // Модальное окно входа
    const loginBtn = document.getElementById('loginBtn');
    const loginModal = document.getElementById('loginModal');
    const closeModal = document.querySelector('.close-modal');
    
    if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            loginModal.style.display = 'block';
        });
    }
    
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            loginModal.style.display = 'none';
        });
    }
    
    // Закрытие модального окна при клике вне его
    window.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            loginModal.style.display = 'none';
        }
    });
    
    // Загрузка последних книг на главной
    loadRecentBooks();
});

// Загрузка последних книг
async function loadRecentBooks() {
    try {
        // В реальном приложении здесь будет fetch запрос к API
        const books = [
            {
                id: 1,
                title: "Мастер и Маргарита",
                author: "Михаил Булгаков",
                format: "PDF",
                pages: 480,
                cover: "📚"
            },
            {
                id: 2,
                title: "Преступление и наказание",
                author: "Фёдор Достоевский",
                format: "TXT",
                pages: 672,
                cover: "📖"
            },
            {
                id: 3,
                title: "1984",
                author: "Джордж Оруэлл",
                format: "PDF",
                pages: 328,
                cover: "🔒"
            },
            {
                id: 4,
                title: "Маленький принц",
                author: "Антуан де Сент-Экзюпери",
                format: "PDF",
                pages: 96,
                cover: "👑"
            }
        ];
        
        const booksGrid = document.getElementById('booksGrid');
        if (booksGrid) {
            booksGrid.innerHTML = books.map(book => `
                <div class="book-card">
                    <div class="book-cover">
                        ${book.cover}
                    </div>
                    <div class="book-info">
                        <h3 class="book-title">${book.title}</h3>
                        <p class="book-author">${book.author}</p>
                        <div class="book-meta">
                            <span class="book-format">${book.format}</span>
                            <div class="book-actions">
                                <button class="action-btn" title="Читать">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="action-btn" title="Скачать">
                                    <i class="fas fa-download"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Ошибка загрузки книг:', error);
    }
}

// Функция для отображения уведомлений
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button class="close-notification">&times;</button>
    `;
    
    document.body.appendChild(notification);
    
    // Анимация появления
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Закрытие уведомления
    const closeBtn = notification.querySelector('.close-notification');
    closeBtn.addEventListener('click', () => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    });
    
    // Автоматическое закрытие
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }
    }, 5000);
}
