from PIL import Image, ImageDraw, ImageFont
from pandas import read_excel
from pypdf import PdfReader
from io import BytesIO

def read_names(file_storage):
    names = []
    filename = file_storage.filename
    if filename.endswith('.txt'):
        text_data = file_storage.read().decode('utf-8')
        names = [line.strip() for line in text_data.splitlines() if line.strip()]
    elif filename.endswith('.xlsx'):
        df = read_excel(file_storage, header=None)
        for col in df.columns:
            for val in df[col]:
                name = str(val).strip()
                if name and name.lower() != 'nan':
                    names.append(name)
    elif filename.endswith('.pdf'):
        pdf_reader = PdfReader(file_storage)
        for page in pdf_reader.pages:
            text = page.extract_text()
            if text:
                names.extend([line.strip() for line in text.split('\n') if line.strip()])
    return names

def generate_certificates(template_file, names_file, font_size, color, position, output_buffer):
    font_path = "C:/Windows/Fonts/arial.ttf"  # Default font
    names = read_names(names_file)
    images = []

    for name in names:
        cert = Image.open(template_file).convert("RGB")
        draw = ImageDraw.Draw(cert)
        font = ImageFont.truetype(font_path, font_size)
        draw.text(position, name, fill=color, font=font, anchor="mm")
        images.append(cert)

    if images:
        first_image = images[0].convert("RGB")
        rest_images = [img.convert("RGB") for img in images[1:]]
        first_image.save(output_buffer, format="PDF", save_all=True, append_images=rest_images)
