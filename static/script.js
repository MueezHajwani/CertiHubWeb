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

/* Add event listeners to radio buttons */
document.addEventListener('DOMContentLoaded', function() {
  const formatRadios = document.querySelectorAll('input[name="output-format"]');
  formatRadios.forEach(radio => {
    radio.addEventListener('change', updateFormatDescription);
  });
  // Set initial description
  updateFormatDescription();
});

/* choose template */
upBtn.onclick = () => upIn.click();
upIn.onchange = (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = (ev) => {
    img.onload = () => {
      ctx.clearRect(0, 0, 900, 550);
      ctx.drawImage(img, 0, 0, 900, 550);
    };
    img.src = ev.target.result;
  };
  r.readAsDataURL(f);
  cvs.style.cursor = "crosshair";
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

cvs.onmouseup = () => {
  if (!drag) return;
  drag = false;
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

function preview() {
  if (!sx || !ex) return;
  drawRect();
  const cx = (sx + ex) / 2,
    cy = (sy + ey) / 2;
  const fam = fontSel.value;
  ctx.font = `${sizeSel.value}px "${fam}"`;
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
  updateFormatDescription(); // Update description when showing panel
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

/* live preview */
fontSel.onchange = sizeSel.onchange = colorIn.onchange = preview;

/* choose names file */
fileB.onclick = () => namesIn.click();
namesIn.onchange = async () => {
  if (!namesIn.files.length) return;
  if (!upIn.files.length) {
    alert("Upload a template first");
    return;
  }
  
  // Get the selected format
  const formatElement = document.querySelector('input[name="output-format"]:checked');
  if (!formatElement) {
    alert("Please select an output format");
    return;
  }
  
  const format = formatElement.value;
  fileB.textContent = format === "pdf" ? "Generating PDF" : "Generating PNGs";
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
