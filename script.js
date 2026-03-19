let PDFDocument;
let files = [];
let draggedElement = null;
let selectedPages = new Map(); // Map để lưu các trang được chọn

// Đợi thư viện load xong
window.addEventListener('DOMContentLoaded', () => {
    // Kiểm tra và load PDFLib
    if (typeof PDFLib !== 'undefined') {
        PDFDocument = PDFLib.PDFDocument;
    }
    
    // Cấu hình pdf.js worker
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
    
    initializeApp();
});

const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const mergeBtn = document.getElementById('mergeBtn');
const splitBtn = document.getElementById('splitBtn');
const previewBtn = document.getElementById('previewBtn');
const clearBtn = document.getElementById('clearBtn');
const uploadLabel = document.querySelector('.upload-label');
const previewModal = document.getElementById('previewModal');
const closeModalBtn = document.querySelector('.close-modal');
const closePreviewBtn = document.getElementById('closePreviewBtn');
const downloadPreviewBtn = document.getElementById('downloadPreviewBtn');
const previewContainer = document.getElementById('previewContainer');
const outputFileName = document.getElementById('outputFileName');

function initializeApp() {
    // Xử lý chọn file
    fileInput.addEventListener('change', handleFileSelect);

    // Xử lý kéo thả file vào upload box
    uploadLabel.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadLabel.style.background = '#e8ebff';
    });

    uploadLabel.addEventListener('dragleave', () => {
        uploadLabel.style.background = '#f8f9ff';
    });

    uploadLabel.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadLabel.style.background = '#f8f9ff';
        const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
        if (droppedFiles.length > 0) {
            handleFiles(droppedFiles);
        }
    });

    // Gộp file
    mergeBtn.addEventListener('click', handleMerge);

    // Tách file
    splitBtn.addEventListener('click', handleSplit);

    // Xóa tất cả
    clearBtn.addEventListener('click', handleClear);

    // Xem trước
    previewBtn.addEventListener('click', handlePreview);

    // Đóng modal
    closeModalBtn.addEventListener('click', () => {
        previewModal.classList.remove('show');
    });

    closePreviewBtn.addEventListener('click', () => {
        previewModal.classList.remove('show');
    });

    previewModal.addEventListener('click', (e) => {
        if (e.target === previewModal) {
            previewModal.classList.remove('show');
        }
    });

    // Tải về file đã chọn
    downloadPreviewBtn.addEventListener('click', handleDownloadPreview);
}



function handleFileSelect(e) {
    const selectedFiles = Array.from(e.target.files);
    handleFiles(selectedFiles);
}

function handleFiles(newFiles) {
    newFiles.forEach(file => {
        files.push({
            id: Date.now() + Math.random(),
            file: file,
            name: file.name,
            size: file.size
        });
    });
    renderFileList();
}

function renderFileList() {
    fileList.innerHTML = '';
    
    files.forEach((fileData, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.draggable = true;
        fileItem.dataset.id = fileData.id;
        
        fileItem.innerHTML = `
            <div class="drag-handle">⋮⋮</div>
            <div class="file-header">
                <div class="file-number">${index + 1}</div>
                <button class="delete-btn" onclick="deleteFile(${fileData.id})">×</button>
            </div>
            <div class="file-name">${fileData.name}</div>
            <div class="file-info">${formatFileSize(fileData.size)}</div>
        `;
        
        // Xử lý kéo thả để sắp xếp lại
        fileItem.addEventListener('dragstart', handleDragStart);
        fileItem.addEventListener('dragend', handleDragEnd);
        fileItem.addEventListener('dragover', handleDragOver);
        fileItem.addEventListener('drop', handleDrop);
        fileItem.addEventListener('dragenter', handleDragEnter);
        fileItem.addEventListener('dragleave', handleDragLeave);
        
        fileList.appendChild(fileItem);
    });
}

function handleDragStart(e) {
    draggedElement = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    document.querySelectorAll('.file-item').forEach(item => {
        item.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    if (this !== draggedElement) {
        this.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    if (draggedElement !== this) {
        const draggedId = parseInt(draggedElement.dataset.id);
        const targetId = parseInt(this.dataset.id);
        
        const draggedIndex = files.findIndex(f => f.id === draggedId);
        const targetIndex = files.findIndex(f => f.id === targetId);
        
        // Hoán đổi vị trí
        const temp = files[draggedIndex];
        files.splice(draggedIndex, 1);
        files.splice(targetIndex, 0, temp);
        
        renderFileList();
    }
    
    return false;
}

function deleteFile(id) {
    files = files.filter(f => f.id !== id);
    renderFileList();
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Gộp file
async function handleMerge() {
    if (files.length < 2) {
        alert('Vui lòng chọn ít nhất 2 file để gộp!');
        return;
    }
    
    // Hỏi tên file
    let fileName = prompt('Nhập tên file (không cần .pdf):', 'merged_file');
    if (fileName === null) return; // Người dùng hủy
    
    fileName = fileName.trim();
    if (!fileName) {
        fileName = 'merged_file';
    }
    fileName = fileName.replace(/\.pdf$/i, '');
    
    mergeBtn.disabled = true;
    mergeBtn.textContent = 'Đang xử lý...';
    
    try {
        const mergedPdf = await PDFDocument.create();
        
        for (const fileData of files) {
            const arrayBuffer = await fileData.file.arrayBuffer();
            const pdf = await PDFDocument.load(arrayBuffer);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach(page => mergedPdf.addPage(page));
        }
        
        const mergedPdfBytes = await mergedPdf.save();
        downloadFile(mergedPdfBytes, fileName + '.pdf');
        
        alert('Gộp file thành công!');
    } catch (error) {
        alert('Lỗi khi gộp file: ' + error.message);
    } finally {
        mergeBtn.disabled = false;
        mergeBtn.textContent = 'Gộp File';
    }
}

// Tách file
async function handleSplit() {
    if (files.length === 0) {
        alert('Vui lòng chọn file PDF để tách!');
        return;
    }
    
    splitBtn.disabled = true;
    splitBtn.textContent = 'Đang xử lý...';
    
    try {
        for (const fileData of files) {
            const arrayBuffer = await fileData.file.arrayBuffer();
            const pdf = await PDFDocument.load(arrayBuffer);
            const pageCount = pdf.getPageCount();
            
            for (let i = 0; i < pageCount; i++) {
                const newPdf = await PDFDocument.create();
                const [copiedPage] = await newPdf.copyPages(pdf, [i]);
                newPdf.addPage(copiedPage);
                
                const pdfBytes = await newPdf.save();
                const fileName = fileData.name.replace('.pdf', '') + `_trang_${i + 1}.pdf`;
                downloadFile(pdfBytes, fileName);
            }
        }
        
        alert('Tách file thành công!');
    } catch (error) {
        alert('Lỗi khi tách file: ' + error.message);
    } finally {
        splitBtn.disabled = false;
        splitBtn.textContent = 'Tách File';
    }
}

// Xóa tất cả
function handleClear() {
    if (files.length === 0) return;
    if (confirm('Bạn có chắc muốn xóa tất cả file?')) {
        files = [];
        fileInput.value = '';
        renderFileList();
    }
}

// Xem trước
async function handlePreview() {
    if (files.length === 0) {
        alert('Vui lòng chọn file PDF để xem trước!');
        return;
    }
    
    previewBtn.disabled = true;
    previewBtn.textContent = 'Đang tải...';
    
    try {
        await renderPreview();
        previewModal.classList.add('show');
    } catch (error) {
        alert('Lỗi khi xem trước: ' + error.message);
    } finally {
        previewBtn.disabled = false;
        previewBtn.textContent = 'Xem Trước';
    }
}

// Render preview
async function renderPreview() {
    previewContainer.innerHTML = '';
    selectedPages.clear();
    
    for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
        const fileData = files[fileIndex];
        
        // Tạo section cho mỗi file
        const fileSection = document.createElement('div');
        fileSection.className = 'preview-file-section';
        
        const fileTitle = document.createElement('div');
        fileTitle.className = 'preview-file-title';
        fileTitle.textContent = `${fileIndex + 1}. ${fileData.name}`;
        fileSection.appendChild(fileTitle);
        
        const pagesContainer = document.createElement('div');
        pagesContainer.className = 'preview-container';
        
        const arrayBuffer = await fileData.file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        // Khởi tạo tất cả trang được chọn
        if (!selectedPages.has(fileData.id)) {
            selectedPages.set(fileData.id, new Set());
            for (let i = 1; i <= pdf.numPages; i++) {
                selectedPages.get(fileData.id).add(i);
            }
        }
        
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 0.5 });
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;
            
            const pageDiv = document.createElement('div');
            pageDiv.className = 'preview-page selected';
            pageDiv.dataset.fileId = fileData.id;
            pageDiv.dataset.pageNum = pageNum;
            pageDiv.dataset.fileIndex = fileIndex;
            pageDiv.draggable = true;
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'page-checkbox';
            checkbox.checked = true;
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                togglePageSelection(fileData.id, pageNum, pageDiv);
            });
            
            const dragHandle = document.createElement('div');
            dragHandle.className = 'page-drag-handle';
            dragHandle.textContent = '⋮⋮';
            
            const pageNumber = document.createElement('div');
            pageNumber.className = 'page-number';
            pageNumber.textContent = `Trang ${pageNum}`;
            
            pageDiv.appendChild(dragHandle);
            pageDiv.appendChild(checkbox);
            pageDiv.appendChild(canvas);
            pageDiv.appendChild(pageNumber);
            
            pageDiv.addEventListener('click', (e) => {
                if (!e.target.classList.contains('page-checkbox') && !e.target.classList.contains('page-drag-handle')) {
                    checkbox.checked = !checkbox.checked;
                    togglePageSelection(fileData.id, pageNum, pageDiv);
                }
            });
            
            // Thêm sự kiện kéo thả cho trang
            pageDiv.addEventListener('dragstart', handlePageDragStart);
            pageDiv.addEventListener('dragend', handlePageDragEnd);
            pageDiv.addEventListener('dragover', handlePageDragOver);
            pageDiv.addEventListener('drop', handlePageDrop);
            pageDiv.addEventListener('dragenter', handlePageDragEnter);
            pageDiv.addEventListener('dragleave', handlePageDragLeave);
            
            pagesContainer.appendChild(pageDiv);
        }
        
        fileSection.appendChild(pagesContainer);
        previewContainer.appendChild(fileSection);
    }
}

function togglePageSelection(fileId, pageNum, pageDiv) {
    const filePages = selectedPages.get(fileId);
    
    if (filePages.has(pageNum)) {
        filePages.delete(pageNum);
        pageDiv.classList.remove('selected');
    } else {
        filePages.add(pageNum);
        pageDiv.classList.add('selected');
    }
}

// Xử lý kéo thả trang
let draggedPage = null;

function handlePageDragStart(e) {
    draggedPage = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handlePageDragEnd() {
    this.classList.remove('dragging');
    document.querySelectorAll('.preview-page').forEach(page => {
        page.classList.remove('drag-over');
    });
}

function handlePageDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handlePageDragEnter() {
    if (this !== draggedPage) {
        this.classList.add('drag-over');
    }
}

function handlePageDragLeave() {
    this.classList.remove('drag-over');
}

function handlePageDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    if (draggedPage !== this) {
        const container = this.parentNode;
        const allPages = Array.from(container.children);
        const draggedIndex = allPages.indexOf(draggedPage);
        const targetIndex = allPages.indexOf(this);
        
        if (draggedIndex < targetIndex) {
            container.insertBefore(draggedPage, this.nextSibling);
        } else {
            container.insertBefore(draggedPage, this);
        }
    }
    
    return false;
}

// Tải về file đã chọn
async function handleDownloadPreview() {
    downloadPreviewBtn.disabled = true;
    downloadPreviewBtn.textContent = 'Đang xử lý...';
    
    try {
        const mergedPdf = await PDFDocument.create();
        
        // Lấy tất cả các trang theo thứ tự hiện tại trong DOM
        const allPageDivs = document.querySelectorAll('.preview-page');
        
        if (allPageDivs.length === 0) {
            alert('Không có trang nào để tải!');
            return;
        }
        
        let hasSelectedPages = false;
        
        for (const pageDiv of allPageDivs) {
            const checkbox = pageDiv.querySelector('.page-checkbox');
            
            // Chỉ xử lý các trang được chọn
            if (!checkbox.checked) continue;
            
            hasSelectedPages = true;
            
            const fileId = parseFloat(pageDiv.dataset.fileId);
            const pageNum = parseInt(pageDiv.dataset.pageNum);
            
            // Tìm file tương ứng
            const fileData = files.find(f => f.id === fileId);
            if (!fileData) continue;
            
            const arrayBuffer = await fileData.file.arrayBuffer();
            const pdf = await PDFDocument.load(arrayBuffer);
            
            const [copiedPage] = await mergedPdf.copyPages(pdf, [pageNum - 1]);
            mergedPdf.addPage(copiedPage);
        }
        
        if (!hasSelectedPages) {
            alert('Vui lòng chọn ít nhất một trang!');
            return;
        }
        
        const mergedPdfBytes = await mergedPdf.save();
        
        // Lấy tên file từ input
        let fileName = outputFileName.value.trim();
        if (!fileName) {
            fileName = 'merged_file';
        }
        // Loại bỏ .pdf nếu người dùng đã nhập
        fileName = fileName.replace(/\.pdf$/i, '');
        
        downloadFile(mergedPdfBytes, fileName + '.pdf');
        
        alert('Tải file thành công!');
        previewModal.classList.remove('show');
    } catch (error) {
        alert('Lỗi khi tạo file: ' + error.message);
    } finally {
        downloadPreviewBtn.disabled = false;
        downloadPreviewBtn.textContent = 'Tải Về File Đã Chọn';
    }
}

function downloadFile(pdfBytes, fileName) {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
