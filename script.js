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
});

// ==================== ИНИЦИАЛИЗАЦИЯ FIREBASE ====================
function initializeFirebase() {
    try {
        // Проверяем наличие Firebase
        if (typeof firebase === 'undefined') {
            console.error('Firebase SDK не найден');
            setTimeout(initializeFirebase, 1000); // Повторяем через секунду
            return;
        }
        
        // Инициализируем Firebase
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log('✅ Firebase инициализирован');
        }
        
        firebaseInitialized = true;
        
        // Слушатель состояния авторизации
        firebase.auth().onAuthStateChanged((firebaseUser) => {
            if (firebaseUser) {
                user = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName || firebaseUser.email
                };
                console.log('👤 Пользователь вошел:', user.email);
                onUserLogin();
            } else {
                user = null;
                console.log('👤 Пользователь вышел');
                onUserLogout();
            }
        });
        
    } catch (error) {
        console.error('❌ Ошибка Firebase:', error);
    }
}

// ==================== ОБРАБОТЧИКИ АВТОРИЗАЦИИ ====================
function showRegister() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
}

function showLogin() {
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
}

async function login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        alert('Заполните все поля');
        return;
    }
    
    try {
        const result = await firebase.auth().signInWithEmailAndPassword(email, password);
        console.log('Вход успешен');
    } catch (error) {
        console.error('Ошибка входа:', error);
        alert('Ошибка входа: ' + error.message);
    }
}

async function loginWithGoogle() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await firebase.auth().signInWithPopup(provider);
        console.log('Вход через Google успешен');
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
    
    try {
        // Создаем пользователя
        const result = await firebase.auth().createUserWithEmailAndPassword(email, password);
        
        // Обновляем имя
        await result.user.updateProfile({
            displayName: name
        });
        
        // Сохраняем в Firestore
        await firebase.firestore().collection('users').doc(result.user.uid).set({
            name: name,
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            settings: {
                theme: 'light',
                fontSize: 16
            }
        });
        
        alert('✅ Регистрация успешна!');
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        alert('Ошибка: ' + error.message);
    }
}

function logout() {
    firebase.auth().signOut();
    alert('Вы вышли из системы');
}

// ==================== ОБРАБОТЧИКИ ПОЛЬЗОВАТЕЛЯ ====================
function onUserLogin() {
    document.getElementById('auth-overlay').style.display = 'none';
    document.getElementById('user-info').style.display = 'flex';
    document.getElementById('user-name').textContent = user.displayName;
    document.getElementById('cloud-save-btn').style.display = 'inline-block';
    document.getElementById('add-bookmark-btn').style.display = 'inline-block';
    
    document.getElementById('book-content').innerHTML = `
        <h3>👋 Добро пожаловать, ${user.displayName}!</h3>
        <p>Загрузите книгу или выберите из облачной библиотеки.</p>
    `;
    
    loadCloudLibrary();
    loadCloudBookmarks();
}

function onUserLogout() {
    document.getElementById('auth-overlay').style.display = 'flex';
    document.getElementById('user-info').style.display = 'none';
    document.getElementById('cloud-save-btn').style.display = 'none';
    document.getElementById('add-bookmark-btn').style.display = 'none';
    
    document.getElementById('book-content').innerHTML = `
        <p>Добро пожаловать в IT Books Reader!<br>Войдите в систему, чтобы начать чтение.</p>
    `;
    
    document.getElementById('library-books').innerHTML = `
        <p>Войдите, чтобы увидеть ваши книги</p>
    `;
    
    document.getElementById('bookmarks-list').innerHTML = `
        <li>Закладки синхронизируются с облаком</li>
    `;
}

// ==================== ОБРАБОТКА ФАЙЛОВ ====================
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
    // Устанавливаем worker для pdf.js
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

// ==================== ОБЛАЧНОЕ ХРАНИЛИЩЕ ====================
async function saveToCloud() {
    if (!user) {
        alert('Войдите в систему');
        return;
    }
    
    if (!currentBook) {
        alert('Сначала загрузите книгу');
        return;
    }
    
    try {
        alert('📤 Сохранение в облако...');
        
        // 1. Сохраняем в Storage
        const storageRef = firebase.storage().ref();
        const fileRef = storageRef.child(`books/${user.uid}/${Date.now()}_${currentBook.name}`);
        const uploadTask = await fileRef.put(currentBook);
        const downloadURL = await uploadTask.ref.getDownloadURL();
        
        // 2. Сохраняем метаданные в Firestore
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
        
        alert('✅ Книга сохранена в облако!');
        loadCloudLibrary();
        
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        alert('❌ Ошибка: ' + error.message);
    }
}

async function loadCloudLibrary() {
    if (!user) return;
    
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

async function loadBookFromCloud(bookId, bookName, bookUrl) {
    try {
        alert(`📥 Загрузка: ${bookName}`);
        
        const response = await fetch(bookUrl);
        const blob = await response.blob();
        
        const file = new File([blob], bookName, { type: blob.type });
        currentBook = file;
        currentBookId = bookId;
        
        if (bookName.endsWith('.txt')) {
            loadTxtFile(file);
        } else if (bookName.endsWith('.pdf')) {
            loadPdfFile(file);
        }
        
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        alert('❌ Ошибка: ' + error.message);
    }
}

// ==================== ЗАКЛАДКИ ====================
async function loadCloudBookmarks() {
    if (!user) return;
    
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
                    li.onclick = () => alert('Закладка: ' + bookmark.text);
                    bookmarksList.appendChild(li);
                });
            } else {
                bookmarksList.innerHTML = '<li>Нет закладок</li>';
            }
        }
    } catch (error) {
        console.error('Ошибка закладок:', error);
    }
}

async function saveCloudBookmarks() {
    if (!user) return;
    
    try {
        const bookmarksList = document.getElementById('bookmarks-list');
        const bookmarks = [];
        
        Array.from(bookmarksList.children).forEach(li => {
            bookmarks.push({
                text: li.textContent,
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

function addBookmark(name
