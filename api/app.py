from flask import Flask, render_template, request, Response
from PIL import Image, ImageDraw, ImageFont
from pypdf import PdfReader
import pandas as pd
import io, os, zipfile  # Added zipfile import

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

def get_font(font_name, font_size):
    """Get PIL font object from Google Font name"""
    try:
        # First try to get the TTF file from our font mapping
        if font_name in FONT_MAP:
            ttf_filename = FONT_MAP[font_name]
            font_path = os.path.join(FONTS_DIR, ttf_filename)
            if os.path.exists(font_path):
                return ImageFont.truetype(font_path, font_size)
        
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
                return ImageFont.truetype(font_path, font_size)
        
        # Ultimate fallback: try any available font
        available_fonts = [f for f in os.listdir(FONTS_DIR) if f.endswith('.ttf')]
        if available_fonts:
            fallback_path = os.path.join(FONTS_DIR, available_fonts[0])
            return ImageFont.truetype(fallback_path, font_size)
        
        # If no fonts available, use default
        return ImageFont.load_default()
        
    except Exception as e:
        print(f"Font loading error: {e}")
        return ImageFont.load_default()

@app.route("/")
def index():
    return render_template("index.html")

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
        
        html_response = f"""
        <h2>Font Directory Status</h2>
        <p><strong>FONTS_DIR:</strong> {FONTS_DIR}</p>
        <p><strong>Total TTF files found:</strong> {len(ttf_files)}</p>
        
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

@app.route("/generate", methods=["POST"])
def generate():
    try:
        tpl_f    = request.files["template"]
        names_f  = request.files["names"]
        fname    = request.form["font_style"]
        fsize    = int(request.form["font_size"])
        fcolor   = hex_to_rgb(request.form["font_color"])
        sx,sy,ex,ey = map(float, request.form["coords"].split(","))
        output_format = request.form.get("output_format", "pdf")

        tpl = Image.open(io.BytesIO(tpl_f.read())).convert("RGB")
        ow,oh = tpl.size
        cx,cy = ((sx+ex)/2)*(ow/900), ((sy+ey)/2)*(oh/550)

        names = read_names(names_f)
        if not names:
            return Response("No names found", 400)

        # Use the font loading function
        font = get_font(fname, fsize)

        # Generate images with names
        images = []
        for name in names:
            img = tpl.copy()
            ImageDraw.Draw(img).text((cx,cy), name, font=font, fill=fcolor, anchor="mm")
            images.append((img, name))  # Store both image and name

        if output_format == "png":
            # Generate ZIP file with PNG images - FIXED VERSION
            zip_buffer = io.BytesIO()
            
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as zip_file:
                for i, (img, name) in enumerate(images, 1):
                    # Create PNG buffer for each image
                    png_buffer = io.BytesIO()
                    
                    # Save image as PNG
                    img.save(png_buffer, format="PNG", optimize=True)
                    
                    # Get the PNG data
                    png_data = png_buffer.getvalue()
                    
                    # Clean filename (remove special characters)
                    clean_name = "".join(c for c in name if c.isalnum() or c in (' ', '-', '_', '.')).strip()
                    if not clean_name:  # If name becomes empty after cleaning
                        clean_name = f"Certificate_{i}"
                    
                    # Create filename
                    filename = f"{i:03d}_{clean_name}.png"
                    
                    # Add file to ZIP
                    zip_file.writestr(filename, png_data)
                    
                    # Close PNG buffer
                    png_buffer.close()
            
            # Prepare ZIP for download
            zip_buffer.seek(0)
            zip_data = zip_buffer.getvalue()
            zip_buffer.close()
            
            # Return ZIP file
            return Response(
                zip_data, 
                mimetype="application/zip",
                headers={
                    "Content-Disposition": "attachment; filename=Certificates.zip",
                    "Content-Length": str(len(zip_data))
                }
            )
        
        else:
            # Generate PDF (existing functionality)
            pdf_images = [img for img, name in images]  # Extract just images
            pdf = io.BytesIO()
            if pdf_images:
                pdf_images[0].save(
                    pdf, 
                    format="PDF", 
                    save_all=True, 
                    append_images=pdf_images[1:] if len(pdf_images) > 1 else None,
                    optimize=True
                )
            pdf.seek(0)
            return Response(pdf.getvalue(), mimetype="application/pdf",
                          headers={"Content-Disposition": "attachment; filename=Certificates.pdf"})

    except Exception as e:
        return Response(f"Error: {e}", 500)

@app.route('/test-font/<font_name>')
def test_font(font_name):
    """Test a specific font loading"""
    try:
        font = get_font(font_name, 40)
        if hasattr(font, 'path'):
            return f"✅ Font '{font_name}' loaded successfully from: {font.path}"
        else:
            return f"⚠️ Font '{font_name}' loaded as default font (TTF not found)"
    except Exception as e:
        return f"❌ Error loading font '{font_name}': {str(e)}"
