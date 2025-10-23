const upIn = document.getElementById("template-upload");
const upBtn = document.getElementById("template-upload-btn");
const dragLi = document.getElementById("drag-drop-hint");
const cvs = document.getElementById("template-canvas");
const ctx = cvs.getContext("2d");
const nextB = document.getElementById("next-btn");
const backB = document.getElementById("back-btn");
const instr = document.getElementById("instruction-label");
const setDiv = document.getElementById("settings");
const downloadSettingsDiv = document.getElementById("download-settings");
const fontSel = document.getElementById("font-style");
const sizeSel = document.getElementById("font-size");
const colorIn = document.getElementById("font-color");
const fileB = document.getElementById("file-upload-btn");
const namesIn = document.getElementById("names-file");
const formatDesc = document.getElementById("format-description");

let img = new Image(),
  drag = false,
  step2 = false,
  sx,
  sy,
  ex,
  ey;

// 📱 NEW: Mobile-specific variables
let isMobile = false;
let mobileTextY = 275; // Default center Y position for mobile
let mobileVerticalDrag = false;
let lastTouchY = 0;

// Font loading tracker
let fontsLoaded = false;
let fontsLoadingPromise = null;

// 📱 NEW: Check if device is mobile (480px and below)
function checkMobile() {
  isMobile = window.innerWidth <= 768;
  return isMobile;
}

// 📱 NEW: Initialize mobile check
checkMobile();
window.addEventListener('resize', checkMobile);

// Force load all fonts on page load
function forceLoadAllFonts() {
  if (fontsLoadingPromise) {
    return fontsLoadingPromise;
  }

  const fontList = [
    'Anton', 'Arimo', 'Orbitron', 'Ballet', 'Bebas Neue', 'Cabin',
    'DM Sans', 'Fira Sans', 'Heebo', 'Inter', 'Josefin Sans', 'Karla',
    'Lato', 'Libre Baskerville', 'Merriweather', 'Montserrat', 'Mukta',
    'Noto Sans', 'Nunito', 'Open Sans', 'Oswald', 'Playfair Display',
    'Poppins', 'PT Sans', 'Raleway', 'Roboto Slab', 'Roboto', 'Ubuntu', 'Work Sans'
  ];

  if ('fonts' in document) {
    const fontPromises = fontList.map(fontName => {
      return document.fonts.load(`40px "${fontName}"`).catch(() => {
        console.warn(`Failed to load font: ${fontName}`);
      });
    });

    fontsLoadingPromise = Promise.all(fontPromises).then(() => {
      fontsLoaded = true;
      console.log('✅ All fonts loaded successfully!');
      return true;
    }).catch(() => {
      fontsLoaded = true;
      console.warn('⚠️ Some fonts failed to load, continuing...');
      return true;
    });

    return fontsLoadingPromise;
  } else {
    fontsLoadingPromise = new Promise((resolve) => {
      setTimeout(() => {
        fontsLoaded = true;
        console.log('✅ Font loading timeout completed');
        resolve(true);
      }, 2000);
    });
    return fontsLoadingPromise;
  }
}

/* fill size dropdown */
for (let i = 1; i <= 120; i++) {
  const o = document.createElement("option");
  o.value = i;
  o.text = i;
  if (i === 50) o.selected = true;
  sizeSel.appendChild(o);
}

/* Update format description when radio button changes */
function updateFormatDescription() {
  const selectedFormat = document.querySelector('input[name="output-format"]:checked');
  if (selectedFormat) {
    if (selectedFormat.value === "pdf") {
      formatDesc.textContent = "Single PDF with all certificates";
      if (fileB) fileB.textContent = "Generate PDF";
    } else {
      formatDesc.textContent = "Individual PNG files in ZIP archive";
      if (fileB) fileB.textContent = "Generate PNGs";
    }
  }
}

/* Add event listeners to radio buttons and start font loading */
document.addEventListener('DOMContentLoaded', function() {
  console.log('🔄 Starting font preload...');
  forceLoadAllFonts();
  
  const formatRadios = document.querySelectorAll('input[name="output-format"]');
  formatRadios.forEach(radio => {
    radio.addEventListener('change', updateFormatDescription);
  });
  updateFormatDescription();
});

/* ===== DRAG & DROP FUNCTIONALITY ===== */
const canvasContainer = document.getElementById("canvas-container");
const canvas = document.getElementById("template-canvas");
const dragOverlay = document.getElementById("canvas-overlay");

// Prevent default drag behaviors on the entire document
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  document.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

// Highlight drag area when file is dragged over
['dragenter', 'dragover'].forEach(eventName => {
  canvasContainer.addEventListener(eventName, highlight, false);
  canvas.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
  canvasContainer.addEventListener(eventName, unhighlight, false);
  canvas.addEventListener(eventName, unhighlight, false);
});

function highlight(e) {
  dragOverlay.classList.add('active');
  canvas.classList.add('drag-hover');
}

function unhighlight(e) {
  dragOverlay.classList.remove('active');
  canvas.classList.remove('drag-hover');
}

// Handle dropped files
canvasContainer.addEventListener('drop', handleDrop, false);
canvas.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
  const dt = e.dataTransfer;
  const files = dt.files;
  
  if (files.length > 0) {
    const file = files[0];
    
    // Validate file type
    const validTypes = ['image/png', 'image/jpg', 'image/jpeg'];
    if (!validTypes.includes(file.type)) {
      alert('Please drop a valid image file (PNG, JPG, JPEG)');
      return;
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size too large. Please use files under 10MB.');
      return;
    }
    
    // Process the dropped file (same as file input)
    processTemplateFile(file);
  }
}

function processTemplateFile(file) {
  const reader = new FileReader();
  
  reader.onload = (ev) => {
    img.onload = () => {
      // ✅ SET CANVAS SIZE - This is the fix!
      cvs.width = 900;
      cvs.height = 550;
      
      ctx.drawImage(img, 0, 0, 900, 550);
      
      // Hide upload button and show instructions
      upIn.hidden = true;
      
      // 📱 NEW: Auto-setup for mobile
      if (checkMobile()) {
        setupMobileMode();
      }
      
      // Show success message
      showDropSuccess();
    };
    img.src = ev.target.result;
  };
  
  reader.readAsDataURL(file);
  cvs.style.cursor = checkMobile() ? "grab" : "crosshair";
}

// 📱 NEW: Mobile setup function
function setupMobileMode() {
  // Auto-set text area for mobile (center horizontally, middle vertically)
  sx = 50;  // 50px from left
  sy = mobileTextY - 30; // Text area top
  ex = 850; // 850px from left (800px width)
  ey = mobileTextY + 30; // Text area bottom (60px height)
  
  // Skip normal dragging flow
  upIn.hidden = upBtn.hidden = true;
  dragLi.textContent = "Drag the name up/down to position it";
  instr.style.display = "none";
  
  // Show buttons immediately
  nextB.style.display = backB.style.display = "inline-block";
  
  // Show preview
  preview();
}

function showDropSuccess() {
  // Create temporary success message
  const successMsg = document.createElement('div');
  successMsg.innerHTML = `
    <div style="position: absolute; top: 10px; right: 10px; background: #1ec1cb; color: white; padding: 8px 12px; border-radius: 5px; font-size: 12px; z-index: 100; box-shadow: 0 4px 15px rgba(30, 193, 203, 0.3);">
      ✅ Template uploaded successfully!
    </div>
  `;
  canvasContainer.appendChild(successMsg);
  
  // Remove message after 3 seconds
  setTimeout(() => {
    if (successMsg.parentNode) {
      successMsg.parentNode.removeChild(successMsg);
    }
  }, 3000);
}

/* choose template - Updated to use shared processing function */
upBtn.onclick = () => upIn.click();
upIn.onchange = (e) => {
  const f = e.target.files[0];
  if (!f) return;
  processTemplateFile(f);
};

/* 📱 NEW: Mobile touch events for vertical dragging */
cvs.addEventListener('touchstart', (e) => {
  if (!checkMobile() || !img.src) return;
  
  e.preventDefault();
  const touch = e.touches[0];
  const rect = cvs.getBoundingClientRect();
  lastTouchY = touch.clientY - rect.top;
  mobileVerticalDrag = true;
  cvs.style.cursor = "grabbing";
});

cvs.addEventListener('touchmove', (e) => {
  if (!checkMobile() || !mobileVerticalDrag) return;
  
  e.preventDefault();
  const touch = e.touches[0];
  const rect = cvs.getBoundingClientRect();
  const currentTouchY = touch.clientY - rect.top;
  
  // Calculate movement (scaled to canvas coordinates)
  const deltaY = (currentTouchY - lastTouchY) * (550 / rect.height);
  
  // Update mobile text Y position (with bounds)
  mobileTextY = Math.max(50, Math.min(500, mobileTextY + deltaY));
  
  // Update text area coordinates
  sy = mobileTextY - 30;
  ey = mobileTextY + 30;
  
  // Update preview
  preview();
  
  lastTouchY = currentTouchY;
});

cvs.addEventListener('touchend', (e) => {
  if (!checkMobile()) return;
  
  e.preventDefault();
  mobileVerticalDrag = false;
  cvs.style.cursor = "grab";
});

/* 🖥️ DESKTOP: Normal drag rectangle */
cvs.onmousedown = (e) => {
  if (!img.src) return;
  
  // Skip desktop dragging on mobile
  if (checkMobile()) return;
  
  drag = true;
  const r = cvs.getBoundingClientRect();
  sx = e.clientX - r.left;
  sy = e.clientY - r.top;
  if (!step2) {
    upIn.hidden = upBtn.hidden = true;
    dragLi.textContent = "Now drag to select where names will be printed";
    dragLi.style.fontSize = "20px";
    dragLi.style.paddingTop = "25px";
    instr.style.display = "none";
  }
};

cvs.onmousemove = (e) => {
  if (!drag || checkMobile()) return;
  const r = cvs.getBoundingClientRect();
  ex = e.clientX - r.left;
  ey = e.clientY - r.top;
  drawRect();
};

cvs.onmouseup = async () => {
  if (!drag || checkMobile()) return;
  drag = false;
  
  // WAIT for fonts before drawing preview
  await forceLoadAllFonts();
  
  preview();
  if (!step2) {
    nextB.style.display = backB.style.display = "inline-block";
  }
};

function drawRect() {
  ctx.clearRect(0, 0, 900, 550);
  ctx.drawImage(img, 0, 0, 900, 550);
  ctx.strokeStyle = "red";
  ctx.setLineDash([6]);
  ctx.strokeRect(sx, sy, ex - sx, ey - sy);
}

async function preview() {
  if (!sx || !ex) return;
  
  // CRITICAL: Wait for fonts to load before drawing
  if (!fontsLoaded) {
    await forceLoadAllFonts();
  }
  
  if (!checkMobile()) {
    drawRect();
  } else {
    // Mobile: Just redraw image without rectangle
    ctx.clearRect(0, 0, 900, 550);
    ctx.drawImage(img, 0, 0, 900, 550);
  }
  
  const cx = (sx + ex) / 2,
    cy = (sy + ey) / 2;
  const fam = fontSel.value;
  
  // Set font with fallback
  ctx.font = `${sizeSel.value}px "${fam}", Arial, sans-serif`;
  ctx.fillStyle = colorIn.value;
  ctx.textAlign = "center";
  ctx.setLineDash([]);
  ctx.fillText("Your Name", cx, cy);
  
  // 📱 Mobile: Show drag indicator
  if (checkMobile()) {
    ctx.strokeStyle = "#1ec1cb";
    ctx.setLineDash([4]);
    ctx.strokeRect(sx, sy, ex - sx, ey - sy);
    
    // Add drag arrows
    ctx.fillStyle = "#1ec1cb";
    ctx.font = "20px Arial";
    ctx.fillText("▲", cx + 100, sy - 10);
    ctx.fillText("▼", cx + 100, ey + 25);
  }
}

/* Sort font dropdown alphabetically */
(function sortFontDropdown() {
  const select = document.getElementById("font-style");
  const opts = Array.from(select.options);
  opts.sort((a, b) =>
    a.text.toLowerCase().localeCompare(b.text.toLowerCase())
  );
  opts.forEach((o) => select.appendChild(o));
})();

/* nav */
nextB.onclick = () => {
  dragLi.textContent = "Select the names File,Font and Download settings below";
  setDiv.style.display = "block";
  downloadSettingsDiv.style.display = "block";  
  nextB.style.display = "none";
  fileB.style.display = "inline-block";
  step2 = true;
  updateFormatDescription();
};

backB.onclick = () => {
  setDiv.style.display =
    downloadSettingsDiv.style.display =
    nextB.style.display =
    fileB.style.display =
    backB.style.display =
      "none";
  dragLi.textContent = "Or Drag & Drop your certificate template here";
  dragLi.style.display = "block";
  dragLi.style.fontSize = "";
  dragLi.style.paddingTop = ""; 
  upIn.hidden = upBtn.hidden = false;
  instr.style.display = "block";
  ctx.clearRect(0, 0, 900, 550);
  img = new Image();
  upIn.value = "";
  namesIn.value = "";
  step2 = false;
  
  // 📱 NEW: Reset mobile state
  mobileTextY = 275;
  mobileVerticalDrag = false;
};

/* live preview - WAIT for fonts */
fontSel.onchange = async () => {
  await forceLoadAllFonts();
  preview();
};

sizeSel.onchange = async () => {
  await forceLoadAllFonts();
  preview();
};

colorIn.onchange = preview;

/* choose names file */
fileB.onclick = () => namesIn.click();
namesIn.onchange = async () => {
  if (!namesIn.files.length) return;
  if (!upIn.files.length) {
    alert("Upload a template first");
    return;
  }
  
  const formatElement = document.querySelector('input[name="output-format"]:checked');
  if (!formatElement) {
    alert("Please select an output format");
    return;
  }
  
  const format = formatElement.value;
  fileB.textContent = format === "pdf" ? "Generating PDF..." : "Generating PNGs...";
  fileB.disabled = true;
  
  try {
    const fd = new FormData();
    fd.append("template", upIn.files[0]);
    fd.append("names", namesIn.files[0]);
    fd.append("font_style", fontSel.value);
    fd.append("font_size", sizeSel.value);
    fd.append("font_color", colorIn.value);
    fd.append("coords", [sx, sy, ex, ey].join(","));
    fd.append("output_format", format);
    
    const res = await fetch("/generate", { method: "POST", body: fd });
    if (!res.ok) throw new Error(`Server ${res.status}`);
    
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    
    if (format === "pdf") {
      a.download = "Certificates.pdf";
    } else {
      a.download = "Certificates.zip";
    }
    
    a.click();
    namesIn.value = "";
  } catch (err) {
    alert("Error: " + err.message);
  }
  
  fileB.textContent = format === "pdf" ? "Generate PDF" : "Generate PNGs";
  fileB.disabled = false;
};

/* ===== COMBINED MODAL & MOBILE MENU SYSTEM ===== */
document.addEventListener('DOMContentLoaded', function() {
    // MODAL ELEMENTS
    const modalOverlay = document.getElementById('modal-overlay');
    const modalContent = document.getElementById('modal-content');
    const modalBody = document.getElementById('modal-body');
    const modalClose = document.getElementById('modal-close');
    
    const aboutBtn = document.getElementById('about-btn');
    const creatorsBtn = document.getElementById('creators-btn');
    const projectsBtn = document.getElementById('projects-btn');
    const contactBtn = document.getElementById('contact-btn');

    // MOBILE MENU ELEMENTS
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileCloseBtn = document.getElementById('mobile-close-btn');
    const mobileAbout = document.getElementById('mobile-about');
    const mobileCreators = document.getElementById('mobile-creators');
    const mobileProjects = document.getElementById('mobile-projects');
    const mobileContact = document.getElementById('mobile-contact');

    // MODAL CONTENT TEMPLATES
    const modalContents = {
        about: `
            <h2>About CertiHub</h2>
            <p>🎓 <strong>CertiHub</strong> is a powerful, easy-to-use certificate generator that helps you create professional certificates in minutes!</p>
            
            <ul class="feature-list">
                <li>Upload any certificate template</li>
                <li>Drag and position text areas</li>
                <li>Choose from 25+ professional fonts</li>
                <li>Bulk generate certificates from CSV/TXT files</li>
                <li>Export as PDF or PNG images</li>
                <li>Mobile-friendly responsive design</li>
                <li>Completely free to use</li>
            </ul>
            
            <p>Perfect for schools, organizations, workshops, and events. Generate hundreds of certificates with just a few clicks!</p>
            
            <p><strong>Version:</strong> 2.0 | <strong>Last Updated:</strong> October 2025</p>
        `,
        
        creators: `
            <h2>Meet the Creators</h2>
            <p>CertiHub is proudly created by a passionate team of developers:</p>
            
            <div class="creator-card">
                <div class="name">🚀 Development Team</div>
                <div class="role">Full-Stack Developers</div>
                <div class="bio">Passionate developers focused on creating useful tools that make certificate generation simple and efficient.</div>
            </div>
            
            <div class="creator-card">
                <div class="name">🎨 Design Team</div>
                <div class="role">UI/UX Designers</div>
                <div class="bio">Crafting beautiful, intuitive interfaces that make complex tasks feel effortless.</div>
            </div>
            
            <p>💝 Built with love using Flask, JavaScript, and modern web technologies.</p>
            <p>🌟 Thank you for using CertiHub and supporting our work!</p>
        `,
        
        projects: `
            <h2>Other Projects</h2>
            <p>🚀 Explore more useful tools and projects:</p>
            
            <ul class="feature-list">
                <li><strong>QR Generator Pro</strong> - Advanced QR code generator</li>
                <li><strong>Image Optimizer</strong> - Compress and optimize images</li>
                <li><strong>Text Utils</strong> - Collection of text processing tools</li>
                <li><strong>Color Palette Generator</strong> - Create beautiful color schemes</li>
                <li><strong>Invoice Generator</strong> - Professional invoice creator</li>
                <li><strong>Resume Builder</strong> - Modern resume templates</li>
            </ul>
            
            <p>🌐 More projects coming soon! Stay tuned for updates.</p>
            <p>💡 Have an idea for a useful tool? Let us know!</p>
        `,
        
        contact: `
            <h2>Get in Touch</h2>
            <p>📬 We'd love to hear from you! Reach out for support, feedback, or collaboration:</p>
            
            <div class="creator-card">
                <div class="name">📧 Email Support</div>
                <div class="role">General Inquiries</div>
                <div class="bio">support@certihub.com<br>We typically respond within 24 hours</div>
            </div>
            
            <div class="creator-card">
                <div class="name">🐛 Bug Reports</div>
                <div class="role">Technical Issues</div>
                <div class="bio">bugs@certihub.com<br>Help us improve CertiHub</div>
            </div>
            
            <div class="creator-card">
                <div class="name">💡 Feature Requests</div>
                <div class="role">Suggestions & Ideas</div>
                <div class="bio">features@certihub.com<br>Share your ideas with us</div>
            </div>
            
            <p>🌟 <strong>Love CertiHub?</strong> Share it with your friends and colleagues!</p>
        `
    };

    // MODAL FUNCTIONS
    function openModal(content) {
        if (modalBody && modalOverlay) {
            modalBody.innerHTML = modalContents[content];
            modalOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeModal() {
        if (modalOverlay) {
            modalOverlay.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    }

    // MOBILE MENU FUNCTIONS
    function closeMenu() {
        if (hamburgerBtn && mobileMenu) {
            hamburgerBtn.classList.remove('active');
            mobileMenu.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    }

    function openMenu() {
        if (hamburgerBtn && mobileMenu) {
            hamburgerBtn.classList.add('active');
            mobileMenu.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    // CORNER BUTTON EVENT LISTENERS (Desktop)
    if (aboutBtn) aboutBtn.addEventListener('click', () => openModal('about'));
    if (creatorsBtn) creatorsBtn.addEventListener('click', () => openModal('creators'));
    if (projectsBtn) projectsBtn.addEventListener('click', () => openModal('projects'));
    if (contactBtn) contactBtn.addEventListener('click', () => openModal('contact'));

    // MODAL CLOSE EVENT LISTENERS
    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeModal();
            }
        });
    }

    // HAMBURGER MENU EVENT LISTENERS
    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            
            if (mobileMenu.classList.contains('active')) {
                closeMenu();
            } else {
                openMenu();
            }
        });
    }

    // MOBILE CLOSE BUTTON
    if (mobileCloseBtn) {
        mobileCloseBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            closeMenu();
        });
    }

    // MOBILE MENU BACKGROUND CLOSE
    if (mobileMenu) {
        mobileMenu.addEventListener('click', function(e) {
            if (e.target === mobileMenu) {
                closeMenu();
            }
        });
    }

    // MOBILE MENU ITEMS - NOW THEY CAN ACCESS openModal!
    if (mobileAbout) {
        mobileAbout.addEventListener('click', () => {
            openModal('about');
            closeMenu();
        });
    }

    if (mobileCreators) {
        mobileCreators.addEventListener('click', () => {
            openModal('creators');
            closeMenu();
        });
    }

    if (mobileProjects) {
        mobileProjects.addEventListener('click', () => {
            openModal('projects');
            closeMenu();
        });
    }

    if (mobileContact) {
        mobileContact.addEventListener('click', () => {
            openModal('contact');
            closeMenu();
        });
    }

    // GLOBAL EVENT LISTENERS
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (modalOverlay && modalOverlay.classList.contains('active')) {
                closeModal();
            }
            if (mobileMenu && mobileMenu.classList.contains('active')) {
                closeMenu();
            }
        }
    });
});
