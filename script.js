import { storage } from "./firebase.js";
import { ref, uploadBytes, getDownloadURL } from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const reader = document.getElementById("reader");
const fileInput = document.getElementById("fileInput");
const themeBtn = document.getElementById("themeBtn");
const fullscreenBtn = document.getElementById("fullscreenBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

let pages = [];
let currentPage = 0;
let pdfDoc = null;
let pdfPage = 1;

/* ===== ТЕМА ===== */
themeBtn.onclick = () => {
  document.body.classList.toggle("dark");
  document.body.classList.toggle("light");
};

/* ===== ЗАГРУЗКА ===== */
fileInput.onchange = async () => {
  const file = fileInput.files[0];
  if (!file) return;

  const fileRef = ref(storage, `books/${file.name}`);
  await uploadBytes(fileRef, file);
  const url = await getDownloadURL(fileRef);

  if (file.type === "text/plain") loadTXT(url);
  if (file.type === "application/pdf") loadPDF(url);
};

/* ===== TXT ===== */
async function loadTXT(url) {
  const res = await fetch(url);
  const text = await res.text();

  pages = text.match(/(.|[\r\n]){1,1500}/g);
  currentPage = 0;
  pdfDoc = null;
  showTXT();
}

function showTXT() {
  reader.textContent = pages[currentPage];
}

/* ===== PDF ===== */
function loadPDF(url) {
  pdfjsLib.getDocument(url).promise.then(pdf => {
    pdfDoc = pdf;
    pdfPage = 1;
    pages = [];
    renderPDF();
  });
}

function renderPDF() {
  pdfDoc.getPage(pdfPage).then(page => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const viewport = page.getViewport({ scale: 1.4 });

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    reader.innerHTML = "";
    reader.appendChild(canvas);

    page.render({ canvasContext: ctx, viewport });
  });
}

/* ===== НАВИГАЦИЯ ===== */
function changePage(step) {
  if (pages.length) {
    currentPage = Math.max(0, Math.min(pages.length - 1, currentPage + step));
    showTXT();
  }

  if (pdfDoc) {
    pdfPage = Math.max(1, Math.min(pdfDoc.numPages, pdfPage + step));
    renderPDF();
  }
}

prevBtn.onclick = () => changePage(-1);
nextBtn.onclick = () => changePage(1);

/* ===== СТРЕЛКИ ПК ===== */
document.addEventListener("keydown", e => {
  if (e.key === "ArrowLeft") changePage(-1);
  if (e.key === "ArrowRight") changePage(1);
});

/* ===== ПОЛНЫЙ ЭКРАН ===== */
fullscreenBtn.onclick = () => {
  if (!document.fullscreenElement) {
    reader.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
};
