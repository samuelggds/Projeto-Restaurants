from __future__ import annotations

from io import BytesIO
from pathlib import Path
import zipfile

import fitz
import qrcode
from qrcode.constants import ERROR_CORRECT_Q
from qrcode.image.svg import SvgPathImage

TARGET_URL = "https://www.gastronexa.com.br"
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf" / "cartao-gastronexa"

PDFS = [
    OUT / "GastroNexa-cartao-90x50mm-sangria-3mm.pdf",
    OUT / "GastroNexa-cartao-90x50mm-com-marcas-de-corte.pdf",
]
README = OUT / "LEIA-ME-GRAFICA.txt"
ZIP_PATH = OUT / "GastroNexa-cartao-pacote-grafica.zip"

MM = 72.0 / 25.4

# Position copied from the existing card artwork. Coordinates are in millimetres
# relative to the 96 x 56 mm bleed artwork, using a top-left origin.
WHITE_BOX = (72.5320, 16.6167, 20.2759, 20.2830)
QR_BOX = (73.1700, 17.2582, 19.0, 19.0)


def qr_vector_pdf() -> fitz.Document:
    qr = qrcode.QRCode(
        error_correction=ERROR_CORRECT_Q,
        box_size=10,
        border=4,
    )
    qr.add_data(TARGET_URL)
    qr.make(fit=True)

    svg = qr.make_image(image_factory=SvgPathImage)
    buffer = BytesIO()
    svg.save(buffer)

    svg_doc = fitz.open(stream=buffer.getvalue(), filetype="svg")
    pdf_doc = fitz.open(stream=svg_doc.convert_to_pdf(), filetype="pdf")
    svg_doc.close()
    return pdf_doc


def mm_rect(x: float, y: float, w: float, h: float) -> fitz.Rect:
    return fitz.Rect(x * MM, y * MM, (x + w) * MM, (y + h) * MM)


def replace_qr(pdf_path: Path, qr_pdf: fitz.Document) -> None:
    doc = fitz.open(pdf_path)
    if doc.page_count < 2:
        raise RuntimeError(f"{pdf_path.name}: esperado PDF com frente e verso")

    page = doc[1]
    width_mm = page.rect.width / MM
    height_mm = page.rect.height / MM

    if abs(width_mm - 96.0) < 0.8 and abs(height_mm - 56.0) < 0.8:
        artwork_offset_x = 0.0
        artwork_offset_y = 0.0
    elif abs(width_mm - 108.0) < 0.8 and abs(height_mm - 68.0) < 0.8:
        artwork_offset_x = 6.0
        artwork_offset_y = 6.0
    else:
        raise RuntimeError(
            f"{pdf_path.name}: tamanho inesperado {width_mm:.2f} x {height_mm:.2f} mm"
        )

    wx, wy, ww, wh = WHITE_BOX
    qx, qy, qw, qh = QR_BOX

    white_rect = mm_rect(
        artwork_offset_x + wx,
        artwork_offset_y + wy,
        ww,
        wh,
    )
    qr_rect = mm_rect(
        artwork_offset_x + qx,
        artwork_offset_y + qy,
        qw,
        qh,
    )

    # Cover only the previous QR white square. All other card elements remain intact.
    page.draw_rect(white_rect, color=None, fill=(1, 1, 1), overlay=True)
    page.show_pdf_page(qr_rect, qr_pdf, 0, overlay=True, keep_proportion=True)

    tmp = pdf_path.with_suffix(".tmp.pdf")
    doc.save(tmp, garbage=4, deflate=True, clean=True)
    doc.close()
    tmp.replace(pdf_path)


def rebuild_zip() -> None:
    with zipfile.ZipFile(ZIP_PATH, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for path in [*PDFS, README]:
            zf.write(path, arcname=path.name)


def main() -> None:
    for path in [*PDFS, README]:
        if not path.exists():
            raise FileNotFoundError(path)

    qr_pdf = qr_vector_pdf()
    try:
        for pdf in PDFS:
            replace_qr(pdf, qr_pdf)
    finally:
        qr_pdf.close()

    rebuild_zip()
    print(f"QR atualizado para: {TARGET_URL}")
    for pdf in PDFS:
        print(f"Atualizado: {pdf.relative_to(ROOT)}")
    print(f"Atualizado: {ZIP_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
