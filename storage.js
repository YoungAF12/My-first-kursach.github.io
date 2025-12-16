// storage.js - Работа с локальным хранилищем

class BookStorage {
    constructor() {
        this.STORAGE_KEY = 'digital-library-books';
        this.init();
    }
    
    init() {
        // Инициализация хранилища, если его нет
        if (!localStorage.getItem(this.STORAGE_KEY)) {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify([]));
        }
    }
    
    // Получить все книги
    getAllBooks() {
        try {
            const books = JSON.parse(localStorage.getItem(this.STORAGE_KEY));
            return Array.isArray(books) ? books : [];
        } catch (error) {
            console.error('Ошибка при чтении книг:', error);
            return [];
        }
    }
    
    // Получить книгу по ID
    getBookById(id) {
        const books = this.getAllBooks();
        return books.find(book => book.id === id);
    }
    
    // Добавить новую книгу
    addBook(bookData) {
        const books = this.getAllBooks();
        const newBook = {
            id: Date.now().toString(),
            dateAdded: new Date().toISOString(),
            views: 0,
            downloads: 0,
            ...bookData
        };
        
        books.unshift(newBook);
        this.saveBooks(books);
        return newBook;
    }
    
    // Обновить данные книги
    updateBook(id, updates) {
        const books = this.getAllBooks();
        const index = books.findIndex(book => book.id === id);
        
        if (index !== -1) {
            books[index] = { ...books[index], ...updates };
            this.saveBooks(books);
            return books[index];
        }
        
        return null;
    }
    
    // Удалить книгу
    deleteBook(id) {
        const books = this.getAllBooks();
        const filteredBooks = books.filter(book => book.id !== id);
        this.saveBooks(filteredBooks);
        return filteredBooks.length !== books.length;
    }
    
    // Увеличить счетчик просмотров
    incrementViews(id) {
        const book = this.getBookById(id);
        if (book) {
            return this.updateBook(id, { views: (book.views || 0) + 1 });
        }
        return null;
    }
    
    // Увеличить счетчик скачиваний
    incrementDownloads(id) {
        const book = this.getBookById(id);
        if (book) {
            return this.updateBook(id, { downloads: (book.downloads || 0) + 1 });
        }
        return null;
    }
    
    // Поиск книг
    searchBooks(query) {
        const books = this.getAllBooks();
        const searchTerm = query.toLowerCase();
        
        return books.filter(book => 
            book.title.toLowerCase().includes(searchTerm) ||
            book.author.toLowerCase().includes(searchTerm) ||
            book.description.toLowerCase().includes(searchTerm) ||
            book.genre.toLowerCase().includes(searchTerm)
        );
    }
    
    // Фильтрация по жанру
    filterByGenre(genre) {
        const books = this.getAllBooks();
        return books.filter(book => book.genre === genre);
    }
    
    // Получить последние книги
    getRecentBooks(limit = 8) {
        const books = this.getAllBooks();
        return books.slice(0, limit);
    }
    
    // Сохранить все книги
    saveBooks(books) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(books));
            this.dispatchStorageEvent();
        } catch (error) {
            console.error('Ошибка при сохранении книг:', error);
        }
    }
    
    // Событие при изменении хранилища
    dispatchStorageEvent() {
        const event = new CustomEvent('booksUpdated');
        window.dispatchEvent(event);
    }
    
    // Получить статистику
    getStats() {
        const books = this.getAllBooks();
        return {
            totalBooks: books.length,
            totalViews: books.reduce((sum, book) => sum + (book.views || 0), 0),
            totalDownloads: books.reduce((sum, book) => sum + (book.downloads || 0), 0),
            formats: books.reduce((acc, book) => {
                acc[book.format] = (acc[book.format] || 0) + 1;
                return acc;
            }, {})
        };
    }
}

// Создаем глобальный экземпляр хранилища
const bookStorage = new BookStorage();
