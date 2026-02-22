from flask import Flask, render_template, request, Response
from PIL import Image, ImageDraw, ImageFont
from pypdf import PdfReader
import pandas as pd
import io, os, zipfile
from functools import lru_cache

# IMPORTANT: Configure paths for Vercel
app = Flask(__name__, 
            static_folder='../static', 
            template_folder='../templates')

FONTS_DIR = os.path.join(os.path.dirname(__file__), '..', 'static', 'fonts')

# Font mapping from Google Font names to local TTF files
FONT_MAP = {
    "Alex Brush": "AlexBrush.ttf",           # NEW (no spaces)
    "Allura": "Allura.ttf",                  # NEW (no spaces)
    "Anton": "Anton.ttf",
    "Arimo": "Arimo.ttf",
    "Ballet": "Ballet.ttf",
    "Bebas Neue": "Bebas Neue.ttf",          # EXISTING (has spaces)
    "Bree Serif": "BreeSerif.ttf",           # NEW (no spaces)
    "Cabin": "Cabin.ttf",
    "DM Sans": "DM Sans.ttf",                # EXISTING (has spaces)
    "Fira Sans": "Fira Sans.ttf",            # EXISTING (has spaces)
    "Great Vibes": "GreatVibes.ttf",         # NEW (no spaces)
    "Heebo": "Heebo.ttf",
    "Inter": "Inter.ttf",
    "Josefin Sans": "Josefin Sans.ttf",      # EXISTING (has spaces)
    "Karla": "Karla.ttf",
    "Lato": "Lato.ttf",
    "Libre Baskerville": "Libre Baskerville.ttf",  # EXISTING (has spaces)
    "Merriweather": "Merriweather.ttf",
    "Montserrat": "Montserrat.ttf",
    "Mukta": "Mukta.ttf",
    "Noto Sans": "Noto Sans.ttf",            # EXISTING (has spaces)
    "Nunito": "Nunito.ttf",
    "Open Sans": "Open Sans.ttf",            # EXISTING (has spaces)
    "Orbitron": "Orbitron-VariableFont_wght.ttf",
    "Oswald": "Oswald.ttf",
    "Pacifico": "Pacifico.ttf",              # NEW (no spaces)
    "Playfair Display": "Playfair Display.ttf",  # EXISTING (has spaces)
    "Poppins": "Poppins.ttf",
    "PT Sans": "PT Sans.ttf",                # EXISTING (has spaces)
    "Raleway": "Raleway.ttf",
    "Righteous": "Righteous.ttf",
    "Roboto": "Roboto.ttf",
    "Roboto Slab": "Roboto Slab.ttf",        # EXISTING (has spaces)
    "Ubuntu": "Ubuntu.ttf",
    "Work Sans": "Work Sans.ttf"             # EXISTING (has spaces)
}

# Global font cache to store loaded fonts
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
    """Get font path with caching"""
    try:
        # First try to get the TTF file from our font mapping
        if font_name in FONT_MAP:
            ttf_filename = FONT_MAP[font_name]
            font_path = os.path.join(FONTS_DIR, ttf_filename)
            if os.path.exists(font_path):
                return font_path
        
        # Fallback: try common variations
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
        
        # Ultimate fallback: try any available font
        available_fonts = [f for f in os.listdir(FONTS_DIR) if f.endswith('.ttf')]
        if available_fonts:
            return os.path.join(FONTS_DIR, available_fonts[0])
        
        return None
        
    except Exception as e:
        print(f"Font path error: {e}")
        return None

def get_font(font_name, font_size):
    """Get PIL font object with caching for faster loading"""
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
    """Preload commonly used fonts"""
    common_fonts = ["Anton", "Poppins", "Roboto", "Open Sans", "Lato"]
    common_sizes = [20, 30, 40, 50, 60]
    
    for font_name in common_fonts:
        for size in common_sizes:
            try:
                get_font(font_name, size)
            except:
                pass

@app.route("/")
def index():
    preload_common_fonts()
    return render_template("index.html")

@app.route("/preview-font", methods=["POST"])
def preview_font():
    """Fast font preview endpoint"""
    try:
        font_name = request.form.get("font_name", "Anton")
        font_size = int(request.form.get("font_size", 40))
        font = get_font(font_name, font_size)
        return {"status": "success", "font_loaded": True}
    except Exception as e:
        return {"status": "error", "message": str(e)}, 500

@app.route('/debug-fonts')
def debug_fonts():
    # Debugging route omitted for brevity (kept your existing logic)
    pass

@app.route('/fonts/<filename>')
def serve_font(filename):
    """Direct font serving route as backup"""
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

@app.route("/generate", methods=["POST"])
def generate():
    try:
        print("=== Generate route started ===")
        
        # 1. Base Template Validation
        if "template" not in request.files:
            return Response("No template file uploaded", 400)
            
        tpl_f = request.files["template"]
        output_format = request.form.get("output_format", "pdf")
        print(f"Format requested: {output_format}")

        # 2. Process template image
        print("Processing base template...")
        tpl = Image.open(io.BytesIO(tpl_f.read())).convert("RGB")
        ow, oh = tpl.size

        # ----------------------------------------------------
        # NEW: VOID LOGIC (Bypass name parsing entirely)
        # ----------------------------------------------------
        if output_format == "void":
            quantity = int(request.form.get("quantity", 5))
            print(f"Generating {quantity} blank templates...")
            
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
        # ORIGINAL LOGIC: Text Rendering (Requires names file)
        # ----------------------------------------------------
        if "names" not in request.files:
            return Response("No names file uploaded", 400)
            
        names_f = request.files["names"]
        fname = request.form.get("font_style", "Anton")
        fsize = int(request.form.get("font_size", 40))
        fcolor = hex_to_rgb(request.form.get("font_color", "#000000"))
        
        coords = request.form.get("coords", "0,0,100,100")
        sx, sy, ex, ey = map(float, coords.split(","))
        cx, cy = ((sx+ex)/2)*(ow/900), ((sy+ey)/2)*(oh/550)

        # Read names
        names = read_names(names_f)
        if not names:
            return Response("No names found in uploaded file", 400)
        
        # Load font
        font = get_font(fname, fsize)

        # Generate images
        images = []
        for i, name in enumerate(names):
            img = tpl.copy()
            ImageDraw.Draw(img).text((cx, cy), name, font=font, fill=fcolor, anchor="mm")
            images.append((img, name))

        if output_format == "png":
            # PNG ZIP generation
            zip_buffer = io.BytesIO()
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_STORED) as zip_file:
                filename_counts = {}
                for i, (img, name) in enumerate(images, 1):
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
            # Standard PDF Generation
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