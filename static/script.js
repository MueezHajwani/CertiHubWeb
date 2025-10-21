const upIn = document.getElementById("template-upload");
const upBtn = document.getElementById("template-upload-btn");
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

// Font loading tracker
let fontsLoaded = false;
let fontsLoadingPromise = null;

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
  if (i === 40) o.selected = true;
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
      ctx.clearRect(0, 0, 900, 550);
      ctx.drawImage(img, 0, 0, 900, 550);
      
      // Hide upload button and show instructions
      upIn.hidden = upBtn.hidden = true;
      instr.style.display = "none";
      
      // Show success message
      showDropSuccess();
    };
    img.src = ev.target.result;
  };
  
  reader.readAsDataURL(file);
  cvs.style.cursor = "crosshair";
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

/* drag rectangle */
cvs.onmousedown = (e) => {
  if (!img.src) return;
  drag = true;
  const r = cvs.getBoundingClientRect();
  sx = e.clientX - r.left;
  sy = e.clientY - r.top;
  if (!step2) {
    upIn.hidden = upBtn.hidden = true;
    instr.style.display = "none";
  }
};

cvs.onmousemove = (e) => {
  if (!drag) return;
  const r = cvs.getBoundingClientRect();
  ex = e.clientX - r.left;
  ey = e.clientY - r.top;
  drawRect();
};

cvs.onmouseup = async () => {
  if (!drag) return;
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
  
  drawRect();
  const cx = (sx + ex) / 2,
    cy = (sy + ey) / 2;
  const fam = fontSel.value;
  
  // Set font with fallback
  ctx.font = `${sizeSel.value}px "${fam}", Arial, sans-serif`;
  ctx.fillStyle = colorIn.value;
  ctx.textAlign = "center";
  ctx.setLineDash([]);
  ctx.fillText("Your Name", cx, cy);
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
  upIn.hidden = upBtn.hidden = false;
  instr.style.display = "block";
  ctx.clearRect(0, 0, 900, 550);
  img = new Image();
  upIn.value = "";
  namesIn.value = "";
  step2 = false;
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
