from flask import Flask, render_template, request, send_file, Response
from PIL import Image, ImageDraw, ImageFont
from pandas import read_excel
from pypdf import PdfReader
import io
import os

app = Flask(__name__)

def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate', methods=['POST'])
def generate():
    try:
        # Get template & names file
        template_file = request.files['template']
        names_file = request.files['names']
        font_style = request.form['font_style']
        font_size = int(request.form['font_size'])
        font_color = hex_to_rgb(request.form['font_color'])
        coords = request.form['coords'].split(',')
        start_x, start_y, end_x, end_y = map(float, coords)

        # Load template & original size - use BytesIO to avoid file pointer issues
        template_data = io.BytesIO(template_file.read())
        template = Image.open(template_data).convert("RGB")
        orig_w, orig_h = template.size

        # Calculate scaled position based on 900x550 preview
        scale_x = orig_w / 900
        scale_y = orig_h / 550
        center_x = ((start_x + end_x) / 2) * scale_x
        center_y = ((start_y + end_y) / 2) * scale_y

        # Extract names - use BytesIO to avoid file pointer issues
        names = []
        names_data = names_file.read()
        
        if names_file.filename.endswith(".txt"):
            for line in names_data.decode("utf-8").splitlines():
                if line.strip():
                    names.append(line.strip())
        elif names_file.filename.endswith(".xlsx"):
            names_file_io = io.BytesIO(names_data)
            df = read_excel(names_file_io, header=None)
            for col in df.columns:
                for val in df[col]:
                    if str(val).strip().lower() != 'nan':
                        names.append(str(val).strip())
        elif names_file.filename.endswith(".pdf"):
            names_file_io = io.BytesIO(names_data)
            reader = PdfReader(names_file_io)
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    for line in text.splitlines():
                        if line.strip():
                            names.append(line.strip())

        if not names:
            return Response("No names found in the uploaded file", status=400)

        # Load the selected font
        try:
            if font_style == "arial.ttf":
                font = ImageFont.truetype("arial.ttf", font_size)
            else:
                font_path = font_style
                if os.path.exists(font_path):
                    font = ImageFont.truetype(font_path, font_size)
                else:
                    print(f"Font file not found: {font_path}, using default Arial")
                    font = ImageFont.truetype("arial.ttf", font_size)
        except OSError:
            print(f"Failed to load font: {font_style}, using default Arial")
            font = ImageFont.load_default()

        # Draw each certificate & collect in list
        images = []
        for name in names:
            cert = template.copy()
            draw = ImageDraw.Draw(cert)
            draw.text((center_x, center_y), name, font=font, fill=font_color, anchor="mm")
            images.append(cert)

        if not images:
            return Response("No certificates generated", status=400)

        # Save as merged PDF
        pdf_bytes = io.BytesIO()
        images[0].save(pdf_bytes, format="PDF", save_all=True, append_images=images[1:])
        pdf_bytes.seek(0)

        # Force Save As dialog
        return Response(
            pdf_bytes.getvalue(),
            mimetype="application/pdf",
            headers={
                "Content-Disposition": "attachment; filename=Generated_Certificates.pdf",
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        )
        
    except Exception as e:
        print(f"Error generating certificates: {str(e)}")
        return Response(f"Error generating certificates: {str(e)}", status=500)

if __name__ == '__main__':
    app.run(debug=True)