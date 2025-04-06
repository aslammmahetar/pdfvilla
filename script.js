// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function () {
    // Initialize variables
    const fileInput = document.getElementById('fileInput');
    const dropArea = document.getElementById('dropArea');
    const previewContainer = document.getElementById('previewContainer');
    const imageGrid = document.getElementById('imageGrid');
    const convertBtn = document.getElementById('convertBtn');
    const clearBtn = document.getElementById('clearBtn');
    const statusDiv = document.getElementById('status');

    let images = [];

    // Initialize jsPDF
    const { jsPDF } = window.jspdf;

    // Event listeners for drag and drop
    dropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropArea.classList.add('highlight');
    });

    dropArea.addEventListener('dragleave', () => {
        dropArea.classList.remove('highlight');
    });

    dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dropArea.classList.remove('highlight');

        const files = e.dataTransfer.files;
        handleFiles(files);
    });

    // Event listener for file input change
    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    // Event listener for convert button
    convertBtn.addEventListener('click', convertToPDF);

    // Event listener for clear button
    clearBtn.addEventListener('click', clearAll);

    // Function to handle selected files
    function handleFiles(files) {
        if (files.length === 0) return;

        // Filter only image files
        const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));

        if (imageFiles.length === 0) {
            showStatus('Please select only image files.', 'error');
            return;
        }

        // Process each image file
        imageFiles.forEach(file => {
            const reader = new FileReader();

            reader.onload = function (e) {
                const img = new Image();
                img.src = e.target.result;

                img.onload = function () {
                    images.push({
                        file: file,
                        dataUrl: e.target.result,
                        width: img.width,
                        height: img.height
                    });

                    updatePreview();
                };
            };

            reader.readAsDataURL(file);
        });
    }

    // Function to update the image preview
    function updatePreview() {
        if (images.length === 0) {
            previewContainer.style.display = 'none';
            convertBtn.disabled = true;
            clearBtn.disabled = true;
            return;
        }

        previewContainer.style.display = 'block';
        convertBtn.disabled = false;
        clearBtn.disabled = false;

        // Clear previous preview
        imageGrid.innerHTML = '';

        // Add each image to the preview
        images.forEach((image, index) => {
            const imageItem = document.createElement('div');
            imageItem.className = 'image-item';

            const imgElement = document.createElement('img');
            imgElement.src = image.dataUrl;
            imgElement.alt = image.file.name;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.innerHTML = '×';
            removeBtn.title = 'Remove this image';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeImage(index);
            });

            imageItem.appendChild(imgElement);
            imageItem.appendChild(removeBtn);
            imageGrid.appendChild(imageItem);
        });
    }

    // Function to remove an image
    function removeImage(index) {
        images.splice(index, 1);
        updatePreview();
    }

    // Function to clear all images
    function clearAll() {
        images = [];
        fileInput.value = '';
        updatePreview();
        showStatus('All images cleared.', 'success');
    }

    // Function to convert images to PDF
    function convertToPDF() {
        if (images.length === 0) {
            showStatus('No images to convert.', 'error');
            return;
        }

        const pdfName = document.getElementById('pdfName').value.trim() || 'output';
        const pageSize = document.getElementById('pageSize').value;
        const orientation = document.getElementById('orientation').value;
        const margin = parseInt(document.getElementById('margin').value) || 0;

        // Create a new PDF document
        const pdf = new jsPDF({
            orientation: orientation,
            unit: 'mm'
        });

        // Set page size based on selection
        let pageWidth, pageHeight;

        switch (pageSize) {
            case 'a4':
                pageWidth = 210;
                pageHeight = 297;
                break;
            case 'letter':
                pageWidth = 215.9;
                pageHeight = 279.4;
                break;
            case 'a5':
                pageWidth = 148;
                pageHeight = 210;
                break;
            case 'fit':
                // Will be handled per image
                break;
            default:
                pageWidth = 210;
                pageHeight = 297;
        }

        // Process each image
        images.forEach((image, index) => {
            if (index > 0) {
                pdf.addPage();
            }

            let imgWidth, imgHeight;
            const marginPoints = margin;

            if (pageSize === 'fit') {
                // Fit to image dimensions (converting pixels to mm at 96dpi)
                const pxToMm = 25.4 / 96;
                imgWidth = image.width * pxToMm;
                imgHeight = image.height * pxToMm;

                // Set PDF page size to image size plus margins
                pdf.setPageSize([imgWidth + marginPoints * 2, imgHeight + marginPoints * 2]);

                // Add image to PDF
                pdf.addImage(image.dataUrl, 'JPEG', marginPoints, marginPoints, imgWidth, imgHeight);
            } else {
                // Calculate image dimensions to fit the page with margins
                const pageRatio = (pageWidth - marginPoints * 2) / (pageHeight - marginPoints * 2);
                const imgRatio = image.width / image.height;

                if (imgRatio > pageRatio) {
                    // Image is wider than page
                    imgWidth = pageWidth - marginPoints * 2;
                    imgHeight = (imgWidth / image.width) * image.height;
                } else {
                    // Image is taller than page
                    imgHeight = pageHeight - marginPoints * 2;
                    imgWidth = (imgHeight / image.height) * image.width;
                }

                // Center the image on the page
                const x = (pageWidth - imgWidth) / 2;
                const y = (pageHeight - imgHeight) / 2;

                // Add image to PDF
                pdf.addImage(image.dataUrl, 'JPEG', x, y, imgWidth, imgHeight);
            }
        });

        // Save the PDF
        pdf.save(`${pdfName}.pdf`);
        showStatus('PDF created successfully!', 'success');
    }

    // Function to show status messages
    function showStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.className = 'status ' + type;

        // Hide status after 5 seconds
        setTimeout(() => {
            statusDiv.className = 'status';
            statusDiv.textContent = '';
        }, 5000);
    }
});