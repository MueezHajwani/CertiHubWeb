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
    "Anton": "Anton.ttf",
    "Arimo": "Arimo.ttf",
    "Orbitron": "Orbitron-VariableFont_wght.ttf",
    "Ballet": "Ballet.ttf",
    "Bebas Neue": "Bebas Neue.ttf",
    "Cabin": "Cabin.ttf",
    "DM Sans": "DM Sans.ttf",
    "Fira Sans": "Fira Sans.ttf",
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
    "Oswald": "Oswald.ttf",
    "Playfair Display": "Playfair Display.ttf",
    "Poppins": "Poppins.ttf",
    "PT Sans": "PT Sans.ttf",
    "Raleway": "Raleway.ttf",
    "Roboto Slab": "Roboto Slab.ttf",
    "Roboto": "Roboto.ttf",
    "Ubuntu": "Ubuntu.ttf",
    "Work Sans": "Work Sans.ttf"
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
    
    # Check if font is already in cache
    if cache_key in FONT_CACHE:
        return FONT_CACHE[cache_key]
    
    try:
        font_path = get_font_path(font_name)
        
        if font_path and os.path.exists(font_path):
            font = ImageFont.truetype(font_path, font_size)
        else:
            font = ImageFont.load_default()
        
        # Cache the font for future use
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
                get_font(font_name, size)  # This will cache the font
            except:
                pass

@app.route("/")
def index():
    # Preload fonts when serving the main page
    preload_common_fonts()
    return render_template("index.html")

# Add a new route for instant font preview
@app.route("/preview-font", methods=["POST"])
def preview_font():
    """Fast font preview endpoint"""
    try:
        font_name = request.form.get("font_name", "Anton")
        font_size = int(request.form.get("font_size", 40))
        
        # Get cached font quickly
        font = get_font(font_name, font_size)
        
        return {"status": "success", "font_loaded": True}
    except Exception as e:
        return {"status": "error", "message": str(e)}, 500

# Your existing routes...
@app.route('/debug-fonts')
def debug_fonts():
    """Debug route to check font directory and mappings"""
    try:
        available_files = os.listdir(FONTS_DIR)
        ttf_files = [f for f in available_files if f.endswith('.ttf')]
        
        # Check which mapped fonts are actually available
        available_mapped = {}
        missing_mapped = {}
        
        for google_name, ttf_file in FONT_MAP.items():
            if ttf_file in ttf_files:
                available_mapped[google_name] = ttf_file
            else:
                missing_mapped[google_name] = ttf_file
        
        # Show cache status
        cache_info = f"<p><strong>Font Cache Size:</strong> {len(FONT_CACHE)} fonts loaded</p>"
        
        html_response = f"""
        <h2>Font Directory Status</h2>
        <p><strong>FONTS_DIR:</strong> {FONTS_DIR}</p>
        <p><strong>Total TTF files found:</strong> {len(ttf_files)}</p>
        {cache_info}
        
        <h3>Available Mapped Fonts ({len(available_mapped)}):</h3>
        <ul>
        {"".join([f"<li>{google} → {ttf}</li>" for google, ttf in available_mapped.items()])}
        </ul>
        
        <h3>Missing Mapped Fonts ({len(missing_mapped)}):</h3>
        <ul>
        {"".join([f"<li style='color:red'>{google} → {ttf} (NOT FOUND)</li>" for google, ttf in missing_mapped.items()])}
        </ul>
        
        <h3>All TTF Files in Directory:</h3>
        <ul>
        {"".join([f"<li>{f}</li>" for f in sorted(ttf_files)])}
        </ul>
        
        <h3>Cached Fonts:</h3>
        <ul>
        {"".join([f"<li>{key}</li>" for key in FONT_CACHE.keys()])}
        </ul>
        """
        
        return html_response
        
    except Exception as e:
        return f"<h2>Error accessing fonts directory:</h2><p>{str(e)}</p><p>FONTS_DIR path: {FONTS_DIR}</p>"

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

# Your existing generate route stays the same...
@app.route("/generate", methods=["POST"])
def generate():
    # ... your existing generate code (no changes needed)
    # The get_font() function will now use cached fonts
    pass

@app.route('/test-font/<font_name>')
def test_font(font_name):
    """Test a specific font loading"""
    try:
        font = get_font(font_name, 40)
        cache_key = f"{font_name}_40"
        is_cached = cache_key in FONT_CACHE
        
        if hasattr(font, 'path'):
            return f"✅ Font '{font_name}' loaded successfully from: {font.path} (Cached: {is_cached})"
        else:
            return f"⚠️ Font '{font_name}' loaded as default font (TTF not found) (Cached: {is_cached})"
    except Exception as e:
        return f"❌ Error loading font '{font_name}': {str(e)}"