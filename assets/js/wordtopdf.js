document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    gtag('js', new Date());

    gtag('config', 'G-85PRXMJ9YE');
    const fileInput = document.getElementById('fileInput');
    const selectFiles = document.getElementById('selectFiles');
    const dropArea = document.getElementById('dropArea');
    const statusArea = document.getElementById('statusDiv');
    const statusText = document.getElementById('status');
    const convertBtn = document.getElementById('convertBtn');
    const clearBtn = document.getElementById('clearBtn');

    // Event Listeners
    fileInput.addEventListener('change', handleFileSelect);
    dropArea.addEventListener('dragover', handleDragOver);
    dropArea.addEventListener('dragleave', handleDragLeave);
    dropArea.addEventListener('drop', handleDrop);
    convertBtn.addEventListener('click', convertToPDF);
    clearBtn.addEventListener('click', resetConverter);

    // Functions
    function handleFileSelect(e) {
        const file = e.target.files[0];
        processSelectedFile(file);
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        dropArea.style.borderColor = '#3498db';
        dropArea.style.backgroundColor = '#f8fafc';
    }

    function handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        dropArea.style.borderColor = '#bdc3c7';
        dropArea.style.backgroundColor = 'white';
    }

    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        handleDragLeave(e);

        const file = e.dataTransfer.files[0];
        processSelectedFile(file);
    }
    selectFiles.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        fileInput.click();
    });

    function processSelectedFile(file) {
        if (!file) return;

        // Check if file is a Word document
        const validTypes = ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!validTypes.includes(file.type) && !file.name.match(/\.(doc|docx)$/i)) {
            alert('Please select a valid Word document (.doc or .docx)');
            return;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            alert('File size exceeds 10MB limit. Please choose a smaller file.');
            return;
        }

        selectedFile = file;
        dropArea.querySelector('h3').textContent = file.name;
        dropArea.querySelector('p').textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;
        convertBtn.disabled = false;
        clearBtn.disabled = false;
    }

    async function convertToPDF() {
        if (!selectedFile) return;

        statusArea.style.display = "block";
        statusArea.className = "status info";
        statusText.textContent = 'Reading Word document...';

        try {
            const arrayBuffer = await readFileAsArrayBuffer(selectedFile);
            statusText.textContent = 'Converting content...';

            // Convert to HTML first to preserve formatting
            const result = await mammoth.convertToHtml({ arrayBuffer });
            const htmlContent = result.value;

            statusText.textContent = 'Creating PDF...';

            // Create a temporary div to render the HTML
            const tempDiv = document.createElement('div');
            tempDiv.style.position = 'absolute';
            tempDiv.style.left = '-9999px';
            tempDiv.style.width = '800px';
            tempDiv.style.padding = '20px';
            tempDiv.innerHTML = htmlContent;
            document.body.appendChild(tempDiv);

            // Wait for images to load
            await waitForImages(tempDiv);

            // Convert HTML to PDF with proper pagination
            const pdf = await htmlToPdf(tempDiv);

            // Clean up
            document.body.removeChild(tempDiv);

            statusArea.className = "status success";
            statusText.textContent = 'Conversion complete! Downloading...';

            // Download the PDF
            const fileName = selectedFile.name.replace(/\.[^/.]+$/, '') + '.pdf';
            pdf.save(fileName);

        } catch (error) {
            console.error('Conversion error:', error);
            statusArea.className = "status error";
            statusText.textContent = 'Error during conversion. Please try again.';
        }
    }

    async function htmlToPdf(element) {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: document.getElementById('pageSize').value
        });

        const margin = parseInt(document.getElementById('marginSize').value);
        const pageWidth = pdf.internal.pageSize.getWidth() - margin * 2;
        const pageHeight = pdf.internal.pageSize.getHeight() - margin * 2;

        // Create a clone of the element to avoid modifying the original
        const elementClone = element.cloneNode(true);
        document.body.appendChild(elementClone);

        // Set the width to match our PDF page width
        elementClone.style.width = `${pageWidth}mm`;
        elementClone.style.padding = '0';
        elementClone.style.margin = '0';

        // Calculate how much content can fit on each page
        let position = 0;
        let pageNumber = 1;

        while (position < elementClone.scrollHeight) {
            // Create a canvas for the current page
            const canvas = await html2canvas(elementClone, {
                scale: 2,
                windowHeight: pageHeight * 3.78, // Convert mm to pixels (approx)
                y: position,
                height: pageHeight * 3.78,
                logging: false,
                useCORS: true
            });

            // Add the canvas image to the PDF
            const imgData = canvas.toDataURL('image/png');
            pdf.addImage(imgData, 'PNG', margin, margin, pageWidth, pageHeight);

            // If there's more content, add a new page
            position += pageHeight * 3.78;
            if (position < elementClone.scrollHeight) {
                pdf.addPage();
                pageNumber++;
            }
        }

        document.body.removeChild(elementClone);
        return pdf;
    }

    function waitForImages(element) {
        return new Promise((resolve) => {
            const images = element.getElementsByTagName('img');
            let loadedCount = 0;

            if (images.length === 0) {
                resolve();
                return;
            }

            for (let img of images) {
                if (img.complete) {
                    loadedCount++;
                } else {
                    img.onload = () => {
                        loadedCount++;
                        if (loadedCount === images.length) resolve();
                    };
                    img.onerror = () => {
                        loadedCount++;
                        if (loadedCount === images.length) resolve();
                    };
                }
            }

            if (loadedCount === images.length) {
                resolve();
            }
        });
    }

    function readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    function resetConverter() {
        // Reset file input
        fileInput.value = '';
        // Reset UI
        dropArea.querySelector('h3').textContent = 'Drag & Drop Word Files Here or click to browse';
        dropArea.querySelector('p').textContent = 'Supports .docx and .doc files (max 10MB)';
        convertBtn.disabled = true;
        clearBtn.disabled = true;
        // Reset status
        statusArea.style.display = "none";
        statusArea.className = "status";
        // Reset variables
        selectedFile = null;
    }
});