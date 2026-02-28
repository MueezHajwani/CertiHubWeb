from flask import Flask, render_template, request, Response
from PIL import Image, ImageDraw, ImageFont
from pypdf import PdfReader, PdfWriter  
import pandas as pd
import io, os, zipfile, json
from functools import lru_cache

# IMPORTANT: Configure paths for Vercel
app = Flask(__name__, 
            static_folder='../static', 
            template_folder='../templates')

FONTS_DIR = os.path.join(os.path.dirname(__file__), '..', 'static', 'fonts')

FONT_MAP = {
    "Alex Brush": "AlexBrush.ttf",
    "Allura": "Allura.ttf",
    "Anton": "Anton.ttf",
    "Arimo": "Arimo.ttf",
    "Ballet": "Ballet.ttf",
    "Bebas Neue": "Bebas Neue.ttf",
    "Bree Serif": "BreeSerif.ttf",
    "Cabin": "Cabin.ttf",
    "DM Sans": "DM Sans.ttf",
    "Fira Sans": "Fira Sans.ttf",
    "Great Vibes": "GreatVibes.ttf",
    "Heebo": "Heebo.ttf",
    "Inter": "Inter.ttf",
    "Josefin Sans": "Josefin Sans.ttf",
    "Karla": "Karla.ttf",
    "Lato": "Lato.ttf",
    "Libre Baskerville": "Libre Baskerville.ttf",
    "Merriweather": "Merriweather.ttf",
    "Montserrat": "Montserrat.ttf",
    "Mukta": "Mukta.ttf",
    "Noto Sans": "Noto Sans.ttf",
    "Nunito": "Nunito.ttf",
    "Open Sans": "Open Sans.ttf",
    "Orbitron": "Orbitron-VariableFont_wght.ttf",
    "Oswald": "Oswald.ttf",
    "Pacifico": "Pacifico.ttf",
    "Playfair Display": "Playfair Display.ttf",
    "Poppins": "Poppins.ttf",
    "PT Sans": "PT Sans.ttf",
    "Raleway": "Raleway.ttf",
    "Righteous": "Righteous.ttf",
    "Roboto": "Roboto.ttf",
    "Roboto Slab": "Roboto Slab.ttf",
    "Ubuntu": "Ubuntu.ttf",
    "Work Sans": "Work Sans.ttf"
}

FONT_CACHE = {}

def hex_to_rgb(code):
    code = code.lstrip("#")
    return tuple(int(code[i:i+2], 16) for i in (0, 2, 4))

def read_names(fs):
    data = fs.read(); names = []
    if fs.filename.endswith(".txt"):
        names = [ln.strip() for ln in data.decode("utf-8").splitlines() if ln.strip()]
    elif fs.filename.endswith(".xlsx"):
        df = pd.read_excel(io.BytesIO(data), header=None, engine='openpyxl')
        for col in df.columns:
            names += [str(v).strip() for v in df[col] if str(v).strip().lower() != "nan"]
    elif fs.filename.endswith(".pdf"):
        rdr = PdfReader(io.BytesIO(data))
        for p in rdr.pages:
            if (txt := p.extract_text()):
                names += [ln.strip() for ln in txt.splitlines() if ln.strip()]
    return names

@lru_cache(maxsize=128)
def get_font_path(font_name):
    try:
        if font_name in FONT_MAP:
            ttf_filename = FONT_MAP[font_name]
            font_path = os.path.join(FONTS_DIR, ttf_filename)
            if os.path.exists(font_path):
                return font_path
        
        possible_files = [
            f"{font_name}.ttf",
            f"{font_name.replace(' ', '')}.ttf",
            f"{font_name.replace(' ', '-')}.ttf",
            f"{font_name.replace(' ', '_')}.ttf"
        ]
        
        for filename in possible_files:
            font_path = os.path.join(FONTS_DIR, filename)
            if os.path.exists(font_path):
                return font_path
        
        available_fonts = [f for f in os.listdir(FONTS_DIR) if f.endswith('.ttf')]
        if available_fonts:
            return os.path.join(FONTS_DIR, available_fonts[0])
        
        return None
    except Exception as e:
        print(f"Font path error: {e}")
        return None

def get_font(font_name, font_size):
    cache_key = f"{font_name}_{font_size}"
    if cache_key in FONT_CACHE:
        return FONT_CACHE[cache_key]
    
    try:
        font_path = get_font_path(font_name)
        if font_path and os.path.exists(font_path):
            font = ImageFont.truetype(font_path, font_size)
        else:
            font = ImageFont.load_default()
        
        FONT_CACHE[cache_key] = font
        return font
    except Exception as e:
        print(f"Font loading error: {e}")
        default_font = ImageFont.load_default()
        FONT_CACHE[cache_key] = default_font
        return default_font

def preload_common_fonts():
    common_fonts = ["Anton", "Poppins", "Roboto", "Open Sans", "Lato"]
    common_sizes = [20, 30, 40, 50, 60]
    for font_name in common_fonts:
        for size in common_sizes:
            try: get_font(font_name, size)
            except: pass

@app.route("/")
def index():
    preload_common_fonts()
    return render_template("index.html")

@app.route("/preview-font", methods=["POST"])
def preview_font():
    try:
        font_name = request.form.get("font_name", "Anton")
        font_size = int(request.form.get("font_size", 40))
        font = get_font(font_name, font_size)
        return {"status": "success", "font_loaded": True}
    except Exception as e:
        return {"status": "error", "message": str(e)}, 500

@app.route('/debug-fonts')
def debug_fonts():
    pass

@app.route('/fonts/<filename>')
def serve_font(filename):
    try:
        font_path = os.path.join(FONTS_DIR, filename)
        if os.path.exists(font_path) and filename.endswith('.ttf'):
            with open(font_path, 'rb') as f:
                font_data = f.read()
            return Response(font_data, mimetype='font/ttf', 
                          headers={'Cache-Control': 'public, max-age=31536000'})
        else:
            return Response("Font not found", 404)
    except Exception as e:
        return Response(f"Error serving font: {e}", 500)


# ==========================================
# NEW: EXTRACT NAMES ROUTE (For Chunking logic)
# ==========================================
@app.route("/extract-names", methods=["POST"])
def extract_names():
    try:
        if "names" not in request.files:
            return Response("No names file uploaded", 400)
        
        names = read_names(request.files["names"])
        return {"names": names}
    except Exception as e:
        print(f"Error extracting names: {e}")
        return Response(str(e), 500)


# ==========================================
# EXISTING: PDF MERGING ROUTE
# ==========================================
@app.route("/merge", methods=["POST"])
def merge_pdfs():
    try:
        uploaded_files = request.files.getlist("pdfs")
        if not uploaded_files:
            return Response("No PDFs uploaded for merging", 400)
            
        merger = PdfWriter()
        for pdf_file in uploaded_files:
            merger.append(io.BytesIO(pdf_file.read()))
            
        merged_pdf = io.BytesIO()
        merger.write(merged_pdf)
        merged_pdf.seek(0)
        
        return Response(merged_pdf.getvalue(), mimetype="application/pdf",
                        headers={"Content-Disposition": "attachment; filename=Merged_Certificates.pdf"})
                        
    except Exception as e:
        return Response(f"Server Error during merge: {str(e)}", 500)


# ==========================================
# UPDATED: GENERATION ROUTE
# ==========================================
@app.route("/generate", methods=["POST"])
def generate():
    try:
        print("=== Generate route started ===")
        if "template" not in request.files:
            return Response("No template file uploaded", 400)
            
        tpl_f = request.files["template"]
        output_format = request.form.get("output_format", "pdf")
        
        print("Processing base template...")
        tpl = Image.open(io.BytesIO(tpl_f.read())).convert("RGB")
        ow, oh = tpl.size

        # ----------------------------------------------------
        # VOID LOGIC
        # ----------------------------------------------------
        if output_format == "void":
            quantity = int(request.form.get("quantity", 5))
            pdf = io.BytesIO()
            pdf_images = [tpl.copy() for _ in range(quantity)]
            
            if pdf_images:
                pdf_images[0].save(
                    pdf, format="PDF", save_all=True,
                    append_images=pdf_images[1:] if len(pdf_images) > 1 else None,
                    optimize=True
                )
            
            pdf.seek(0)
            return Response(pdf.getvalue(), mimetype="application/pdf",
                          headers={"Content-Disposition": "attachment; filename=Blank_Certificates.pdf"})

        # ----------------------------------------------------
        # SMART BATCH LOGIC
        # ----------------------------------------------------
        names = []
        if "names_list" in request.form:
            # Reconstruct list from JSON string (chunked requests)
            names = json.loads(request.form.get("names_list"))
        elif "names" in request.files:
            # Read straight from the file (standard requests)
            names = read_names(request.files["names"])
            
        if not names:
            return Response("No names provided", 400)
            
        fname = request.form.get("font_style", "Anton")
        fsize = int(request.form.get("font_size", 40))
        fcolor = hex_to_rgb(request.form.get("font_color", "#000000"))
        
        coords = request.form.get("coords", "0,0,100,100")
        sx, sy, ex, ey = map(float, coords.split(","))
        cx, cy = ((sx+ex)/2)*(ow/900), ((sy+ey)/2)*(oh/550)

        font = get_font(fname, fsize)
        images = []
        for name in names:
            img = tpl.copy()
            ImageDraw.Draw(img).text((cx, cy), name, font=font, fill=fcolor, anchor="mm")
            images.append((img, name))

        start_index = int(request.form.get("start_index", 0))

        if output_format == "png":
            zip_buffer = io.BytesIO()
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_STORED) as zip_file:
                filename_counts = {}
                for i, (img, name) in enumerate(images, start_index + 1):
                    clean_name = "".join(c for c in name if c.isalnum() or c in (' ', '-', '_')).strip()
                    if not clean_name:
                        clean_name = f"Certificate_{i}"
                    
                    if clean_name in filename_counts:
                        filename_counts[clean_name] += 1
                        final_filename = f"{clean_name}_{filename_counts[clean_name]}.png"
                    else:
                        filename_counts[clean_name] = 0
                        final_filename = f"{clean_name}.png"
                        
                    png_buffer = io.BytesIO()
                    img.save(png_buffer, format="PNG", optimize=False, compress_level=0)
                    zip_file.writestr(final_filename, png_buffer.getvalue())
                    png_buffer.close()
            
            zip_buffer.seek(0)
            return Response(
                zip_buffer.getvalue(), mimetype="application/zip",
                headers={"Content-Disposition": "attachment; filename=Certificates.zip"}
            )
        
        else:
            pdf_images = [img for img, name in images]
            pdf = io.BytesIO()
            if pdf_images:
                pdf_images[0].save(
                    pdf, format="PDF", save_all=True, 
                    append_images=pdf_images[1:] if len(pdf_images) > 1 else None,
                    optimize=True
                )
            pdf.seek(0)
            return Response(pdf.getvalue(), mimetype="application/pdf",
                          headers={"Content-Disposition": "attachment; filename=Certificates.pdf"})

    except Exception as e:
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        return Response(f"Server Error: {str(e)}", 500)