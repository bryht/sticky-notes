// This script will generate icon PNGs and download them automatically
document.addEventListener('DOMContentLoaded', function() {
    // Create a button to trigger all icon downloads
    const downloadButton = document.createElement('button');
    downloadButton.textContent = 'Generate & Download All Icons';
    downloadButton.style.padding = '10px 20px';
    downloadButton.style.fontSize = '16px';
    downloadButton.style.backgroundColor = '#4CAF50';
    downloadButton.style.color = 'white';
    downloadButton.style.border = 'none';
    downloadButton.style.borderRadius = '4px';
    downloadButton.style.cursor = 'pointer';
    downloadButton.style.marginTop = '20px';
    downloadButton.style.marginBottom = '20px';
    
    // Add button to the page
    const instructionsDiv = document.querySelector('.instructions');
    instructionsDiv.after(downloadButton);
    
    // Function to convert SVG to canvas and download as PNG
    function downloadIcon(svgElement, fileName) {
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        // Set canvas size to match SVG
        canvas.width = parseInt(svgElement.getAttribute('width'));
        canvas.height = parseInt(svgElement.getAttribute('height'));
        
        img.onload = function() {
            // Draw SVG on canvas
            ctx.drawImage(img, 0, 0);
            
            // Convert to data URL and trigger download
            const dataURL = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = fileName;
            link.href = dataURL;
            link.click();
        };
        
        // Load SVG data
        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    }
    
    // Handle click event
    downloadButton.addEventListener('click', function() {
        // Get all SVG elements
        const svgElements = document.querySelectorAll('svg');
        
        // Download each as PNG
        downloadIcon(svgElements[0], 'icon16.png');
        
        // Add a slight delay between downloads to prevent browser issues
        setTimeout(() => {
            downloadIcon(svgElements[1], 'icon48.png');
            
            setTimeout(() => {
                downloadIcon(svgElements[2], 'icon128.png');
                
                // Show success message
                const successMsg = document.createElement('div');
                successMsg.textContent = 'All icons downloaded! Move them to your extension\'s "icons" folder.';
                successMsg.style.padding = '10px';
                successMsg.style.backgroundColor = '#DFF2BF';
                successMsg.style.color = '#4F8A10';
                successMsg.style.borderRadius = '4px';
                successMsg.style.marginTop = '20px';
                
                downloadButton.after(successMsg);
            }, 500);
        }, 500);
    });
});