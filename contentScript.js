// Sticky Notes Extension - Content Script

// Create container for all notes
function createNotesContainer() {
  const container = document.createElement('div');
  container.id = 'sticky-notes-container';
  document.body.appendChild(container);
  return container;
}

// Generate a unique ID for each note
function generateId() {
  return 'note-' + Date.now();
}

// Create a new sticky note
function createNote(content = '', position = null, id = null) {
  const noteId = id || generateId();
  const container = document.getElementById('sticky-notes-container');
  
  // If position is not provided, determine a position
  if (!position) {
    // Get existing notes to determine offset position
    const existingNotes = document.querySelectorAll('.sticky-note');
    if (existingNotes.length > 0) {
      // Use offset position for new notes (increment by 20px for each existing note)
      const offsetAmount = 20 + (existingNotes.length * 10);
      position = { 
        top: `${100 + offsetAmount}px`, 
        left: `${100 + offsetAmount}px` 
      };
    } else {
      // Default position for first note
      position = { top: '100px', left: '100px' };
    }
  }
  
  const note = document.createElement('div');
  note.className = 'sticky-note';
  note.id = noteId;
  note.style.cssText = `
    position: absolute;
    top: ${position.top};
    left: ${position.left};
    width: 200px;
    min-height: 200px;
    background-color: #fff59d;
    box-shadow: 0 3px 6px rgba(0,0,0,0.2);
    padding: 2px;
    border-radius: 2px;
    z-index: 9998;
    display: flex;
    flex-direction: column;
  `;
  
  // Create note header with actions
  const noteHeader = document.createElement('div');
  noteHeader.className = 'note-header';
  noteHeader.style.cssText = `
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
    cursor: move;
    background-color: #ffeb3b;
    padding: 5px;
    border-radius: 1px;
  `;
  
  // Create "All Notes" button
  const allNotesBtn = document.createElement('span');
  allNotesBtn.innerHTML = '☰';
  allNotesBtn.title = 'View all notes';
  allNotesBtn.style.cssText = `
    cursor: pointer;
    color:#060606;
    margin-right: 10px;
  `;
  allNotesBtn.addEventListener('click', () => {
    showAllNotesDashboard();
  });
  
  const deleteBtn = document.createElement('span');
  deleteBtn.innerHTML = '✕';
  deleteBtn.title = 'Delete note';
  deleteBtn.style.cssText = `
    cursor: pointer;
    color: #060606;
  `;
  deleteBtn.addEventListener('click', () => {
    note.remove();
    saveNotes();
  });
  
  const actionContainer = document.createElement('div');
  actionContainer.style.cssText = `
    display: flex;
    gap: 8px;
  `;
  actionContainer.appendChild(allNotesBtn);
  actionContainer.appendChild(deleteBtn);
  
  noteHeader.appendChild(document.createElement('span')); // Spacer
  noteHeader.appendChild(actionContainer);
  
  // Create editable content area
  const noteContent = document.createElement('div');
  noteContent.className = 'note-content';
  noteContent.contentEditable = true;
  noteContent.innerHTML = content;
  noteContent.style.cssText = `
    flex-grow: 1;
    outline: none;
    font-family: Arial, sans-serif;
    font-size: 14px;
    line-height: 1.4;
    color: #333333;
    padding: 5px;
  `;
  noteContent.addEventListener('input', saveNotes);
  
  // Add elements to note
  note.appendChild(noteHeader);
  note.appendChild(noteContent);
  
  // Make note draggable
  makeDraggable(note, noteHeader);
  
  container.appendChild(note);
  saveNotes();
  
  return note;
}

// Show dashboard with all notes from all URLs
function showAllNotesDashboard() {
  // Create dashboard container
  const dashboard = document.createElement('div');
  dashboard.id = 'notes-dashboard';
  dashboard.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.7);
    z-index: 10000;
    display: flex;
    justify-content: center;
    align-items: center;
  `;
  
  // Add loading indicator
  const loadingIndicator = document.createElement('div');
  loadingIndicator.textContent = 'Loading notes...';
  loadingIndicator.style.cssText = `
    color: white;
    font-family: Arial, sans-serif;
    font-size: 18px;
  `;
  dashboard.appendChild(loadingIndicator);
  
  // Add dashboard to page
  document.body.appendChild(dashboard);
  
  // Load all notes
  getAllNotes().then(allNotes => {
    // Remove loading indicator
    dashboard.removeChild(loadingIndicator);
    
    // Create dashboard content
    const dashboardContent = document.createElement('div');
    dashboardContent.style.cssText = `
      width: 80%;
      max-width: 800px;
      max-height: 80vh;
      background-color: white;
      border-radius: 4px;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    `;
    
    // Create dashboard header
    const dashboardHeader = document.createElement('div');
    dashboardHeader.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      background-color: #ffeb3b;
      color: #222;
      font-weight: bold;
      font-family: Arial, sans-serif;
    `;
    
    const dashboardTitle = document.createElement('h2');
    dashboardTitle.textContent = 'All Notes';
    dashboardTitle.style.margin = '0';
    dashboardTitle.style.color = '#222';
    
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '✕';
    closeButton.style.cssText = `
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      color: #d32f2f;
    `;
    closeButton.addEventListener('click', () => {
      dashboard.remove();
    });
    
    // Add elements to header in correct order
    dashboardHeader.appendChild(dashboardTitle);
    dashboardHeader.appendChild(closeButton);
    
    // Create notes list container
    const notesListContainer = document.createElement('div');
    notesListContainer.style.cssText = `
      padding: 16px;
      overflow-y: auto;
      max-height: calc(80vh - 160px);
    `;
    
    if (allNotes.length > 0) {
      // Create a table for notes
      const notesTable = document.createElement('table');
      notesTable.style.cssText = `
        width: 100%;
        border-collapse: collapse;
        font-family: Arial, sans-serif;
      `;
      
      // Add table header
      const tableHeader = document.createElement('thead');
      tableHeader.innerHTML = `
        <tr>
          <th style="text-align: left; padding: 10px; border-bottom: 1px solid #ddd; width: 60%; color: #222;">Content</th>
          <th style="text-align: left; padding: 10px; border-bottom: 1px solid #ddd; width: 20%; color: #222;">Page</th>
          <th style="text-align: center; padding: 10px; border-bottom: 1px solid #ddd; width: 20%; color: #222;">Actions</th>
        </tr>
      `;
      notesTable.appendChild(tableHeader);
      
      // Add table body
      const tableBody = document.createElement('tbody');
      
      // Sort notes by timestamp (most recent first)
      allNotes.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      
      allNotes.forEach((noteData, index) => {
        const row = document.createElement('tr');
        row.style.cssText = `
          border-bottom: 1px solid #eee;
          ${index % 2 === 0 ? 'background-color: #f9f9f9;' : ''}
        `;
        
        // Create content preview cell
        const contentCell = document.createElement('td');
        contentCell.style.padding = '10px';
        
        const contentPreview = document.createElement('div');
        contentPreview.style.cssText = `
          max-height: 100px;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          color: #222;
        `;
        
        // Strip HTML tags for preview
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = noteData.content;
        const textContent = tempDiv.textContent || tempDiv.innerText || '';
        contentPreview.textContent = textContent.substring(0, 100) + (textContent.length > 100 ? '...' : '');
        
        contentCell.appendChild(contentPreview);
        
        // Create URL cell
        const urlCell = document.createElement('td');
        urlCell.style.padding = '10px';
        
        const urlPreview = document.createElement('a');
        urlPreview.href = noteData.url;
        urlPreview.textContent = new URL(noteData.url).hostname;
        urlPreview.title = noteData.url;
        urlPreview.target = '_blank';
        urlPreview.style.cssText = `
          text-decoration: none;
          color: #2196F3;
        `;
        
        urlCell.appendChild(urlPreview);
        
        // Create actions cell
        const actionsCell = document.createElement('td');
        actionsCell.style.cssText = `
          padding: 10px;
          text-align: center;
        `;
        
        // Create delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.style.cssText = `
          background-color: #d32f2f;
          color: white;
          border: none;
          padding: 5px 10px;
          border-radius: 3px;
          cursor: pointer;
        `;
        deleteBtn.addEventListener('click', () => {
          // Delete note via background script
          chrome.runtime.sendMessage({
            action: 'deleteNote',
            noteId: noteData.id,
            url: noteData.url
          }, function(response) {
            console.log('Note deleted:', response);
            
            // Remove from current page if present
            const noteElement = document.getElementById(noteData.id);
            if (noteElement) {
              noteElement.remove();
            }
            
            // Remove row from dashboard
            row.remove();
            
            // If no more notes, update the display
            if (tableBody.children.length === 0) {
              notesListContainer.innerHTML = '<p style="text-align: center; color: #777;">No notes found.</p>';
            }
          });
        });
        
        actionsCell.appendChild(deleteBtn);
        
        // Add cells to row
        row.appendChild(contentCell);
        row.appendChild(urlCell);
        row.appendChild(actionsCell);
        
        // Add row to table
        tableBody.appendChild(row);
      });
      
      notesTable.appendChild(tableBody);
      notesListContainer.appendChild(notesTable);
    } else {
      // No notes message
      const noNotesMessage = document.createElement('p');
      noNotesMessage.textContent = 'No notes found.';
      noNotesMessage.style.cssText = `
        text-align: center;
        color: #444;
        font-family: Arial, sans-serif;
      `;
      notesListContainer.appendChild(noNotesMessage);
    }
    
    // Add premium section
    const premiumSection = document.createElement('div');
    premiumSection.style.cssText = `
      padding: 16px;
      background-color: #f5f5f5;
      border-top: 1px solid #ddd;
      text-align: center;
      font-family: Arial, sans-serif;
    `;
    
    // Check if user is premium
    checkPremiumStatus().then(isPremium => {
      if (isPremium) {
        // User already has premium
        const premiumMessage = document.createElement('div');
        premiumMessage.innerHTML = `
          <span style="color: #4CAF50; font-weight: bold;">✓ Premium Features Active</span>
          <p style="margin: 5px 0; color: #555;">Thank you for your support!</p>
        `;
        premiumSection.appendChild(premiumMessage);
      } else {
        // User doesn't have premium yet
        const premiumInfo = document.createElement('div');
        premiumInfo.innerHTML = `
          <h3 style="margin-top: 0; color: #333;">Support Our Development</h3>
          <ul style="text-align: left; display: inline-block; color: #555;">
            <li>Help us improve the sticky notes extension</li>
            <li>Enable future feature development</li>
            <li>Keep the extension ad-free</li>
          </ul>
        `;
        
        const paymentButton = document.createElement('button');
        paymentButton.textContent = 'Donate $1 with Google Pay';
        paymentButton.style.cssText = `
          background-color: #4285F4;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          font-weight: bold;
          cursor: pointer;
          margin-top: 10px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 10px auto;
        `;
        
        // Add Google Pay logo
        const googlePayLogo = document.createElement('img');
        googlePayLogo.src = 'https://www.gstatic.com/instantbuy/svg/dark_gpay.svg';
        googlePayLogo.style.height = '18px';
        googlePayLogo.style.marginRight = '8px';
        paymentButton.prepend(googlePayLogo);
        
        premiumInfo.appendChild(paymentButton);
        premiumSection.appendChild(premiumInfo);
        
        paymentButton.addEventListener('click', () => {
          initiatePayment();
        });
      }
    });
    
    // Add elements to dashboard
    dashboardContent.appendChild(dashboardHeader);
    dashboardContent.appendChild(notesListContainer);
    // TODO:dashboardContent.appendChild(premiumSection);
    dashboard.appendChild(dashboardContent);
    
    // Add event listener to close dashboard when clicking outside
    dashboard.addEventListener('click', (e) => {
      if (e.target === dashboard) {
        dashboard.remove();
      }
    });
  });
}

// Check if user has premium status
function checkPremiumStatus() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      action: 'checkPremiumStatus'
    }, function(response) {
      resolve(response && response.isPremium);
    });
  });
}

// Initiate the payment process
function initiatePayment() {
  // Create payment modal
  const paymentModal = document.createElement('div');
  paymentModal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.8);
    z-index: 10001;
    display: flex;
    justify-content: center;
    align-items: center;
  `;
  
  const paymentForm = document.createElement('div');
  paymentForm.style.cssText = `
    background-color: white;
    border-radius: 8px;
    padding: 20px;
    width: 90%;
    max-width: 400px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
    text-align: center;
  `;
  
  // Create Google Pay content
  paymentForm.innerHTML = `
    <h2 style="text-align: center; margin-top: 0; color: #333;">Donate with Google Pay</h2>
    <p style="text-align: center; color: #555;">Your $1 donation helps us continue development</p>
    
    <div style="margin: 30px 0; text-align: center;">
      <div id="google-pay-button" style="display: inline-block; cursor: pointer;">
        <button style="background-color: black; border-radius: 4px; border: none; padding: 12px 24px; display: flex; align-items: center; justify-content: center;">
          <img src="https://www.gstatic.com/instantbuy/svg/light_gpay.svg" alt="Google Pay" style="height: 24px;">
        </button>
      </div>
    </div>
    
    <div style="margin-top: 20px; color: #666; font-size: 12px;">
      <p>Secure payment processed by Google Pay</p>
    </div>
    
    <div style="display: flex; justify-content: center; margin-top: 20px;">
      <button id="cancel-payment" style="padding: 10px 15px; border: none; background-color: #f5f5f5; color: #333; border-radius: 4px; cursor: pointer;">Cancel</button>
    </div>
  `;
  
  paymentModal.appendChild(paymentForm);
  document.body.appendChild(paymentModal);
  
  // Add event listeners
  document.getElementById('cancel-payment').addEventListener('click', () => {
    paymentModal.remove();
  });
  
  // Simulate Google Pay button click handler
  document.getElementById('google-pay-button').addEventListener('click', () => {
    // Show loading state
    document.getElementById('google-pay-button').innerHTML = `
      <div style="padding: 12px 24px; background-color: black; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
        <div style="width: 20px; height: 20px; border: 2px solid #fff; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
    
    // Simulate payment processing
    setTimeout(() => {
      // Send message to background script to update donation status
      chrome.runtime.sendMessage({
        action: 'setDonationStatus',
        hasDonated: true
      }, function(response) {
        // Remove payment modal
        paymentModal.remove();
        
        // Show success message
        const successModal = document.createElement('div');
        successModal.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.8);
          z-index: 10001;
          display: flex;
          justify-content: center;
          align-items: center;
        `;
        
        const successContent = document.createElement('div');
        successContent.style.cssText = `
          background-color: white;
          border-radius: 8px;
          padding: 20px;
          width: 90%;
          max-width: 400px;
          text-align: center;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
        `;
        
        successContent.innerHTML = `
          <div style="color: #4CAF50; font-size: 48px; margin-bottom: 10px;">✓</div>
          <h2 style="color: #333; margin-top: 0;">Thank You!</h2>
          <p style="color: #555;">Your $1 donation helps us continue to improve the extension.</p>
          <button id="success-ok" style="padding: 10px 20px; background-color: #4285F4; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 10px;">Continue</button>
        `;
        
        successModal.appendChild(successContent);
        document.body.appendChild(successModal);
        
        document.getElementById('success-ok').addEventListener('click', () => {
          successModal.remove();
          // Refresh the dashboard
          const dashboard = document.getElementById('notes-dashboard');
          if (dashboard) {
            dashboard.remove();
            showAllNotesDashboard();
          }
        });
      });
    }, 2000);
  });
  
  // Close modal when clicking outside
  paymentModal.addEventListener('click', (e) => {
    if (e.target === paymentModal) {
      paymentModal.remove();
    }
  });
}

// Make an element draggable
function makeDraggable(element, handle) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  
  handle.onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    // Get the mouse cursor position at startup
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // Call a function whenever the cursor moves
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // Calculate the new cursor position
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // Set the element's new position
    element.style.top = (element.offsetTop - pos2) + "px";
    element.style.left = (element.offsetLeft - pos1) + "px";
    
    // Debounce the save operation
    clearTimeout(element.saveTimeout);
    element.saveTimeout = setTimeout(saveNotes, 500);
  }

  function closeDragElement() {
    // Stop moving when mouse button is released
    document.onmouseup = null;
    document.onmousemove = null;
    saveNotes();
  }
}

// Save all notes to extension storage
function saveNotes() {
  const notes = document.querySelectorAll('.sticky-note');
  const currentUrl = window.location.href.split('#')[0]; // Ignore hash part of URL
  
  // Create notes data for current page
  const currentPageNotes = [];
  notes.forEach(note => {
    const noteId = note.id;
    const noteData = {
      id: noteId,
      content: note.querySelector('.note-content').innerHTML,
      position: {
        top: note.style.top,
        left: note.style.left
      },
      url: currentUrl,
      timestamp: Date.now()
    };
    currentPageNotes.push(noteData);
  });
  
  // Send message to background script to save notes
  chrome.runtime.sendMessage({
    action: 'saveNotes',
    url: currentUrl,
    notes: currentPageNotes
  }, function(response) {
    console.log('Notes saved:', response);
  });
}

// Load notes from extension storage
function loadNotes() {
  const currentUrl = window.location.href.split('#')[0];
  
  // Request notes from background script
  chrome.runtime.sendMessage({
    action: 'getNotes',
    url: currentUrl
  }, function(response) {
    if (response && response.notes && response.notes.length > 0) {
      response.notes.forEach(noteData => {
        createNote(noteData.content, noteData.position, noteData.id);
      });
    }
  });
}

// Get all notes from all URLs
function getAllNotes() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      action: 'getAllNotes'
    }, function(response) {
      resolve(response.notes || []);
    });
  });
}

// Initialize the extension
function init() {
  createNotesContainer();
  loadNotes();
  
  // Add listener for extension icon clicks
  chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      if (request.action === 'createNote') {
        createNote();
        sendResponse({success: true});
      }
      return true;
    }
  );
  
  // Add custom styles
  const styles = document.createElement('style');
  styles.textContent = `
    .sticky-note:hover {
      box-shadow: 0 5px 10px rgba(0,0,0,0.3);
    }
    .note-content:focus {
      background-color: rgba(255, 255, 255, 0.4);
      color: #1a1a1a;
    }
    #notes-dashboard button:hover {
      opacity: 0.9;
    }
    .sticky-note {
      color: #333333;
    }
  `;
  document.head.appendChild(styles);
}

// Start the extension
init();
