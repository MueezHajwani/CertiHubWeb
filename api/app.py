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
            font = ImageFont.truetype(os.path.join(FONTS_DIR, "arial.ttf"), fsize)

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
