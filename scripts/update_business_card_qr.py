"""Preserve the approved print artwork and replace only its QR with CMYK vectors.

Optional --source restores an approved 96 x 56 mm, two-page PDF.
No rasterization, resampling, font substitution or logo reconstruction is done.
"""

from __future__ import annotations

import argparse
import sys
import zipfile
from io import BytesIO
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCAL_DEPS = ROOT / "tmp/pdfs/gastronexa-deps"
if LOCAL_DEPS.exists():
    sys.path.insert(0, str(LOCAL_DEPS))

import qrcode
from pypdf import PageObject, PdfReader, PdfWriter, Transformation
from pypdf.generic import NameObject, RectangleObject
from reportlab.pdfgen import canvas

TARGET_URL = "https://www.gastronexa.com.br"
OUT = ROOT / "output/pdf/cartao-gastronexa"
PDFS = [
    OUT / "GastroNexa-cartao-90x50mm-sangria-3mm.pdf",
    OUT / "GastroNexa-cartao-90x50mm-com-marcas-de-corte.pdf",
]
README = OUT / "LEIA-ME-GRAFICA.txt"
ZIP_PATH = OUT / "GastroNexa-cartao-pacote-grafica.zip"
MM = 72.0 / 25.4

# Exact position of the approved PDF's white QR square, in PDF points with
# top-left origin. These are not source-PNG or screenshot coordinates.
QR_X = 193.71969604492188
QR_Y = 47.89134216308594
QR_SIZE = 19 * MM


def qr_overlay() -> PdfReader:
    code = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_Q, border=4)
    code.add_data(TARGET_URL)
    code.make(fit=True)
    matrix = code.get_matrix()
    module = QR_SIZE / len(matrix)
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=(96 * MM, 56 * MM), pageCompression=1, pdfVersion=(1, 4))
    bottom = 56 * MM - QR_Y - QR_SIZE
    c.setFillColorCMYK(0, 0, 0, 0)
    c.rect(QR_X, bottom, QR_SIZE, QR_SIZE, fill=1, stroke=0)
    path = c.beginPath()
    for row, values in enumerate(matrix):
        for col, enabled in enumerate(values):
            if enabled:
                path.rect(QR_X + col * module, bottom + (len(matrix) - row - 1) * module, module, module)
    # One compound fill avoids antialias seams; every black module is 100% K.
    c.setFillColorCMYK(0, 0, 0, 1)
    c.drawPath(path, fill=1, stroke=0, fillMode=1)
    c.showPage()
    c.save()
    buffer.seek(0)
    return PdfReader(buffer)


def crop_marks() -> PdfReader:
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=(108 * MM, 68 * MM), pageCompression=1, pdfVersion=(1, 4))
    c.setStrokeColorCMYK(0, 0, 0, 1)
    c.setLineWidth(.25)
    for x in (9 * MM, 99 * MM):
        c.line(x, 2 * MM, x, 5 * MM)
        c.line(x, 63 * MM, x, 66 * MM)
    for y in (9 * MM, 59 * MM):
        c.line(2 * MM, y, 5 * MM, y)
        c.line(103 * MM, y, 106 * MM, y)
    c.showPage()
    c.save()
    buffer.seek(0)
    return PdfReader(buffer)


def set_boxes(page, marks=False):
    if not marks:
        # Keep the approved boxes byte-for-byte, including harmless decimal
        # rounding, so rendering starts on exactly the same pixel grid.
        return
    w, h, bleed, trim = 108, 68, 6, 9
    page.mediabox = RectangleObject([0, 0, w * MM, h * MM])
    page.cropbox = page.mediabox
    page.bleedbox = RectangleObject([bleed * MM, bleed * MM, (w - bleed) * MM, (h - bleed) * MM])
    page.trimbox = RectangleObject([trim * MM, trim * MM, (w - trim) * MM, (h - trim) * MM])


def save_pdf(writer, source, destination):
    # Copy the approved CMYK output profile without converting the artwork.
    intent = source.trailer["/Root"].get("/OutputIntents")
    if not intent:
        raise ValueError("O PDF fonte precisa conter o perfil ICC CMYK aprovado.")
    writer._root_object[NameObject("/OutputIntents")] = intent.clone(writer)
    preferences = source.trailer["/Root"].get("/ViewerPreferences")
    if preferences:
        writer._root_object[NameObject("/ViewerPreferences")] = preferences.clone(writer)
    writer.pdf_header = "%PDF-1.4"
    metadata = dict(source.metadata or {})
    metadata.update({
        "/Title": "GastroNexa - Cartão 90x50 mm - Frente e verso",
        "/Subject": "Arte original CMYK preservada; corte 90x50 mm; sangria 3 mm; QR vetorial https://www.gastronexa.com.br",
    })
    writer.add_metadata(metadata)
    staging = destination.with_suffix(".tmp.pdf")
    with staging.open("wb") as handle:
        writer.write(handle)
    staging.replace(destination)


def prepare(source_path):
    # Load in memory so replacement also works when source is the final PDF.
    source = PdfReader(BytesIO(source_path.read_bytes()))
    if len(source.pages) != 2:
        raise ValueError("A arte aprovada deve conter exatamente frente e verso.")
    for page in source.pages:
        if abs(float(page.mediabox.width) / MM - 96) > .01 or abs(float(page.mediabox.height) / MM - 56) > .01:
            raise ValueError("Use a arte fonte 96 x 56 mm (90 x 50 mm + sangria 3 mm).")
    source.pages[1].merge_page(qr_overlay().pages[0])
    plain = PdfWriter()
    for original in source.pages:
        page = plain.add_page(original)
        set_boxes(page)
    save_pdf(plain, source, PDFS[0])
    marked = PdfWriter()
    marks = crop_marks().pages[0]
    for original in source.pages:
        page = PageObject.create_blank_page(width=108 * MM, height=68 * MM)
        page.merge_transformed_page(original, Transformation().translate(6 * MM, 6 * MM))
        page.merge_page(marks)
        set_boxes(page, marks=True)
        marked.add_page(page)
    save_pdf(marked, source, PDFS[1])


def rebuild_zip():
    staging = ZIP_PATH.with_suffix(".tmp.zip")
    with zipfile.ZipFile(staging, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in [*PDFS, README]:
            archive.write(path, arcname=path.name)
    staging.replace(ZIP_PATH)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=PDFS[0])
    args = parser.parse_args()
    prepare(args.source)
    rebuild_zip()
    print(f"Arte original preservada; QR vetorial: {TARGET_URL}")
    for path in [*PDFS, ZIP_PATH]:
        print(path.relative_to(ROOT))


if __name__ == "__main__":
    main()
