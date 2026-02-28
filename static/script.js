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
const voidContainer = document.getElementById("void-quantity-container");

const historyPanel = document.getElementById("history-panel");
const historyList = document.getElementById("history-list");
const mergeBtn = document.getElementById("merge-pdf-btn");
let pdfSessionHistory = [];

let img = new Image(),
  drag = false,
  step2 = false,
  sx,
  sy,
  ex,
  ey;
let isMobile = false;
let mobileTextY = 275;
let mobileVerticalDrag = false;
let mobileHorizontalDrag = false;
let horizontalDragSide = null;
let lastTouchX = 0;
let lastTouchY = 0;
let edgeTouchZone = 30;
let fontsLoaded = false;
let fontsLoadingPromise = null;

function checkMobile() {
  isMobile = window.innerWidth <= 768;
  return isMobile;
}

checkMobile();
window.addEventListener("resize", checkMobile);

function forceLoadAllFonts() {
  if (fontsLoadingPromise) return fontsLoadingPromise;
  const fontList = [
    "Alex Brush",
    "Allura",
    "Anton",
    "Arimo",
    "Ballet",
    "Bebas Neue",
    "Bree Serif",
    "Cabin",
    "DM Sans",
    "Fira Sans",
    "Great Vibes",
    "Heebo",
    "Inter",
    "Josefin Sans",
    "Karla",
    "Lato",
    "Libre Baskerville",
    "Merriweather",
    "Montserrat",
    "Mukta",
    "Noto Sans",
    "Nunito",
    "Open Sans",
    "Orbitron",
    "Oswald",
    "Pacifico",
    "Playfair Display",
    "Poppins",
    "PT Sans",
    "Raleway",
    "Righteous",
    "Roboto",
    "Roboto Slab",
    "Ubuntu",
    "Work Sans",
  ];

  if ("fonts" in document) {
    const fontPromises = fontList.map(fontName =>
      document.fonts.load(`40px "${fontName}"`).catch(() => console.warn(`Failed: ${fontName}`))
    );

    fontsLoadingPromise = Promise.all(fontPromises)
      .then(() => {
        fontsLoaded = true;
        return true;
      })
      .catch(() => {
        fontsLoaded = true;
        return true;
      });
    return fontsLoadingPromise;
  } else {
    fontsLoadingPromise = new Promise(resolve => {
      setTimeout(() => {
        fontsLoaded = true;
        resolve(true);
      }, 2000);
    });
    return fontsLoadingPromise;
  }
}

for (let i = 1; i <= 120; i++) {
  const o = document.createElement("option");
  o.value = i;
  o.text = i;
  if (i === 50) o.selected = true;
  sizeSel.appendChild(o);
}

function updateFormatDescription() {
  const selectedFormat = document.querySelector('input[name="output-format"]:checked');
  if (!selectedFormat) return;

  if (selectedFormat.value === "pdf") {
    formatDesc.textContent = "Single PDF with all certificates";
    if (fileB) fileB.textContent = "Upload Names & Generate";
    if (voidContainer) voidContainer.style.display = "none";
  } else if (selectedFormat.value === "png") {
    formatDesc.textContent = "Individual PNG files in ZIP archive";
    if (fileB) fileB.textContent = "Upload Names & Generate";
    if (voidContainer) voidContainer.style.display = "none";
  } else if (selectedFormat.value === "void") {
    formatDesc.textContent = "Multiple blank certificates in a single PDF";
    if (fileB) fileB.textContent = "Generate Blank Templates";
    if (voidContainer) voidContainer.style.display = "block";
  }
}

document.addEventListener("DOMContentLoaded", function () {
  forceLoadAllFonts();
  document.querySelectorAll('input[name="output-format"]').forEach(radio => {
    radio.addEventListener("change", updateFormatDescription);
  });
  updateFormatDescription();
});

const canvasContainer = document.getElementById("canvas-container");
const canvas = document.getElementById("template-canvas");
const dragOverlay = document.getElementById("canvas-overlay");

["dragenter", "dragover", "dragleave", "drop"].forEach(eName => {
  document.addEventListener(
    eName,
    e => {
      e.preventDefault();
      e.stopPropagation();
    },
    false
  );
});

["dragenter", "dragover"].forEach(eName => {
  canvasContainer.addEventListener(
    eName,
    () => {
      dragOverlay.classList.add("active");
      canvas.classList.add("drag-hover");
    },
    false
  );
});

["dragleave", "drop"].forEach(eName => {
  canvasContainer.addEventListener(
    eName,
    () => {
      dragOverlay.classList.remove("active");
      canvas.classList.remove("drag-hover");
    },
    false
  );
});

canvasContainer.addEventListener("drop", handleDrop, false);
canvas.addEventListener("drop", handleDrop, false);

function handleDrop(e) {
  const file = e.dataTransfer.files[0];
  if (!file || !["image/png", "image/jpg", "image/jpeg"].includes(file.type)) {
    alert("Please drop a valid image file (PNG, JPG, JPEG)");
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    alert("File size too large. Please use files under 10MB.");
    return;
  }
  processTemplateFile(file);
}

function processTemplateFile(file) {
  const reader = new FileReader();
  reader.onload = ev => {
    img.onload = () => {
      cvs.width = 900;
      cvs.height = 550;
      ctx.drawImage(img, 0, 0, 900, 550);
      upIn.hidden = true;
      if (checkMobile()) setupMobileMode();
      showDropSuccess();
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
  cvs.style.cursor = checkMobile() ? "grab" : "crosshair";
}

function setupMobileMode() {
  sx = 50;
  sy = mobileTextY - 30;
  ex = 850;
  ey = mobileTextY + 30;
  upIn.hidden = upBtn.hidden = true;
  dragLi.textContent = "Drag vertically to move, touch edges to resize horizontally";
  instr.style.display = "none";
  nextB.style.display = backB.style.display = "inline-block";
  preview();
}

function showDropSuccess() {
  const successMsg = document.createElement("div");
  successMsg.innerHTML = `<div style="position: absolute; top: 10px; right: 10px; background: #1ec1cb; color: white; padding: 8px 12px; border-radius: 5px; font-size: 12px; z-index: 100;">✅ Template uploaded successfully!</div>`;
  canvasContainer.appendChild(successMsg);
  setTimeout(() => {
    if (successMsg.parentNode) successMsg.parentNode.removeChild(successMsg);
  }, 3000);
}

upBtn.onclick = () => upIn.click();
upIn.onchange = e => {
  if (e.target.files[0]) processTemplateFile(e.target.files[0]);
};

function detectEdgeTouch(touchX, canvasRect) {
  const canvasX = (touchX - canvasRect.left) * (900 / canvasRect.width);
  if (Math.abs(canvasX - sx) <= edgeTouchZone) return "left";
  if (Math.abs(canvasX - ex) <= edgeTouchZone) return "right";
  return null;
}

cvs.addEventListener("touchstart", e => {
  if (!checkMobile() || !img.src) return;
  e.preventDefault();
  const touch = e.touches[0];
  const rect = cvs.getBoundingClientRect();
  lastTouchX = touch.clientX - rect.left;
  lastTouchY = touch.clientY - rect.top;

  const edgeSide = detectEdgeTouch(touch.clientX, rect);
  if (edgeSide) {
    mobileHorizontalDrag = true;
    horizontalDragSide = edgeSide;
    cvs.style.cursor = "ew-resize";
  } else {
    mobileVerticalDrag = true;
    cvs.style.cursor = "ns-resize";
  }
});

cvs.addEventListener("touchmove", e => {
  if (!checkMobile() || (!mobileVerticalDrag && !mobileHorizontalDrag)) return;
  e.preventDefault();
  const touch = e.touches[0];
  const rect = cvs.getBoundingClientRect();
  const currentTouchX = touch.clientX - rect.left;
  const currentTouchY = touch.clientY - rect.top;

  if (mobileVerticalDrag) {
    const deltaY = (currentTouchY - lastTouchY) * (550 / rect.height);
    mobileTextY = Math.max(50, Math.min(500, mobileTextY + deltaY));
    sy = mobileTextY - 30;
    ey = mobileTextY + 30;
    lastTouchY = currentTouchY;
  } else if (mobileHorizontalDrag) {
    const deltaX = (currentTouchX - lastTouchX) * (900 / rect.width);
    if (horizontalDragSide === "left") sx = Math.max(25, Math.min(ex - 50, sx + deltaX));
    else if (horizontalDragSide === "right") ex = Math.max(sx + 50, Math.min(875, ex + deltaX));
    lastTouchX = currentTouchX;
  }
  preview();
});

cvs.addEventListener("touchend", e => {
  if (!checkMobile()) return;
  e.preventDefault();
  mobileVerticalDrag = mobileHorizontalDrag = false;
  horizontalDragSide = null;
  cvs.style.cursor = "grab";
});

cvs.onmousedown = e => {
  if (!img.src || checkMobile()) return;
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

cvs.onmousemove = e => {
  if (!drag || checkMobile()) return;
  ex = e.clientX - cvs.getBoundingClientRect().left;
  ey = e.clientY - cvs.getBoundingClientRect().top;
  drawRect();
};

cvs.onmouseup = async () => {
  if (!drag || checkMobile()) return;
  drag = false;
  await forceLoadAllFonts();
  preview();
  if (!step2) nextB.style.display = backB.style.display = "inline-block";
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
  if (!fontsLoaded) await forceLoadAllFonts();

  if (!checkMobile()) drawRect();
  else {
    ctx.clearRect(0, 0, 900, 550);
    ctx.drawImage(img, 0, 0, 900, 550);
  }

  const cx = (sx + ex) / 2,
    cy = (sy + ey) / 2;
  ctx.font = `${sizeSel.value}px "${fontSel.value}", Arial, sans-serif`;
  ctx.fillStyle = colorIn.value;
  ctx.textAlign = "center";
  ctx.setLineDash([]);
  ctx.fillText("Your Name", cx, cy);

  if (checkMobile()) {
    ctx.strokeStyle = "#1ec1cb";
    ctx.setLineDash([4]);
    ctx.strokeRect(sx, sy, ex - sx, ey - sy);
    ctx.fillStyle = "#1ec1cb";
    ctx.font = "20px Arial";
    ctx.fillText("▲", cx + 100, sy - 10);
    ctx.fillText("▼", cx + 100, ey + 25);
    ctx.fillStyle = "#ff6b6b";
    ctx.font = "16px Arial";
    ctx.fillRect(sx - 3, sy, 6, ey - sy);
    ctx.fillStyle = "#1ec1cb";
    ctx.fillText("◀", sx - 15, cy + 5);
    ctx.fillStyle = "#ff6b6b";
    ctx.fillRect(ex - 3, sy, 6, ey - sy);
    ctx.fillStyle = "#1ec1cb";
    ctx.fillText("▶", ex + 8, cy + 5);
  }
}

(function sortFontDropdown() {
  const select = document.getElementById("font-style");
  const opts = Array.from(select.options);
  opts.sort((a, b) => a.text.toLowerCase().localeCompare(b.text.toLowerCase()));
  opts.forEach(o => select.appendChild(o));
})();

function updateHistoryUI() {
  if (!historyPanel || !historyList) return;

  if (pdfSessionHistory.length > 0) {
    historyPanel.style.display = "block";
    historyList.innerHTML = "";

    pdfSessionHistory.forEach((item, index) => {
      const li = document.createElement("li");
      const textSpan = document.createElement("span");
      textSpan.className = "history-item-text";
      textSpan.textContent = `${index + 1}. ${item.name}`;
      textSpan.title = item.name;

      const removeBtn = document.createElement("span");
      removeBtn.className = "remove-pdf-btn";
      removeBtn.innerHTML = "&times;";
      removeBtn.title = "Remove PDF";

      removeBtn.onclick = () => {
        pdfSessionHistory.splice(index, 1);
        updateHistoryUI();
      };

      li.appendChild(textSpan);
      li.appendChild(removeBtn);
      historyList.appendChild(li);
    });

    if (pdfSessionHistory.length < 2) {
      mergeBtn.disabled = true;
      mergeBtn.textContent = "Need 2+ PDFs to Merge";
    } else {
      mergeBtn.disabled = false;
      mergeBtn.textContent = "Merge All PDFs";
    }
  } else {
    historyPanel.style.display = "none";
  }
}

nextB.onclick = () => {
  dragLi.textContent = "Select the output format and generate";
  setDiv.style.display = "block";
  downloadSettingsDiv.style.display = "block";
  nextB.style.display = "none";
  fileB.style.display = "inline-block";
  step2 = true;
  updateFormatDescription();
  if (pdfSessionHistory.length > 0) historyPanel.style.display = "block";
};

backB.onclick = () => {
  setDiv.style.display =
    downloadSettingsDiv.style.display =
    nextB.style.display =
    fileB.style.display =
    backB.style.display =
      "none";
  if (historyPanel) historyPanel.style.display = "none";
  dragLi.textContent = "Or Drag & Drop your certificate template here";
  dragLi.style.display = "block";
  dragLi.style.fontSize = dragLi.style.paddingTop = "";
  upIn.hidden = upBtn.hidden = false;
  instr.style.display = "block";
  ctx.clearRect(0, 0, 900, 550);
  img = new Image();
  upIn.value = namesIn.value = "";
  step2 = false;
  mobileTextY = 275;
  mobileVerticalDrag = mobileHorizontalDrag = false;
  horizontalDragSide = null;
  sx = 50;
  ex = 830;
};

fontSel.onchange = sizeSel.onchange = async () => {
  await forceLoadAllFonts();
  preview();
};
colorIn.onchange = preview;

fileB.onclick = () => {
  const format = document.querySelector('input[name="output-format"]:checked').value;
  if (format === "void") generateCertificates(null, format);
  else namesIn.click();
};

namesIn.onchange = () => {
  if (!namesIn.files.length) return;
  const format = document.querySelector('input[name="output-format"]:checked').value;
  generateCertificates(namesIn.files[0], format);
  namesIn.value = "";
};

// ==========================================
// ADAPTIVE BATCH GENERATION LOGIC
// ==========================================
// ==========================================
// ADAPTIVE BATCH GENERATION LOGIC
// ==========================================
async function generateCertificates(namesFile, format) {
  if (!upIn.files.length) {
    alert("Upload a template first");
    return;
  }
  const originalText = fileB.textContent;
  fileB.disabled = true;

  try {
    // 1. VOID LOGIC (No chunking needed, executes fast)
    if (format === "void") {
      fileB.textContent = "Generating...";
      const fd = new FormData();
      fd.append("template", upIn.files[0]);
      fd.append("font_style", fontSel.value);
      fd.append("font_size", sizeSel.value);
      fd.append("font_color", colorIn.value);
      fd.append("coords", [sx, sy, ex, ey].join(","));
      fd.append("output_format", format);
      fd.append("quantity", document.getElementById("void-quantity").value);

      const res = await fetch("/generate", { method: "POST", body: fd });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);

      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "Certificates.pdf";

      let docName = `Blank x${document.getElementById("void-quantity").value} (Void)`;
      pdfSessionHistory.push({ name: docName, blob: blob });
      updateHistoryUI();
      a.click();

      fileB.textContent = originalText;
      fileB.disabled = false;
      return;
    }

    // 2. NAME EXTRACTION
    fileB.textContent = "Reading names...";
    const extractFd = new FormData();
    extractFd.append("names", namesFile);

    const extractRes = await fetch("/extract-names", { method: "POST", body: extractFd });
    if (!extractRes.ok) throw new Error("Failed to read names file.");

    const extractData = await extractRes.json();
    const namesList = extractData.names;

    if (!namesList || namesList.length === 0) {
      throw new Error("No names found in the uploaded file.");
    }

    // 3. THRESHOLD CHECKS
    const threshold = format === "pdf" ? 150 : 50;
    const chunkSize = format === "pdf" ? 50 : 20;

    // NEW: SMART COOLDOWN FREQUENCY (Dependent on Chunk Size)
    // Formula calculates how many batches safely fit into the 100-image limit.
    const safeMemoryLimit = 100;
    const cooldownFrequency = Math.max(1, Math.floor(safeMemoryLimit / chunkSize));

    // SCENARIO A: FAST LANE (Process all at once)
    if (namesList.length <= threshold) {
      fileB.textContent = "Generating...";
      const fd = new FormData();
      fd.append("template", upIn.files[0]);
      fd.append("names_list", JSON.stringify(namesList));
      fd.append("font_style", fontSel.value);
      fd.append("font_size", sizeSel.value);
      fd.append("font_color", colorIn.value);
      fd.append("coords", [sx, sy, ex, ey].join(","));
      fd.append("output_format", format);

      const res = await fetch("/generate", { method: "POST", body: fd });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);

      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);

      if (format === "pdf") {
        a.download = "Certificates.pdf";
        pdfSessionHistory.push({ name: `${namesFile.name} (Std)`, blob: blob });
        updateHistoryUI();
      } else {
        a.download = "Certificates.zip";
      }
      a.click();
    }

    // SCENARIO B: BATCH PROCESSING (Avoids Vercel Limits)
    else {
      let blobs = [];
      const totalChunks = Math.ceil(namesList.length / chunkSize);

      for (let i = 0; i < totalChunks; i++) {
        fileB.textContent = `Processing batch ${i + 1} of ${totalChunks}...`;
        const chunk = namesList.slice(i * chunkSize, (i + 1) * chunkSize);

        const fd = new FormData();
        fd.append("template", upIn.files[0]);
        fd.append("names_list", JSON.stringify(chunk));
        fd.append("start_index", i * chunkSize);
        fd.append("font_style", fontSel.value);
        fd.append("font_size", sizeSel.value);
        fd.append("font_color", colorIn.value);
        fd.append("coords", [sx, sy, ex, ey].join(","));
        fd.append("output_format", format);

        const res = await fetch("/generate", { method: "POST", body: fd });
        if (!res.ok) throw new Error(`Failed on batch ${i + 1}`);
        blobs.push(await res.blob());

        // UPDATED: Smart Cooldown Logic (Triggers based on cooldownFrequency)
        if ((i + 1) % cooldownFrequency === 0 && i < totalChunks - 1) {
          fileB.textContent = `Cooling down server...`;
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }

      fileB.textContent = "Merging final files...";

      let finalBlob;
      if (format === "pdf") {
        const { PDFDocument } = PDFLib;
        const mergedPdf = await PDFDocument.create();
        for (const b of blobs) {
          const arrBuf = await b.arrayBuffer();
          const pdfDoc = await PDFDocument.load(arrBuf);
          const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
          copiedPages.forEach(p => mergedPdf.addPage(p));
        }
        const mergedBytes = await mergedPdf.save();
        finalBlob = new Blob([mergedBytes], { type: "application/pdf" });

        pdfSessionHistory.push({ name: `${namesFile.name} (Std)`, blob: finalBlob });
        updateHistoryUI();
      } else {
        // Zip Merge
        const masterZip = new JSZip();
        for (const b of blobs) {
          const chunkZip = await JSZip.loadAsync(b);
          chunkZip.forEach((relativePath, zipEntry) => {
            masterZip.file(relativePath, zipEntry.async("blob"));
          });
        }
        finalBlob = await masterZip.generateAsync({ type: "blob" });
      }

      const a = document.createElement("a");
      a.href = URL.createObjectURL(finalBlob);
      a.download = format === "pdf" ? "Certificates.pdf" : "Certificates.zip";
      a.click();
    }
  } catch (err) {
    alert("Error: " + err.message);
  }

  fileB.textContent = originalText;
  fileB.disabled = false;
}

if (mergeBtn) {
  mergeBtn.onclick = async () => {
    if (pdfSessionHistory.length < 2) return;

    const originalText = mergeBtn.textContent;
    mergeBtn.textContent = "Merging locally...";
    mergeBtn.disabled = true;

    try {
      const { PDFDocument } = PDFLib;
      const mergedPdf = await PDFDocument.create();

      for (const item of pdfSessionHistory) {
        const arrayBuffer = await item.blob.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach(page => {
          mergedPdf.addPage(page);
        });
      }

      const mergedPdfBytes = await mergedPdf.save();

      const blob = new Blob([mergedPdfBytes], { type: "application/pdf" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "Merged_Certificates.pdf";
      a.click();
    } catch (err) {
      alert("Merge Error: " + err.message);
    }

    mergeBtn.textContent = originalText;
    mergeBtn.disabled = false;
  };
}

document.addEventListener("DOMContentLoaded", function () {
  const modalOverlay = document.getElementById("modal-overlay");
  const modalBody = document.getElementById("modal-body");
  const mobileMenu = document.getElementById("mobile-menu");
  const hamburgerBtn = document.getElementById("hamburger-btn");

  const modalContents = {
    about: `<h2>About CertiHub</h2><p>🎓 <strong>CertiHub</strong> is a powerful, easy-to-use certificate generator...</p>`,
    creators: `<h2>Meet the Creators</h2><div class="creator-card"><div class="name">🚀 Development Team</div>...</div>`,
    projects: `<h2>Other Projects</h2><ul class="feature-list"><li><strong>QR Generator Pro</strong> - Advanced QR code generator</li></ul>`,
    contact: `<h2>Get in Touch</h2><div class="creator-card"><div class="name">📧 Email Support</div>...</div>`,
  };

  function openModal(content) {
    if (modalBody && modalOverlay) {
      modalBody.innerHTML = modalContents[content] || "<p>Content coming soon!</p>";
      modalOverlay.classList.add("active");
      document.body.style.overflow = "hidden";
    }
  }

  function closeModal() {
    if (modalOverlay) {
      modalOverlay.classList.remove("active");
      document.body.style.overflow = "auto";
    }
  }

  function toggleMenu() {
    if (hamburgerBtn && mobileMenu) {
      const isActive = mobileMenu.classList.toggle("active");
      hamburgerBtn.classList.toggle("active");
      document.body.style.overflow = isActive ? "hidden" : "auto";
    }
  }

  ["about", "creators", "projects", "contact"].forEach(id => {
    const btn = document.getElementById(`${id}-btn`);
    const mobileBtn = document.getElementById(`mobile-${id}`);
    if (btn) btn.addEventListener("click", () => openModal(id));
    if (mobileBtn)
      mobileBtn.addEventListener("click", () => {
        openModal(id);
        toggleMenu();
      });
  });

  document.getElementById("modal-close")?.addEventListener("click", closeModal);
  modalOverlay?.addEventListener("click", e => {
    if (e.target === modalOverlay) closeModal();
  });
  hamburgerBtn?.addEventListener("click", e => {
    e.stopPropagation();
    toggleMenu();
  });
  document.getElementById("mobile-close-btn")?.addEventListener("click", e => {
    e.preventDefault();
    e.stopPropagation();
    toggleMenu();
  });
  mobileMenu?.addEventListener("click", e => {
    if (e.target === mobileMenu) toggleMenu();
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      if (modalOverlay?.classList.contains("active")) closeModal();
      if (mobileMenu?.classList.contains("active")) toggleMenu();
    }
  });
});
