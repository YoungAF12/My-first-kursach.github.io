// firebase-storage.js
class FirebaseStorageManager {
    constructor() {
        this.storageRef = storage.ref();
    }
    
    // Загрузить файл
    async uploadFile(file, bookId) {
        try {
            // Создаем путь для файла
            const fileExtension = file.name.split('.').pop();
            const fileName = `${bookId}.${fileExtension}`;
            const fileRef = this.storageRef.child('books/' + fileName);
            
            // Загружаем файл
            const uploadTask = fileRef.put(file);
            
            // Возвращаем промис для отслеживания прогресса
            return new Promise((resolve, reject) => {
                uploadTask.on('state_changed',
                    // Прогресс загрузки
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        console.log('Прогресс загрузки: ' + progress + '%');
                    },
                    // Ошибка
                    (error) => {
                        console.error('Ошибка загрузки:', error);
                        reject(error);
                    },
                    // Успешная загрузка
                    async () => {
                        // Получаем URL для скачивания
                        const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                        resolve({
                            success: true,
                            downloadURL: downloadURL,
                            fileName: fileName
                        });
                    }
                );
            });
            
        } catch (error) {
            console.error('Ошибка загрузки файла:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Получить URL файла
    async getFileUrl(fileName) {
        try {
            const fileRef = this.storageRef.child('books/' + fileName);
            const url = await fileRef.getDownloadURL();
            return { success: true, url: url };
        } catch (error) {
            console.error('Ошибка получения URL:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Удалить файл
    async deleteFile(fileName) {
        try {
            const fileRef = this.storageRef.child('books/' + fileName);
            await fileRef.delete();
            return { success: true };
        } catch (error) {
            console.error('Ошибка удаления файла:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Скачать файл
    async downloadFile(fileName, bookTitle, format) {
        try {
            const result = await this.getFileUrl(fileName);
            if (!result.success) return result;
            
            // Создаем временную ссылку для скачивания
            const a = document.createElement('a');
            a.href = result.url;
            a.download = `${bookTitle}.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            return { success: true };
        } catch (error) {
            console.error('Ошибка скачивания:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Просмотр файла (для TXT)
    async viewTextFile(fileName) {
        try {
            const result = await this.getFileUrl(fileName);
            if (!result.success) return result;
            
            // Загружаем текстовый файл
            const response = await fetch(result.url);
            const text = await response.text();
            
            return { success: true, content: text };
        } catch (error) {
            console.error('Ошибка загрузки текстового файла:', error);
            return { success: false, error: error.message };
        }
    }
}

// Глобальный экземпляр
window.storageManager = new FirebaseStorageManager();
