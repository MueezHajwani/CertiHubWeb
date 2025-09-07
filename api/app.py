from flask import Flask, render_template, request, Response
from PIL import Image, ImageDraw, ImageFont
from pypdf import PdfReader
import pandas as pd
import io, os

# IMPORTANT: Configure paths for Vercel
app = Flask(__name__, 
            static_folder='../static', 
            template_folder='../templates')

FONTS_DIR = os.path.join(os.path.dirname(__file__), '..', 'static', 'fonts')

def hex_to_rgb(code):
    code = code.lstrip("#")
    return tuple(int(code[i:i+2], 16) for i in (0, 2, 4))

def read_names(fs):
    data = fs.read(); names = []
    if fs.filename.endswith(".txt"):
        names = [ln.strip() for ln in data.decode("utf-8").splitlines() if ln.strip()]
    elif fs.filename.endswith(".xlsx"):
        df = pd.read_excel(io.BytesIO(data), header=None)
        for col in df.columns:
            names += [str(v).strip() for v in df[col] if str(v).strip().lower() != "nan"]
    elif fs.filename.endswith(".pdf"):
        rdr = PdfReader(io.BytesIO(data))
        for p in rdr.pages:
            if (txt := p.extract_text()):
                names += [ln.strip() for ln in txt.splitlines() if ln.strip()]
    return names

@app.route("/")
def index():
    return render_template("index.html")

# Add this debug route to test font access
@app.route('/test-fonts')
def test_fonts():
    """Test route to check if fonts are accessible"""
    font_files = []
    try:
        for filename in os.listdir(FONTS_DIR):
            if filename.endswith('.ttf'):
                font_files.append(f'/static/fonts/{filename}')
        return f"<h2>Found {len(font_files)} fonts:</h2><ul>" + "".join([f"<li><a href='{font}' target='_blank'>{font}</a></li>" for font in sorted(font_files)]) + "</ul>"
    except Exception as e:
        return f"<h2>Error accessing fonts directory:</h2><p>{str(e)}</p><p>FONTS_DIR path: {FONTS_DIR}</p>"

# Add this route to serve fonts directly (backup method)
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

        tpl = Image.open(io.BytesIO(tpl_f.read())).convert("RGB")
        ow,oh = tpl.size
        cx,cy = ((sx+ex)/2)*(ow/900), ((sy+ey)/2)*(oh/550)

        names = read_names(names_f)
        if not names:
            return Response("No names found", 400)

        try:
            font = ImageFont.truetype(os.path.join(FONTS_DIR, fname), fsize)
        except OSError:
            # Fallback fonts in order of preference
            fallback_fonts = ["arial.ttf", "Arial.ttf", "Anton.ttf", "Poppins.ttf"]
            font = None
            for fallback in fallback_fonts:
                try:
                    font = ImageFont.truetype(os.path.join(FONTS_DIR, fallback), fsize)
                    break
                except OSError:
                    continue
            
            if font is None:
                # Use default font if no TTF fonts are available
                font = ImageFont.load_default()

        pages=[]
        for n in names:
            img=tpl.copy()
            ImageDraw.Draw(img).text((cx,cy), n, font=font, fill=fcolor, anchor="mm")
            pages.append(img)

        pdf=io.BytesIO()
        pages[0].save(pdf, format="PDF", save_all=True, append_images=pages[1:])
        pdf.seek(0)
        return Response(pdf.getvalue(), mimetype="application/pdf",
                        headers={"Content-Disposition":"attachment; filename=Certificates.pdf"})
    except Exception as e:
        return Response(f"Error: {e}", 500)

# REMOVE any if __name__ == '__main__' block completely
