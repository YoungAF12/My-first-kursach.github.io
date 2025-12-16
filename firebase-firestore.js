// firebase-firestore.js
class FirestoreManager {
    constructor() {
        this.booksCollection = 'books';
        this.init();
    }
    
    init() {
        // Можно добавить инициализацию индексов или других настроек
    }
    
    // Добавить книгу
    async addBook(bookData) {
        try {
            // Добавляем метаданные
            const bookWithMeta = {
                ...bookData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                views: 0,
                downloads: 0,
                uploadedBy: authManager.currentUser ? authManager.currentUser.uid : null,
                uploadedByName: authManager.currentUser ? 
                    (await authManager.getUserData()).username : 'Аноним'
            };
            
            // Сохраняем в Firestore
            const docRef = await db.collection(this.booksCollection).add(bookWithMeta);
            
            // Обновляем статистику пользователя
            if (authManager.currentUser) {
                await authManager.updateUserStats(authManager.currentUser.uid, 'uploadedBooks', 1);
            }
            
            return { success: true, id: docRef.id };
        } catch (error) {
            console.error('Ошибка добавления книги:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Получить все книги
    async getAllBooks(limit = 100) {
        try {
            const snapshot = await db.collection(this.booksCollection)
                .orderBy('createdAt', 'desc')
                .limit(limit)
                .get();
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Ошибка получения книг:', error);
            return [];
        }
    }
    
    // Получить книгу по ID
    async getBookById(bookId) {
        try {
            const doc = await db.collection(this.booksCollection).doc(bookId).get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error('Ошибка получения книги:', error);
            return null;
        }
    }
    
    // Поиск книг
    async searchBooks(query, field = 'title') {
        try {
            // Note: Firestore не поддерживает полнотекстовый поиск напрямую
            // В продакшене нужно использовать Algolia или ElasticSearch
            const snapshot = await db.collection(this.booksCollection)
                .orderBy(field)
                .startAt(query)
                .endAt(query + '\uf8ff')
                .limit(20)
                .get();
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Ошибка поиска:', error);
            return [];
        }
    }
    
    // Получить книги пользователя
    async getBooksByUser(userId) {
        try {
            const snapshot = await db.collection(this.booksCollection)
                .where('uploadedBy', '==', userId)
                .orderBy('createdAt', 'desc')
                .get();
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Ошибка получения книг пользователя:', error);
            return [];
        }
    }
    
    // Обновить просмотры
    async incrementViews(bookId) {
        try {
            await db.collection(this.booksCollection).doc(bookId).update({
                views: firebase.firestore.FieldValue.increment(1),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Обновляем статистику пользователя
            const book = await this.getBookById(bookId);
            if (book && book.uploadedBy) {
                await authManager.updateUserStats(book.uploadedBy, 'totalViews', 1);
            }
            
            return true;
        } catch (error) {
            console.error('Ошибка обновления просмотров:', error);
            return false;
        }
    }
    
    // Обновить скачивания
    async incrementDownloads(bookId) {
        try {
            await db.collection(this.booksCollection).doc(bookId).update({
                downloads: firebase.firestore.FieldValue.increment(1),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Обновляем статистику пользователя
            const book = await this.getBookById(bookId);
            if (book && book.uploadedBy) {
                await authManager.updateUserStats(book.uploadedBy, 'totalDownloads', 1);
            }
            
            return true;
        } catch (error) {
            console.error('Ошибка обновления скачиваний:', error);
            return false;
        }
    }
    
    // Получить популярные книги
    async getPopularBooks(limit = 10) {
        try {
            const snapshot = await db.collection(this.booksCollection)
                .orderBy('views', 'desc')
                .limit(limit)
                .get();
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Ошибка получения популярных книг:', error);
            return [];
        }
    }
    
    // Получить последние книги
    async getRecentBooks(limit = 10) {
        try {
            const snapshot = await db.collection(this.booksCollection)
                .orderBy('createdAt', 'desc')
                .limit(limit)
                .get();
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Ошибка получения последних книг:', error);
            return [];
        }
    }
    
    // Удалить книгу
    async deleteBook(bookId) {
        try {
            // Проверяем права
            const book = await this.getBookById(bookId);
            if (!book) return { success: false, error: 'Книга не найдена' };
            
            if (authManager.currentUser && 
                authManager.currentUser.uid !== book.uploadedBy) {
                return { success: false, error: 'Нет прав на удаление' };
            }
            
            await db.collection(this.booksCollection).doc(bookId).delete();
            
            // Обновляем статистику пользователя
            if (book.uploadedBy) {
                await authManager.updateUserStats(book.uploadedBy, 'uploadedBooks', -1);
            }
            
            return { success: true };
        } catch (error) {
            console.error('Ошибка удаления книги:', error);
            return { success: false, error: error.message };
        }
    }
}

// Глобальный экземпляр
window.firestoreManager = new FirestoreManager();
