// Wait for OpenCV.js to be ready
function onOpenCvReady() {
    console.log('OpenCV.js is ready');
    document.getElementById('uploadBtn').disabled = false;
    document.getElementById('uploadBtn').textContent = 'Select Image';
    document.getElementById('opencvLoading').style.display = 'none';
}

// Set up OpenCV.js ready callback
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('uploadBtn').disabled = true;
    document.getElementById('uploadBtn').textContent = 'Loading...';
    document.getElementById('opencvLoading').style.display = 'block';
    
    if (window.cv) {
        onOpenCvReady();
    } else {
        // Check every 100ms if OpenCV is loaded
        const checkOpenCV = setInterval(function() {
            if (window.cv) {
                clearInterval(checkOpenCV);
                onOpenCvReady();
            }
        }, 100);
    }
});

// DOM elements
const imageInput = document.getElementById('imageInput');
const uploadBtn = document.getElementById('uploadBtn');
const dropArea = document.getElementById('dropArea');
const loadingIndicator = document.getElementById('loadingIndicator');
const resultsSection = document.getElementById('resultsSection');
const actionButtons = document.getElementById('actionButtons');
const errorMessage = document.getElementById('errorMessage');
const themeToggle = document.getElementById('themeToggle');
const hamburger = document.getElementById('hamburger');
const navLinks = document.querySelector('.nav-links');

// Control elements
const blurSlider = document.getElementById('blurSlider');
const blurValue = document.getElementById('blurValue');
const contrastSlider = document.getElementById('contrastSlider');
const contrastValue = document.getElementById('contrastValue');
const invertToggle = document.getElementById('invertToggle');
const invertStatus = document.getElementById('invertStatus');
const colorOptions = document.querySelectorAll('.color-option');
const customColorInput = document.getElementById('customColorInput');
const customColorOption = document.getElementById('customColorOption');

// Button elements
const downloadButton = document.getElementById('downloadButton');
const resetButton = document.getElementById('resetButton');

// Canvas elements
const originalCanvas = document.getElementById('originalCanvas');
const sketchCanvas = document.getElementById('sketchCanvas');

// Current image data
let currentImage = null;
let currentImageDataUrl = null;
let selectedColor = 'black';
let selectedColorValue = '#000000';

// Hamburger menu toggle
hamburger.addEventListener('click', function() {
    this.classList.toggle('active');
    navLinks.classList.toggle('active');
    
    // Animate hamburger to X
    if (navLinks.classList.contains('active')) {
        this.querySelectorAll('span')[0].style.transform = 'rotate(45deg) translate(5px, 6px)';
        this.querySelectorAll('span')[1].style.opacity = '0';
        this.querySelectorAll('span')[2].style.transform = 'rotate(-45deg) translate(5px, -6px)';
    } else {
        this.querySelectorAll('span')[0].style.transform = 'rotate(0) translate(0)';
        this.querySelectorAll('span')[1].style.opacity = '1';
        this.querySelectorAll('span')[2].style.transform = 'rotate(0) translate(0)';
    }
});

// Theme management
function applyTheme(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    themeToggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
}

// Check for saved theme preference
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    applyTheme(true);
} else if (savedTheme === 'light') {
    applyTheme(false);
} else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    // Use system preference if no saved preference
    applyTheme(true);
}

themeToggle.addEventListener('click', function() {
    const isDark = !document.body.classList.contains('dark-mode');
    applyTheme(isDark);
});

// Event listeners
uploadBtn.addEventListener('click', () => imageInput.click());
imageInput.addEventListener('change', handleFileSelect);

// Drag and drop events
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, unhighlight, false);
});

function highlight() {
    dropArea.classList.add('dragover');
}

function unhighlight() {
    dropArea.classList.remove('dragover');
}

dropArea.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const file = dt.files[0];
    handleFile(file);
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    handleFile(file);
}

function handleFile(file) {
    errorMessage.style.display = 'none';
    
    if (!file) return;
    
    if (!file.type.match('image.*')) {
        errorMessage.textContent = 'Please select a valid image file';
        errorMessage.style.display = 'block';
        return;
    }
    
    // Check image size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
        errorMessage.textContent = 'Image is too large (max 5MB)';
        errorMessage.style.display = 'block';
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            // Check dimensions (3000px limit)
            if (this.width > 3000 || this.height > 3000) {
                errorMessage.textContent = 'Image dimensions are too large (max 3000x3000px)';
                errorMessage.style.display = 'block';
                return;
            }
            
            currentImageDataUrl = e.target.result;
            currentImage = img;
            showOriginalImage(img);
            processImage();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Color selection
colorOptions.forEach(option => {
    option.addEventListener('click', function() {
        // Don't allow selection of the custom color option directly
        if (this.id === 'customColorOption') return;
        
        colorOptions.forEach(opt => opt.classList.remove('selected'));
        this.classList.add('selected');
        selectedColor = this.dataset.color;
        selectedColorValue = this.style.backgroundColor;
        
        if (currentImage) processImage();
    });
});

// Custom color selection
customColorInput.addEventListener('input', function() {
    const color = this.value;
    customColorOption.style.backgroundColor = color;
    
    // Select the custom color option
    colorOptions.forEach(opt => opt.classList.remove('selected'));
    customColorOption.classList.add('selected');
    selectedColor = 'custom';
    selectedColorValue = color;
    
    if (currentImage) processImage();
});

// Control event listeners
blurSlider.addEventListener('input', function() {
    blurValue.textContent = this.value;
    if (currentImage) processImage();
});

contrastSlider.addEventListener('input', function() {
    contrastValue.textContent = this.value;
    if (currentImage) processImage();
});

invertToggle.addEventListener('change', function() {
    invertStatus.textContent = this.checked ? 'On' : 'Off';
    if (currentImage) processImage();
});

// Button event listeners
downloadButton.addEventListener('click', downloadSketch);
resetButton.addEventListener('click', resetAll);

function showOriginalImage(img) {
    const canvas = originalCanvas;
    const ctx = canvas.getContext('2d');
    
    // Calculate dimensions to fit in container while maintaining aspect ratio
    const maxWidth = 500;
    const maxHeight = 500;
    let width = img.width;
    let height = img.height;
    
    if (width > maxWidth) {
        const ratio = maxWidth / width;
        width = maxWidth;
        height = height * ratio;
    }
    
    if (height > maxHeight) {
        const ratio = maxHeight / height;
        height = maxHeight;
        width = width * ratio;
    }
    
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);
    
    // Show results section
    resultsSection.style.display = 'flex';
    actionButtons.style.display = 'flex';
}

function processImage() {
    if (!currentImage) return;
    
    // Disable controls during processing
    const controls = document.querySelectorAll('input, button, .color-option');
    controls.forEach(control => control.disabled = true);
    
    loadingIndicator.style.display = 'block';
    loadingIndicator.innerHTML = `
        <div class="spinner"></div>
        <p>Processing your image... <span id="progressText">0%</span></p>
        <progress id="processingProgress" value="0" max="100"></progress>
    `;
    
    // Simulate progress updates
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += 5;
        if (progress > 90) clearInterval(progressInterval);
        document.getElementById('processingProgress').value = progress;
        document.getElementById('progressText').textContent = `${progress}%`;
    }, 100);
    
    // Use setTimeout to allow UI to update before heavy processing
    setTimeout(() => {
        try {
            const canvas = sketchCanvas;
            const ctx = canvas.getContext('2d');
            
            // Match dimensions with original canvas
            canvas.width = originalCanvas.width;
            canvas.height = originalCanvas.height;
            
            // Draw the image first (resized)
            ctx.drawImage(currentImage, 0, 0, canvas.width, canvas.height);
            
            // Get values from controls
            const blurValue = parseInt(blurSlider.value);
            const contrastValue = parseInt(contrastSlider.value);
            const invertColors = invertToggle.checked;
            
            // Process with OpenCV
            let src = cv.imread(canvas);
            let gray = new cv.Mat();
            cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
            
            let processed = new cv.Mat();
            
            if (invertColors) {
                let inverted = new cv.Mat();
                cv.bitwise_not(gray, inverted);
                
                let blurred = new cv.Mat();
                let ksize = new cv.Size(blurValue, blurValue);
                cv.GaussianBlur(inverted, blurred, ksize, 0, 0);
                
                let invertedBlurred = new cv.Mat();
                cv.bitwise_not(blurred, invertedBlurred);
                
                cv.divide(gray, invertedBlurred, processed, contrastValue);
                
                // Clean up
                inverted.delete();
                blurred.delete();
                invertedBlurred.delete();
            } else {
                let blurred = new cv.Mat();
                let ksize = new cv.Size(blurValue, blurValue);
                cv.GaussianBlur(gray, blurred, ksize, 0, 0);
                
                cv.divide(gray, blurred, processed, contrastValue);
                blurred.delete();
            }
            
            // Apply the sketch effect to the canvas
            cv.imshow(canvas, processed);
            
            // Apply color to the sketch if not black
            if (selectedColor !== 'black') {
                applyColorToSketch(canvas, selectedColorValue);
            }
            
            // Clean up
            src.delete();
            gray.delete();
            processed.delete();
            
            // Complete progress
            clearInterval(progressInterval);
            document.getElementById('processingProgress').value = 100;
            document.getElementById('progressText').textContent = '100%';
            
            setTimeout(() => {
                loadingIndicator.style.display = 'none';
                controls.forEach(control => control.disabled = false);
            }, 500);
        } catch (error) {
            console.error('Error processing image:', error);
            clearInterval(progressInterval);
            loadingIndicator.style.display = 'none';
            controls.forEach(control => control.disabled = false);
            errorMessage.textContent = 'Error processing image. Please try another image.';
            errorMessage.style.display = 'block';
        }
    }, 100);
}

function applyColorToSketch(canvas, color) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Convert the hex color to RGB
    const r = parseInt(color.substr(1, 2), 16);
    const g = parseInt(color.substr(3, 2), 16);
    const b = parseInt(color.substr(5, 2), 16);
    
    // Apply the color while preserving the sketch's luminance
    for (let i = 0; i < data.length; i += 4) {
        const luminance = data[i] / 255; // Use red channel as grayscale value
        
        // Only apply color to non-white pixels (preserve white background)
        if (data[i] < 250 || data[i+1] < 250 || data[i+2] < 250) {
            data[i] = r * luminance;     // R
            data[i + 1] = g * luminance; // G
            data[i + 2] = b * luminance; // B
        }
        // Alpha channel (data[i+3]) remains unchanged
    }
    
    ctx.putImageData(imageData, 0, 0);
}

function downloadSketch() {
    const canvas = document.getElementById('sketchCanvas');
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    
    // Create a more descriptive filename
    const colorName = selectedColor === 'custom' ? 
        `custom-${selectedColorValue.substr(1)}` : selectedColor;
    const dateStr = new Date().toISOString().slice(0, 10);
    link.download = `sketch-${colorName}-${dateStr}.png`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function resetAll() {
    // Reset controls
    blurSlider.value = 21;
    blurValue.textContent = '21';
    contrastSlider.value = 256;
    contrastValue.textContent = '256';
    invertToggle.checked = false;
    invertStatus.textContent = 'Off';
    
    // Reset color selection
    colorOptions.forEach(opt => opt.classList.remove('selected'));
    document.querySelector('.color-option[data-color="black"]').classList.add('selected');
    selectedColor = 'black';
    selectedColorValue = '#000000';
    customColorInput.value = '#FF69B4';
    customColorOption.style.backgroundColor = '#FF69B4';
    
    // Clear canvases
    originalCanvas.getContext('2d').clearRect(0, 0, originalCanvas.width, originalCanvas.height);
    sketchCanvas.getContext('2d').clearRect(0, 0, sketchCanvas.width, sketchCanvas.height);
    
    // Hide results and buttons
    resultsSection.style.display = 'none';
    actionButtons.style.display = 'none';
    
    // Clear file input
    imageInput.value = '';
    
    // Reset image data
    currentImage = null;
    currentImageDataUrl = null;
    
    // Hide error message if visible
    errorMessage.style.display = 'none';
}

// Features Section Interactions
// Feature 1 - Sketch Style Toggle
const styleOptions = document.querySelectorAll('.style-option');
styleOptions.forEach(option => {
    option.addEventListener('click', function() {
        styleOptions.forEach(opt => opt.classList.remove('active'));
        this.classList.add('active');
        
        // In a real implementation, this would change the preview image
        const previewImage = this.closest('.feature-card').querySelector('.preview-image');
        previewImage.style.filter = `grayscale(${this.dataset.style === 'ink' ? '100%' : '0'})`;
    });
});

// Feature 2 - Adjustment Controls
const applyButtons = document.querySelectorAll('.apply-btn');
applyButtons.forEach(button => {
    button.addEventListener('click', function() {
        // In a real implementation, this would apply the changes
        this.textContent = 'Applied!';
        setTimeout(() => {
            this.textContent = 'Apply Changes';
        }, 1500);
    });
});

// Feature 3 - Image Comparison Slider
const comparisonSliders = document.querySelectorAll('.comparison-slider');
comparisonSliders.forEach(slider => {
    slider.addEventListener('input', function() {
        const before = this.closest('.preview-comparison').querySelector('.before');
        before.style.width = `${this.value}%`;
    });
});

// Feature 4 - Download Sample
const downloadButtons = document.querySelectorAll('.download-btn');
downloadButtons.forEach(button => {
    button.addEventListener('click', function() {
        // In a real implementation, this would download a sample
        this.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Downloaded!
        `;
        setTimeout(() => {
            this.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Download Sample
            `;
        }, 1500);
    });
});

// How It Works - Video Play Functionality
const videoPlaceholder = document.querySelector('.video-placeholder');
const playButton = document.querySelector('.play-button');

videoPlaceholder.addEventListener('click', function() {
    // In a real implementation, this would launch a modal with the video
    alert('Video player would launch here in the full implementation');
    
    // Example of how you might implement this with a video:
    // 1. Create a modal element
    // 2. Add an iframe with your video (YouTube/Vimeo/etc.)
    // 3. Show the modal when clicked
});

// Contact Form Submission
const contactForm = document.getElementById('contactForm');
const formMessage = document.createElement('div');
formMessage.className = 'form-message';
contactForm.appendChild(formMessage);

contactForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Get form values
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const subject = document.getElementById('subject').value;
    const message = document.getElementById('message').value;
    
    // Here you would typically send the data to a server
    // For demo purposes, we'll just show a success message
    formMessage.textContent = 'Thank you for your message! We will get back to you soon.';
    formMessage.className = 'form-message success';
    formMessage.style.display = 'block';
    
    // Reset form
    contactForm.reset();
    
    // Hide message after 5 seconds
    setTimeout(() => {
        formMessage.style.display = 'none';
    }, 5000);
});

// Animate elements on scroll
function animateOnScroll() {
    const features = document.querySelectorAll('.feature-card');
    const steps = document.querySelectorAll('.step');
    
    features.forEach((feature, index) => {
        const featurePosition = feature.getBoundingClientRect().top;
        const screenPosition = window.innerHeight / 1.3;
        
        if (featurePosition < screenPosition) {
            feature.style.opacity = '1';
            feature.style.transform = 'translateY(0)';
        }
    });
    
    steps.forEach((step, index) => {
        const stepPosition = step.getBoundingClientRect().top;
        const screenPosition = window.innerHeight / 1.3;
        
        if (stepPosition < screenPosition) {
            step.style.opacity = '1';
            step.style.transform = 'translateY(0)';
        }
    });
}

// Initialize animations
window.addEventListener('load', function() {
    const features = document.querySelectorAll('.feature-card');
    const steps = document.querySelectorAll('.step');
    
    features.forEach((feature, index) => {
        feature.style.opacity = '0';
        feature.style.transform = 'translateY(20px)';
        feature.style.transition = `opacity 0.5s ease ${index * 0.1}s, transform 0.5s ease ${index * 0.1}s`;
    });
    
    steps.forEach((step, index) => {
        step.style.opacity = '0';
        step.style.transform = 'translateY(20px)';
        step.style.transition = `opacity 0.5s ease ${index * 0.2}s, transform 0.5s ease ${index * 0.2}s`;
    });
    
    // Trigger initial animation check
    animateOnScroll();
});

window.addEventListener('scroll', animateOnScroll);

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop - document.querySelector('.navbar').offsetHeight,
                behavior: 'smooth'
            });
            
            // Close mobile menu if open
            if (navLinks.classList.contains('active')) {
                hamburger.classList.remove('active');
                navLinks.classList.remove('active');
                hamburger.querySelectorAll('span')[0].style.transform = 'rotate(0) translate(0)';
                hamburger.querySelectorAll('span')[1].style.opacity = '1';
                hamburger.querySelectorAll('span')[2].style.transform = 'rotate(0) translate(0)';
            }
        }
    });
});

// Disable right click and keyboard shortcuts
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
});

document.addEventListener('keydown', function(e) {
    // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
    if (e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && e.key === 'I') || 
        (e.ctrlKey && e.shiftKey && e.key === 'J') || 
        (e.ctrlKey && e.key === 'u') ||
        (e.ctrlKey && e.key === 'U')) {
        e.preventDefault();
    }
});