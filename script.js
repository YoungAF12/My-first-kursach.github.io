// ==================== КОНФИГУРАЦИЯ FIREBASE ====================
const firebaseConfig = {
  apiKey: "AIzaSyDqnau8N2mHjhOTMpxXqYe8EDGfxqGqQn0",
  authDomain: "my-first-kyrsachic.firebaseapp.com",
  projectId: "my-first-kyrsachic",
  storageBucket: "my-first-kyrsachic.firebasestorage.app",
  messagingSenderId: "741117010262",
  appId: "1:741117010262:web:2972f2e62517ccc2b9f6f7",
  measurementId: "G-81YS0ZHEXX"
};

// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
let firebaseInitialized = false;
let user = null;
let pdfDoc = null;
let currentPage = 1;
let totalPages = 1;
let fontSize = 16;
let currentBook = null;
let currentBookId = null;
let isGuestMode = false;

// ==================== ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ ====================
document.addEventListener('DOMContentLoaded', function() {
    // Инициализируем Firebase
    initializeFirebase();
    
    // Настраиваем загрузку файлов
    document.getElementById('file-input').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        handleFileUpload(file);
    });
    
    // Загружаем настройки
    loadLocalSettings();
    
    // Показываем приветственный экран
    showWelcomeScreen();
});

// ==================== ИНИЦИАЛИЗАЦИЯ FIREBASE ====================
function initializeFirebase() {
    try {
        if (typeof firebase === 'undefined') {
            console.log('Firebase SDK не найден, работаем в оффлайн режиме');
            showOfflineMode();
            return;
        }
        
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log('✅ Firebase инициализирован');
        }
        
        firebaseInitialized = true;
        
        // Слушатель состояния авторизации
        firebase.auth().onAuthStateChanged((firebaseUser) => {
            if (firebaseUser) {
                // Пользователь вошел в систему
                user = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName || firebaseUser.email,
                    isGuest: false
                };
                isGuestMode = false;
                console.log('👤 Пользователь вошел:', user.email);
                onUserLogin();
            } else {
                // Пользователь вышел или гость
                if (!isGuestMode) {
                    // Показываем окно авторизации
                    showAuthScreen();
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Ошибка Firebase:', error);
        showOfflineMode();
    }
}

// ==================== РЕЖИМ ГОСТЯ ====================
function continueAsGuest() {
    isGuestMode = true;
    user = {
        uid: 'guest_' + Date.now(),
        email: 'guest@example.com',
        displayName: 'Гость',
        isGuest: true
    };
    
    console.log('👤 Включен гостевой режим');
    hideAuthOverlay();
    updateUIForGuest();
}

function showWelcomeScreen() {
    document.getElementById('auth-overlay').style.display = 'flex';
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
}

function hideAuthOverlay() {
    document.getElementById('auth-overlay').style.display = 'none';
}

function showAuthScreen() {
    isGuestMode = false;
    user = null;
    document.getElementById('auth-overlay').style.display = 'flex';
    document.getElementById('user-info').style.display = 'none';
    document.getElementById('cloud-save-btn').style.display = 'none';
}

function showOfflineMode() {
    console.log('📴 Работаем в оффлайн режиме');
    continueAsGuest();
}

// ==================== ОБНОВЛЕНИЕ ИНТЕРФЕЙСА ====================
function updateUIForGuest() {
    document.getElementById('user-info').style.display = 'flex';
    document.getElementById('user-name').textContent = 'Гость';
    document.getElementById('login-btn').style.display = 'inline-block';
    document.getElementById('logout-btn').style.display = 'none';
    document.getElementById('cloud-save-btn').style.display = 'none';
    document.getElementById('add-bookmark-btn').style.display = 'inline-block';
    document.getElementById('cloud-login-btn').style.display = 'inline-block';
    
    // Обновляем заметку о закладках
    document.getElementById('cloud-note').innerHTML = `
        <p>⚠️ Локальные закладки (войдите для синхронизации)</p>
    `;
    
    // Обновляем информацию о библиотеке
    document.getElementById('library-books').innerHTML = `
        <div class="cloud-info">
            <p>Войдите в систему, чтобы получить доступ к:</p>
            <ul>
                <li>📁 Облачному хранению книг</li>
                <li>🔄 Синхронизации между устройствами</li>
                <li>🔖 Облачным закладкам</li>
                <li>⚙️ Сохранению настроек</li>
            </ul>
        </div>
    `;
}

function onUserLogin() {
    if (!user || user.isGuest) return;
    
    document.getElementById('user-info').style.display = 'flex';
    document.getElementById('user-name').textContent = user.displayName;
    document.getElementById('login-btn').style.display = 'none';
    document.getElementById('logout-btn').style.display = 'inline-block';
    document.getElementById('cloud-save-btn').style.display = 'inline-block';
    document.getElementById('add-bookmark-btn').style.display = 'inline-block';
    document.getElementById('cloud-login-btn').style.display = 'none';
    
    // Обновляем заметку о закладках
    document.getElementById('cloud-note').innerHTML = `
        <p>✅ Закладки синхронизируются с облаком</p>
    `;
    
    // Загружаем облачные данные
    loadCloudLibrary();
    loadCloudBookmarks();
    
    // Показываем сообщение
    showNotification(`Добро пожаловать, ${user.displayName}!`);
}

// ==================== МОДАЛЬНОЕ ОКНО ВХОДА ====================
function showLoginModal() {
    document.getElementById('login-modal').style.display = 'flex';
}

function closeLoginModal() {
    document.getElementById('login-modal').style.display = 'none';
}

async function modalLogin() {
    const email = document.getElementById('modal-email').value;
    const password = document.getElementById('modal-password').value;
    
    if (!email || !password) {
        alert('Заполните все поля');
        return;
    }
    
    try {
        const result = await firebase.auth().signInWithEmailAndPassword(email, password);
        closeLoginModal();
        showNotification('✅ Вход выполнен успешно!');
    } catch (error) {
        console.error('Ошибка входа:', error);
        alert('Ошибка входа: ' + error.message);
    }
}

// ==================== АВТОРИЗАЦИЯ (без изменений, но адаптированная) ====================
async function login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        alert('Заполните все поля');
        return;
    }
    
    try {
        const result = await firebase.auth().signInWithEmailAndPassword(email, password);
        hideAuthOverlay();
        showNotification('✅ Вход выполнен успешно!');
    } catch (error) {
        console.error('Ошибка входа:', error);
        alert('Ошибка входа: ' + error.message);
    }
}

async function loginWithGoogle() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await firebase.auth().signInWithPopup(provider);
        closeLoginModal();
        showNotification('✅ Вход через Google выполнен!');
    } catch (error) {
        console.error('Ошибка Google:', error);
        alert('Ошибка: ' + error.message);
    }
}

async function register() {
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    
    if (!name || !email || !password) {
        alert('Заполните все поля');
        return;
    }
    
    if (password.length < 6) {
        alert('Пароль должен содержать минимум 6 символов');
        return;
    }
    
    try {
        alert('⏳ Создание аккаунта...');
        
        const result = await firebase.auth().createUserWithEmailAndPassword(email, password);
        
        await result.user.updateProfile({
            displayName: name
        });
        
        await firebase.firestore().collection('users').doc(result.user.uid).set({
            name: name,
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
            settings: {
                theme: 'light',
                fontSize: 16
            }
        });
        
        alert('✅ Регистрация успешна!\nДобро пожаловать, ' + name + '!');
        showLogin();
        
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        alert('Ошибка: ' + error.message);
    }
}

function logout() {
    if (user && !user.isGuest) {
        firebase.auth().signOut();
    }
    isGuestMode = false;
    user = null;
    showAuthScreen();
    showNotification('Вы вышли из системы');
}

// ==================== ОБРАБОТКА ФАЙЛОВ (без изменений) ====================
function handleFileUpload(file) {
    currentBook = file;
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    if (fileExtension === 'txt') {
        loadTxtFile(file);
    } else if (fileExtension === 'pdf') {
        loadPdfFile(file);
    } else {
        alert('Выберите .txt или .pdf файл');
    }
}

function loadTxtFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        const bookContent = document.getElementById('book-content');
        bookContent.innerHTML = '<pre>' + escapeHtml(content) + '</pre>';
        bookContent.style.display = 'block';
        bookContent.style.fontSize = fontSize + 'px';
        
        document.getElementById('pdf-viewer').style.display = 'none';
        document.getElementById('pdf-controls').style.display = 'none';
        
        // Подсветка синтаксиса
        setTimeout(() => {
            document.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
        }, 100);
        
        addBookmark(`📄 ${file.name} (загружено)`);
    };
    reader.readAsText(file);
}

function loadPdfFile(file) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    
    const pdfViewer = document.getElementById('pdf-viewer');
    const bookContent = document.getElementById('book-content');
    const pdfControls = document.getElementById('pdf-controls');
    
    bookContent.style.display = 'none';
    pdfViewer.style.display = 'block';
    pdfControls.style.display = 'flex';
    
    pdfViewer.innerHTML = '<p>📚 Загрузка PDF...</p>';
    
    const fileReader = new FileReader();
    fileReader.onload = function() {
        const typedarray = new Uint8Array(this.result);
        
        pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
            pdfDoc = pdf;
            totalPages = pdf.numPages;
            currentPage = 1;
            
            document.getElementById('page-slider').max = totalPages;
            updatePageInfo();
            renderPage(currentPage);
            
            addBookmark(`📕 ${file.name} (стр. 1)`);
            
        }).catch(function(error) {
            console.error('Ошибка PDF:', error);
            pdfViewer.innerHTML = '<p style="color: red;">❌ Ошибка загрузки PDF</p>';
        });
    };
    fileReader.readAsArrayBuffer(file);
}

// ==================== ОБЛАЧНОЕ ХРАНИЛИЩЕ (только для зарегистрированных) ====================
async function saveToCloud() {
    if (!user || user.isGuest) {
        showLoginModal();
        return;
    }
    
    if (!currentBook) {
        alert('Сначала загрузите книгу');
        return;
    }
    
    try {
        showNotification('📤 Сохранение в облако...');
        
        const storageRef = firebase.storage().ref();
        const fileRef = storageRef.child(`books/${user.uid}/${Date.now()}_${currentBook.name}`);
        const uploadTask = await fileRef.put(currentBook);
        const downloadURL = await uploadTask.ref.getDownloadURL();
        
        const bookData = {
            name: currentBook.name,
            type: currentBook.type,
            size: currentBook.size,
            url: downloadURL,
            userId: user.uid,
            userName: user.displayName,
            uploadDate: firebase.firestore.FieldValue.serverTimestamp(),
            lastRead: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        const docRef = await firebase.firestore().collection('books').add(bookData);
        currentBookId = docRef.id;
        
        showNotification('✅ Книга сохранена в облако!');
        loadCloudLibrary();
        
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        alert('❌ Ошибка: ' + error.message);
    }
}

// ==================== ЗАКЛАДКИ (работают в обоих режимах) ====================
function addBookmark(text) {
    if (!text) {
        text = prompt('Введите название закладки:');
        if (!text) return;
    }
    
    const bookmarksList = document.getElementById('bookmarks-list');
    
    // Очищаем стартовое сообщение
    if (bookmarksList.children.length === 1 && 
        bookmarksList.children[0].textContent.includes('Загрузите книгу')) {
        bookmarksList.innerHTML = '';
    }
    
    const bookmark = document.createElement('li');
    bookmark.textContent = text;
    bookmark.onclick = function() {
        alert('Закладка: ' + text);
    };
    
    // Добавляем кнопку удаления
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '×';
    deleteBtn.className = 'delete-bookmark';
    deleteBtn.onclick = function(e) {
        e.stopPropagation();
        bookmark.remove();
        if (bookmarksList.children.length === 0) {
            bookmarksList.innerHTML = '<li>Нет закладок</li>';
        }
        
        // Сохраняем в облако если пользователь вошел
        if (user && !user.isGuest) {
            saveCloudBookmarks();
        }
    };
    
    bookmark.appendChild(deleteBtn);
    bookmarksList.appendChild(bookmark);
    
    // Сохраняем в облако если пользователь вошел
    if (user && !user.isGuest) {
        saveCloudBookmarks();
    }
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================
function showNotification(message) {
    // Создаем временное уведомление
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #48bb78;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatFileSize(bytes) {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ==================== НАСТРОЙКИ (работают в обоих режимах) ====================
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    if (user && !user.isGuest) {
        saveUserSettings();
    }
}

function increaseFont() {
    fontSize += 1;
    document.getElementById('book-content').style.fontSize = fontSize + 'px';
    localStorage.setItem('fontSize', fontSize);
    
    if (user && !user.isGuest) {
        saveUserSettings();
    }
}

function decreaseFont() {
    if (fontSize > 12) {
        fontSize -= 1;
        document.getElementById('book-content').style.fontSize = fontSize + 'px';
        localStorage.setItem('fontSize', fontSize);
        
        if (user && !user.isGuest) {
            saveUserSettings();
        }
    }
}

function loadLocalSettings() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    }
    
    const savedSize = localStorage.getItem('fontSize');
    if (savedSize) {
        fontSize = parseInt(savedSize);
        document.getElementById('book-content').style.fontSize = fontSize + 'px';
    }
}

// ==================== ФУНКЦИИ ДЛЯ ЗАРЕГИСТРИРОВАННЫХ ПОЛЬЗОВАТЕЛЕЙ ====================
async function loadCloudLibrary() {
    if (!user || user.isGuest) return;
    
    try {
        const libraryBooks = document.getElementById('library-books');
        libraryBooks.innerHTML = '<p>📡 Загрузка библиотеки...</p>';
        
        const querySnapshot = await firebase.firestore()
            .collection('books')
            .where('userId', '==', user.uid)
            .orderBy('uploadDate', 'desc')
            .limit(15)
            .get();
        
        if (querySnapshot.empty) {
            libraryBooks.innerHTML = '<p>📭 Нет сохраненных книг</p>';
            return;
        }
        
        libraryBooks.innerHTML = '';
        querySnapshot.forEach((doc) => {
            const book = doc.data();
            const bookElement = document.createElement('div');
            bookElement.className = 'cloud-book';
            bookElement.innerHTML = `
                <div class="cloud-book-title">📖 ${book.name}</div>
                <div class="cloud-book-meta">
                    <span>${formatFileSize(book.size)}</span>
                    <span>${book.uploadDate ? book.uploadDate.toDate().toLocaleDateString('ru-RU') : ''}</span>
                </div>
                <button onclick="loadBookFromCloud('${doc.id}', '${book.name}', '${book.url}')" class="load-btn">
                    📖 Открыть
                </button>
            `;
            libraryBooks.appendChild(bookElement);
        });
        
    } catch (error) {
        console.error('Ошибка библиотеки:', error);
        document.getElementById('library-books').innerHTML = '<p>❌ Ошибка загрузки</p>';
    }
}

async function loadCloudBookmarks() {
    if (!user || user.isGuest) return;
    
    try {
        const doc = await firebase.firestore()
            .collection('users').doc(user.uid)
            .collection('bookmarks').doc('current')
            .get();
        
        if (doc.exists) {
            const data = doc.data();
            const bookmarksList = document.getElementById('bookmarks-list');
            bookmarksList.innerHTML = '';
            
            if (data.bookmarks && data.bookmarks.length > 0) {
                data.bookmarks.forEach(bookmark => {
                    const li = document.createElement('li');
                    li.textContent = bookmark.text;
                    
                    const deleteBtn = document.createElement('button');
                    deleteBtn.textContent = '×';
                    deleteBtn.className = 'delete-bookmark';
                    deleteBtn.onclick = function(e) {
                        e.stopPropagation();
                        li.remove();
                        saveCloudBookmarks();
                    };
                    
                    li.appendChild(deleteBtn);
                    bookmarksList.appendChild(li);
                });
            }
        }
    } catch (error) {
        console.error('Ошибка закладок:', error);
    }
}

async function saveCloudBookmarks() {
    if (!user || user.isGuest) return;
    
    try {
        const bookmarksList = document.getElementById('bookmarks-list');
        const bookmarks = [];
        
        Array.from(bookmarksList.children).forEach(li => {
            bookmarks.push({
                text: li.textContent.replace('×', '').trim(),
                timestamp: new Date().toISOString()
            });
        });
        
        await firebase.firestore()
            .collection('users').doc(user.uid)
            .collection('bookmarks').doc('current')
            .set({
                bookmarks: bookmarks,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        
    } catch (error) {
        console.error('Ошибка сохранения закладок:', error);
    }
}

async function saveUserSettings() {
    if (!user || user.isGuest) return;
    
    try {
        const settings = {
            theme: document.body.classList.contains('dark-theme') ? 'dark' : 'light',
            fontSize: fontSize,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await firebase.firestore()
            .collection('users').doc(user.uid)
            .collection('settings').doc('preferences')
            .set(settings);
    } catch (error) {
        console.error('Ошибка настроек:', error);
    }
}

// ==================== ОСТАЛЬНЫЕ ФУНКЦИИ (PDF, навигация и т.д.) ====================
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
        });
    });
}

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

// Инициализируем Firebase
initializeFirebase();
