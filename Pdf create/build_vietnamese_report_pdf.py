import glob
import os
import re

from PIL import Image as PILImage, ImageOps
from pypdf import PdfReader
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Flowable,
    Image,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)
PDF_FILES_DIR = os.path.join(ROOT_DIR, "Pdf files")
INPUT_DIR = os.path.join(PDF_FILES_DIR, "input")
OUTPUT_DIR = os.path.join(PDF_FILES_DIR, "output")
PREVIEW_DIR = os.path.join(BASE_DIR, "previews")
GENERATED_DIR = os.path.join(BASE_DIR, "assets/generated")

os.makedirs(INPUT_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(GENERATED_DIR, exist_ok=True)


def latest_file(folder, patterns):
    paths = []
    for pattern in patterns:
        paths.extend(glob.glob(os.path.join(folder, pattern)))
    paths = [path for path in paths if os.path.isfile(path)]
    return max(paths, key=os.path.getmtime) if paths else None


def output_slug_from_input(path):
    if not path:
        return "CLOWCAT_OUTPUT"
    name = os.path.splitext(os.path.basename(path))[0]
    name = re.sub(r"[^0-9A-Za-zÀ-ỹ]+", "_", name, flags=re.UNICODE)
    name = re.sub(r"_+", "_", name).strip("_")
    return name.upper() or "CLOWCAT_OUTPUT"


INPUT_PDF = latest_file(INPUT_DIR, ("*.pdf", "*.PDF"))
INPUT_MAP = latest_file(
    INPUT_DIR,
    ("*.jpg", "*.jpeg", "*.png", "*.webp", "*.JPG", "*.JPEG", "*.PNG", "*.WEBP"),
)
OUTPUT = os.path.join(OUTPUT_DIR, f"{output_slug_from_input(INPUT_PDF)}_VietHoa_ClowCat.pdf")

LOGO = os.path.join(ROOT_DIR, "hinh/logo.png")
HERO_BG = os.path.join(ROOT_DIR, "hinh/background.jpg")
FALL_CARD_1 = os.path.join(ROOT_DIR, "hinh/labai1.jpg")
FALL_CARD_2 = os.path.join(ROOT_DIR, "hinh/labai5.jpg")
FALL_CARD_3 = os.path.join(ROOT_DIR, "hinh/baiclow.png")

BG_DARK = colors.HexColor("#0A0812")
BG_MID = colors.HexColor("#110E1F")
PURPLE_DEEP = colors.HexColor("#2D1B5E")
PURPLE_MAIN = colors.HexColor("#6B3FA0")
PURPLE_BRIGHT = colors.HexColor("#B47EE5")
GOLD = colors.HexColor("#C9A84C")
GOLD_LIGHT = colors.HexColor("#E8CC7A")
WHITE = colors.HexColor("#F5F0FF")
MUTED = colors.HexColor("#A89BBA")
INK = colors.HexColor("#EEE7FF")
GLASS = colors.Color(107 / 255, 63 / 255, 160 / 255, 0.13)
GLASS_STRONG = colors.Color(45 / 255, 27 / 255, 94 / 255, 0.55)
LINE = colors.Color(180 / 255, 126 / 255, 229 / 255, 0.25)
CONTENT_W = 170 * mm


pdfmetrics.registerFont(TTFont("Arial", "/System/Library/Fonts/Supplemental/Arial.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Bold", "/System/Library/Fonts/Supplemental/Arial Bold.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Italic", "/System/Library/Fonts/Supplemental/Arial Italic.ttf"))
pdfmetrics.registerFont(TTFont("Georgia", "/System/Library/Fonts/Supplemental/Georgia.ttf"))
pdfmetrics.registerFont(TTFont("Georgia-Bold", "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"))
pdfmetrics.registerFont(TTFont("Georgia-Italic", "/System/Library/Fonts/Supplemental/Georgia Italic.ttf"))

styles = getSampleStyleSheet()
styles.add(ParagraphStyle("Kicker", fontName="Arial-Bold", fontSize=8.2, leading=10, textColor=GOLD, uppercase=True, spaceAfter=4))
styles.add(ParagraphStyle("H1", fontName="Georgia-Bold", fontSize=19, leading=23, textColor=WHITE, spaceBefore=2, spaceAfter=8))
styles.add(ParagraphStyle("H2", fontName="Georgia-Bold", fontSize=13.6, leading=17, textColor=GOLD_LIGHT, spaceBefore=4, spaceAfter=6))
styles.add(ParagraphStyle("H3", fontName="Arial-Bold", fontSize=10.4, leading=13.5, textColor=WHITE, spaceAfter=3))
styles.add(ParagraphStyle("Body", fontName="Arial", fontSize=10.5, leading=15.6, textColor=INK, alignment=TA_JUSTIFY, spaceAfter=6))
styles.add(ParagraphStyle("BodyLeft", fontName="Arial", fontSize=10.5, leading=15.6, textColor=INK, alignment=TA_LEFT, spaceAfter=6))
styles.add(ParagraphStyle("BodySmall", fontName="Arial", fontSize=9.2, leading=13.4, textColor=INK, alignment=TA_JUSTIFY, spaceAfter=4))
styles.add(ParagraphStyle("Muted", fontName="Arial", fontSize=8.6, leading=12.2, textColor=MUTED, spaceAfter=3))
styles.add(ParagraphStyle("Center", fontName="Arial", fontSize=9.4, leading=12.6, textColor=INK, alignment=TA_CENTER))
styles.add(ParagraphStyle("Number", fontName="Georgia-Bold", fontSize=25, leading=27, textColor=GOLD_LIGHT, alignment=TA_CENTER))
styles.add(ParagraphStyle("Quote", fontName="Georgia-Italic", fontSize=13.3, leading=19, textColor=WHITE, alignment=TA_CENTER, spaceAfter=2))


def P(text, style="Body"):
    return Paragraph(text, styles[style])


def validate_input_files():
    missing = []
    if not INPUT_PDF:
        missing.append("- 1 file PDF nguồn trong `Pdf files/input`")
    if not INPUT_MAP:
        missing.append("- 1 ảnh trải bài trong `Pdf files/input` (.jpg/.jpeg/.png/.webp)")
    if missing:
        raise FileNotFoundError(
            "Thiếu file đầu vào để tạo PDF mẫu Clow Cat:\n"
            + "\n".join(missing)
            + "\nHãy để đúng 1 PDF và 1 ảnh trải bài của khách vào thư mục `Pdf files/input`."
        )


def clean_pdf_text(path):
    if not path:
        return ""
    parts = []
    reader = PdfReader(path)
    for page in reader.pages:
        text = page.extract_text() or ""
        text = re.sub(r"\s+", " ", text)
        parts.append(text.strip())
    return "\n\n".join(parts)


def prepared_reading_image():
    out = os.path.join(GENERATED_DIR, "abc_reading_map.jpg")
    with PILImage.open(INPUT_MAP) as image:
        image = ImageOps.exif_transpose(image).convert("RGB")
        image.thumbnail((2200, 2200), PILImage.Resampling.LANCZOS)
        image.save(out, quality=90)
    return out


class SectionBand(Flowable):
    def __init__(self, number, title, subtitle=None, width=CONTENT_W):
        super().__init__()
        self.number = number
        self.title = title
        self.subtitle = subtitle
        self.width = width
        self.height = 22 * mm if subtitle else 17 * mm

    def draw(self):
        c = self.canv
        c.setFillColor(GLASS_STRONG)
        c.setStrokeColor(LINE)
        c.roundRect(0, 0, self.width, self.height, 8, fill=1, stroke=1)
        c.setFillColor(GOLD)
        c.roundRect(0, 0, 24 * mm, self.height, 8, fill=1, stroke=0)
        c.setFillColor(BG_DARK)
        c.setFont("Georgia-Bold", 15.5)
        c.drawCentredString(12 * mm, self.height / 2 - 4.8, self.number)
        c.setFillColor(WHITE)
        c.setFont("Georgia-Bold", 13.5)
        c.drawString(29 * mm, self.height - 7.4 * mm, self.title)
        if self.subtitle:
            c.setFillColor(MUTED)
            c.setFont("Arial", 8.3)
            c.drawString(29 * mm, self.height - 12.8 * mm, self.subtitle)


class ReadingPhoto(Flowable):
    def __init__(self, image_path, width=CONTENT_W, height=188 * mm):
        super().__init__()
        self.image_path = image_path
        self.width = width
        self.height = height

    def draw(self):
        c = self.canv
        c.setFillColor(colors.Color(255 / 255, 255 / 255, 255 / 255, 0.06))
        c.setStrokeColor(colors.Color(201 / 255, 168 / 255, 76 / 255, 0.45))
        c.roundRect(0, 0, self.width, self.height, 14, fill=1, stroke=1)
        pad = 6 * mm
        inner_w = self.width - pad * 2
        inner_h = self.height - pad * 2
        with PILImage.open(self.image_path) as image:
            iw, ih = image.size
        scale = min(inner_w / iw, inner_h / ih)
        draw_w = iw * scale
        draw_h = ih * scale
        x = pad + (inner_w - draw_w) / 2
        y = pad + (inner_h - draw_h) / 2
        c.setFillColor(colors.HexColor("#160F26"))
        c.roundRect(x - 2 * mm, y - 2 * mm, draw_w + 4 * mm, draw_h + 4 * mm, 10, fill=1, stroke=0)
        c.drawImage(self.image_path, x, y, width=draw_w, height=draw_h, preserveAspectRatio=True, mask="auto")


def card(content, width=CONTENT_W, pad=8, fill=GLASS):
    inner = [item if not isinstance(item, str) else P(item) for item in content]
    table = Table([[inner]], colWidths=[width], hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), fill),
                ("BOX", (0, 0), (-1, -1), 0.7, LINE),
                ("LEFTPADDING", (0, 0), (-1, -1), pad),
                ("RIGHTPADDING", (0, 0), (-1, -1), pad),
                ("TOPPADDING", (0, 0), (-1, -1), pad),
                ("BOTTOMPADDING", (0, 0), (-1, -1), pad),
            ]
        )
    )
    return table


def stat_card(number, label, detail):
    return card(
        [
            P(number, "Number"),
            P(f"<b>{label}</b>", "Center"),
            P(detail, "Muted"),
        ],
        width=52 * mm,
        pad=7,
        fill=colors.Color(107 / 255, 63 / 255, 160 / 255, 0.16),
    )


def insight_table(rows, widths=(39 * mm, 131 * mm)):
    data = [[P(f"<b>{left}</b>", "BodySmall"), P(right, "BodySmall")] for left, right in rows]
    table = Table(data, colWidths=list(widths), hAlign="LEFT", repeatRows=0)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.Color(255 / 255, 255 / 255, 255 / 255, 0.045)),
                ("BACKGROUND", (0, 0), (0, -1), colors.Color(201 / 255, 168 / 255, 76 / 255, 0.12)),
                ("BOX", (0, 0), (-1, -1), 0.65, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.35, colors.Color(255 / 255, 255 / 255, 255 / 255, 0.075)),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return table


def two_column(left, right):
    table = Table(
        [[card(left, width=82 * mm), Spacer(6 * mm, 1), card(right, width=82 * mm)]],
        colWidths=[82 * mm, 6 * mm, 82 * mm],
        hAlign="LEFT",
    )
    table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0)]))
    return table


def flow_steps(rows):
    data = []
    for card_name, role, message in rows:
        data.append([P(f"<b>{card_name}</b><br/><font color='#E8CC7A'>{role}</font>", "Center"), P(message, "BodySmall")])
    table = Table(data, colWidths=[42 * mm, 128 * mm], hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.Color(255 / 255, 255 / 255, 255 / 255, 0.045)),
                ("BACKGROUND", (0, 0), (0, -1), colors.Color(107 / 255, 63 / 255, 160 / 255, 0.20)),
                ("BOX", (0, 0), (-1, -1), 0.65, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.35, colors.Color(255 / 255, 255 / 255, 255 / 255, 0.08)),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return table


def draw_background(canvas, doc):
    canvas.saveState()
    w, h = A4
    canvas.setFillColor(BG_DARK)
    canvas.rect(0, 0, w, h, fill=1, stroke=0)
    canvas.setFillColor(BG_MID)
    canvas.rect(0, 0, w, h * 0.54, fill=1, stroke=0)
    canvas.setFillColor(colors.Color(107 / 255, 63 / 255, 160 / 255, 0.20))
    canvas.circle(w - 18 * mm, h - 18 * mm, 56 * mm, fill=1, stroke=0)
    canvas.setFillColor(colors.Color(201 / 255, 168 / 255, 76 / 255, 0.12))
    canvas.circle(18 * mm, 20 * mm, 54 * mm, fill=1, stroke=0)
    canvas.setFillColor(colors.Color(180 / 255, 126 / 255, 229 / 255, 0.62))
    for x, y, r in [(24, 265, 0.8), (54, 246, 0.55), (162, 262, 0.75), (186, 222, 0.5), (36, 58, 0.5), (172, 80, 0.65)]:
        canvas.circle(x * mm, y * mm, r * mm, fill=1, stroke=0)

    canvas.setFillAlpha(0.86)
    if os.path.exists(LOGO):
        canvas.drawImage(LOGO, w / 2 - 11 * mm, 21 * mm, width=22 * mm, height=22 * mm, mask="auto")
    canvas.setFillAlpha(1)
    canvas.setFillColor(GOLD)
    canvas.setFont("Arial-Bold", 7.4)
    canvas.drawCentredString(w / 2, 15.6 * mm, "KHÁM PHÁ BẢN THÂN, BẬT PHÁ TIỀM NĂNG")
    canvas.setStrokeColor(colors.Color(255 / 255, 255 / 255, 255 / 255, 0.08))
    canvas.line(18 * mm, 13 * mm, w - 18 * mm, 13 * mm)
    canvas.setFillColor(MUTED)
    canvas.setFont("Arial", 7.0)
    canvas.drawString(18 * mm, 7.7 * mm, "© 2026 Clow Cat Patronus")
    canvas.drawRightString(w - 18 * mm, 7.7 * mm, f"Trang {doc.page}")
    canvas.restoreState()


def draw_cover(canvas, doc):
    canvas.saveState()
    w, h = A4
    canvas.setFillColor(BG_DARK)
    canvas.rect(0, 0, w, h, fill=1, stroke=0)
    if os.path.exists(HERO_BG):
        canvas.drawImage(HERO_BG, 0, 0, width=w, height=h, preserveAspectRatio=True, anchor="c", mask="auto")
    canvas.setFillColor(colors.Color(10 / 255, 8 / 255, 18 / 255, 0.78))
    canvas.rect(0, 0, w, h, fill=1, stroke=0)
    canvas.setFillColor(colors.Color(107 / 255, 63 / 255, 160 / 255, 0.27))
    canvas.circle(w * 0.78, h * 0.74, 58 * mm, fill=1, stroke=0)
    canvas.setFillColor(colors.Color(201 / 255, 168 / 255, 76 / 255, 0.16))
    canvas.circle(w * 0.18, h * 0.28, 50 * mm, fill=1, stroke=0)

    if os.path.exists(FALL_CARD_1):
        canvas.setFillAlpha(0.28)
        canvas.drawImage(FALL_CARD_1, 10 * mm, 190 * mm, width=31 * mm, height=48 * mm, preserveAspectRatio=True, mask="auto")
    if os.path.exists(FALL_CARD_2):
        canvas.drawImage(FALL_CARD_2, 166 * mm, 190 * mm, width=31 * mm, height=48 * mm, preserveAspectRatio=True, mask="auto")
    if os.path.exists(FALL_CARD_3):
        canvas.drawImage(FALL_CARD_3, 152 * mm, 32 * mm, width=38 * mm, height=50 * mm, preserveAspectRatio=True, mask="auto")
    canvas.setFillAlpha(1)

    if os.path.exists(LOGO):
        canvas.drawImage(LOGO, w / 2 - 25 * mm, h - 77 * mm, width=50 * mm, height=50 * mm, mask="auto")

    canvas.setFillColor(colors.Color(107 / 255, 63 / 255, 160 / 255, 0.18))
    canvas.setStrokeColor(colors.Color(180 / 255, 126 / 255, 229 / 255, 0.28))
    canvas.roundRect(54 * mm, h - 92 * mm, 102 * mm, 11 * mm, 5.5 * mm, fill=1, stroke=1)
    canvas.setFillColor(PURPLE_BRIGHT)
    canvas.setFont("Arial-Bold", 8.3)
    canvas.drawCentredString(w / 2, h - 88.2 * mm, "CLOW CAT PATRONUS")

    canvas.setFillColor(WHITE)
    canvas.setFont("Georgia-Bold", 31)
    canvas.drawCentredString(w / 2, h - 118 * mm, "HỒ SƠ TRẢI BÀI")
    canvas.setFillColor(GOLD_LIGHT)
    canvas.setFont("Georgia-Bold", 34)
    canvas.drawCentredString(w / 2, h - 134 * mm, "CLOW CARD")
    canvas.setStrokeColor(colors.Color(201 / 255, 168 / 255, 76 / 255, 0.55))
    canvas.line(51 * mm, h - 141 * mm, 159 * mm, h - 141 * mm)

    subtitle = Paragraph(
        "Hành trình chuyển hóa từ trạng thái trôi nổi, mất định hướng sang tỉnh thức và làm chủ sự nghiệp.",
        ParagraphStyle("CoverSub", fontName="Georgia-Italic", fontSize=13.2, leading=19, textColor=WHITE, alignment=TA_CENTER),
    )
    subtitle.wrapOn(canvas, 136 * mm, 28 * mm)
    subtitle.drawOn(canvas, 37 * mm, h - 169 * mm)

    stat_y = h - 204 * mm
    stats = [("10", "LÁ BÀI", "mở bản đồ năng lượng"), ("4", "CHẶNG ĐỌC", "vấn đề · gốc rễ · lời khuyên · hành động"), ("1", "THÔNG ĐIỆP", "biết giá trị của mình")]
    gap = 7 * mm
    card_w = (158 * mm - gap * 2) / 3
    x0 = 26 * mm
    for i, (num, label, desc) in enumerate(stats):
        x = x0 + i * (card_w + gap)
        canvas.setFillColor(colors.Color(255 / 255, 255 / 255, 255 / 255, 0.075))
        canvas.setStrokeColor(colors.Color(201 / 255, 168 / 255, 76 / 255, 0.30))
        canvas.roundRect(x, stat_y - 19 * mm, card_w, 35 * mm, 9, fill=1, stroke=1)
        canvas.setFillColor(GOLD_LIGHT)
        canvas.setFont("Georgia-Bold", 26)
        canvas.drawCentredString(x + card_w / 2, stat_y - 0.5 * mm, num)
        canvas.setFillColor(WHITE)
        canvas.setFont("Arial-Bold", 7.3)
        canvas.drawCentredString(x + card_w / 2, stat_y - 9 * mm, label)
        canvas.setFillColor(MUTED)
        canvas.setFont("Arial", 6.6)
        canvas.drawCentredString(x + card_w / 2, stat_y - 14.8 * mm, desc)

    table_x = 26 * mm
    table_y = 41 * mm
    canvas.setFillColor(colors.Color(255 / 255, 255 / 255, 255 / 255, 0.07))
    canvas.setStrokeColor(colors.Color(180 / 255, 126 / 255, 229 / 255, 0.28))
    canvas.roundRect(table_x, table_y, 158 * mm, 35 * mm, 9, fill=1, stroke=1)
    rows = [("Tư liệu nguồn", os.path.basename(INPUT_PDF or "")), ("Ảnh trải bài", os.path.basename(INPUT_MAP or "")), ("Phong cách", "Trang coi bài Clow Cat Patronus")]
    for i, (label, value) in enumerate(rows):
        y = table_y + 24 * mm - i * 10 * mm
        canvas.setFillColor(MUTED)
        canvas.setFont("Arial-Bold", 8.5)
        canvas.drawString(table_x + 7 * mm, y, label)
        canvas.setFillColor(WHITE)
        canvas.setFont("Arial-Bold", 9.4)
        canvas.drawString(table_x + 51 * mm, y, value[:58])
        if i < 2:
            canvas.setStrokeColor(colors.Color(255 / 255, 255 / 255, 255 / 255, 0.08))
            canvas.line(table_x + 7 * mm, y - 4.2 * mm, table_x + 151 * mm, y - 4.2 * mm)

    canvas.setFillColor(colors.Color(10 / 255, 8 / 255, 18 / 255, 0.58))
    canvas.roundRect(26 * mm, 19 * mm, 158 * mm, 10 * mm, 5, fill=1, stroke=0)
    canvas.setFillColor(colors.Color(255 / 255, 255 / 255, 255 / 255, 0.78))
    canvas.setFont("Arial-Bold", 8.3)
    canvas.drawCentredString(w / 2, 22.5 * mm, "Được biên tập thành PDF tư vấn trực quan từ nội dung abc.pdf và abc.jpg")
    canvas.restoreState()


def build():
    validate_input_files()
    _ = clean_pdf_text(INPUT_PDF)
    reading_image = prepared_reading_image()

    doc = SimpleDocTemplate(
        OUTPUT,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=24 * mm,
    )

    story = [Spacer(1, 1), PageBreak()]

    story.append(SectionBand("01", "Đúc Kết Chủ Đề Chính", "Từ mất định hướng đến làm chủ sự nghiệp"))
    story.append(Spacer(1, 7 * mm))
    story.append(
        card(
            [
                P("Chủ đề cốt lõi", "Kicker"),
                P("Khi đi tìm việc không chỉ là rải CV", "H1"),
                P("Trải bài cho thấy Querent đã mắc kẹt khoảng 1,5 năm trong cảm giác bế tắc: môi trường làm việc độc hại, phỏng vấn không hợp, thiếu đam mê và chưa nhìn rõ giá trị cá nhân. Vấn đề không chỉ nằm ở thị trường hay công ty, mà nằm ở năng lượng bên trong đang bị phân tán và chưa được soi sáng.", "Body"),
                P("Thông điệp lớn nhất: cơ hội tốt chỉ xuất hiện khi ta dũng cảm soi lại điểm yếu của chính mình, ngừng chờ đợi thụ động và bắt đầu xây dựng giá trị đủ rõ để thu hút đúng người, đúng nơi, đúng môi trường.", "Body"),
            ],
            fill=colors.Color(107 / 255, 63 / 255, 160 / 255, 0.18),
        )
    )
    story.append(Spacer(1, 8 * mm))
    story.append(Table([[stat_card("1.5", "NĂM BẾ TẮC", "trạng thái cũ kéo dài"), stat_card("10", "LÁ CLOW", "soi từng tầng vấn đề"), stat_card("2", "CHIẾN LƯỢC", "shadow work và thương hiệu cá nhân")]], colWidths=[56 * mm, 56 * mm, 56 * mm], hAlign="LEFT"))
    story.append(Spacer(1, 8 * mm))
    story.append(
        insight_table(
            [
                ("Gốc năng lượng", "Thiếu sự thấu hiểu bản thân và quá bị động trong việc xây dựng giá trị cá nhân."),
                ("Điểm xoay", "The Mirror yêu cầu chậm lại, nhìn thẳng vào nội tâm và nhận diện những điểm yếu đang bị né tránh."),
                ("Lời mở khóa", "The Light chỉ ra rằng may mắn đến khi Querent tự tin, biết mình có gì và đưa giá trị ấy ra ngoài một cách rõ ràng."),
            ]
        )
    )
    story.append(PageBreak())

    story.append(SectionBand("02", "Bài Viết Tổng Quan", "Bài học sự nghiệp từ một trải bài Clow"))
    story.append(Spacer(1, 7 * mm))
    story.append(
        two_column(
            [
                P("Khi công việc thiếu Nước", "H2"),
                P("Sự vắng mặt của nguyên tố Nước nhắc rằng công việc hiện tại hoặc các lựa chọn nghề nghiệp trước đây đang thiếu cảm xúc, niềm vui và sự sống bên trong. Khi làm chỉ vì tiền hoặc vì chuyên môn quen thuộc, Querent dễ mất động lực và làm mọi thứ nửa vời.", "BodySmall"),
                P("Bài học ở đây không phải bỏ hết để chạy theo cảm xúc, mà là thành thật hỏi: điều gì khiến mình thật sự muốn đóng góp?", "BodySmall"),
            ],
            [
                P("Khi hành trình thiếu Ánh Sáng", "H2"),
                P("Thiếu Ánh Sáng nghĩa là thiếu tầm nhìn, thiếu cơ hội thăng tiến và thiếu một điểm đến đủ rõ. Nếu chính mình còn mông lung, vũ trụ cũng khó đưa đến một cánh cửa phù hợp.", "BodySmall"),
                P("Trải bài khuyên Querent cần biến năng lực thành một tín hiệu dễ nhìn thấy: portfolio, landing page, CV mới và cách giao tiếp chuyên nghiệp hơn.", "BodySmall"),
            ],
        )
    )
    story.append(Spacer(1, 8 * mm))
    story.append(
        card(
            [
                P("Trục chuyển hóa", "Kicker"),
                P("Từ bị động chờ việc sang chủ động tạo giá trị", "H1"),
                P("Nếu tiếp tục chỉ nộp CV trong tâm thế thiếu rõ ràng, Querent sẽ dễ thu hút những môi trường không phù hợp. Khi biết mình mạnh ở đâu, muốn gì và giải quyết vấn đề gì cho người khác, việc đi tìm việc sẽ chuyển thành quá trình để đúng cơ hội tìm thấy mình.", "Body"),
            ],
            fill=colors.Color(201 / 255, 168 / 255, 76 / 255, 0.12),
        )
    )
    story.append(PageBreak())

    story.append(SectionBand("03", "Ảnh Trải Bài Cá Nhân", "Bản đồ 10 lá từ abc.jpg"))
    story.append(Spacer(1, 7 * mm))
    story.append(ReadingPhoto(reading_image))
    story.append(Spacer(1, 5 * mm))
    story.append(P("Ảnh được giữ đúng tỉ lệ, dùng như lớp bản đồ thị giác để đối chiếu với các tầng phân tích ở những trang sau.", "Muted"))
    story.append(PageBreak())

    story.append(SectionBand("04", "Lộ Trình Phân Tích Trải Bài", "Từ bế tắc đến thức tỉnh"))
    story.append(Spacer(1, 7 * mm))
    story.append(
        flow_steps(
            [
                ("The Sleep", "Hiện trạng", "Công việc không có đột phá, làm vì tiền trước mắt nhiều hơn vì một hướng đi dài hạn. Năng lượng bị ru ngủ nên động lực dễ tụt."),
                ("The Float", "Trôi nổi", "Cuộc đời giống khinh khí cầu theo gió: phản ứng với hoàn cảnh nhiều hơn tự chọn hướng đi. Đây là dấu hiệu của sự thiếu góc nhìn tổng quan."),
                ("The Move", "Gốc rễ", "Querent đang ôm đồm quá nhiều mong muốn, suy nghĩ và nỗi lo. Khi mọi thứ chồng chéo, năng lượng bị nghẽn và dễ hút về trải nghiệm không như ý."),
                ("The Mirror", "Điểm nghẽn", "Cần soi lại chính mình, kể cả những điểm yếu thường bị né tránh. Đây là cánh cửa của tỉnh thức, vì năng lượng bên trong không thông thì hành động bên ngoài khó trọn vẹn."),
                ("The Arrow", "Hành động", "Muốn có việc vẫn phải hành động đều: gửi CV, mở rộng kết nối, thử cơ hội. Nhưng mỗi mũi tên cần có mục tiêu, không bắn trong trạng thái hoang mang."),
                ("The Flower", "Thực tế", "Đừng kỳ vọng môi trường hoàn hảo ngay từ đầu. Hãy tạo giá trị vững chắc trước, rồi dùng chính giá trị đó để thay đổi vị trí và môi trường quanh mình."),
            ]
        )
    )
    story.append(PageBreak())

    story.append(SectionBand("05", "Thử Thách, Kết Quả Và Lời Khuyên", "The Windy · The Fight · The Illusion · The Light"))
    story.append(Spacer(1, 7 * mm))
    story.append(
        insight_table(
            [
                ("The Windy", "Thị trường lao động thay đổi rất nhanh. Querent cần cập nhật kiến thức, làm mới CV, cải thiện giao tiếp và thái độ tương tác để không tự đánh rơi cơ hội."),
                ("The Fight", "Nếu cứ cố đấm ăn xôi trong chặng đường cũ, kết quả dễ là mâu thuẫn nội tâm: muốn khác đi nhưng vẫn hành động theo cách cũ."),
                ("The Illusion", "Ảo ảnh xuất hiện khi kỳ vọng và thực tế không ăn khớp. Đây là lời nhắc cần kiểm chứng mong muốn bằng dữ liệu, năng lực thật và môi trường thật."),
                ("The Light", "Lời khuyên tối thượng là trở thành nguồn sáng của chính mình: tự tin, rõ giá trị cốt lõi và để năng lực được nhìn thấy. Cơ hội tốt đến khi bản thân đủ rõ ràng."),
            ]
        )
    )
    story.append(Spacer(1, 9 * mm))
    story.append(
        card(
            [
                P("Thông điệp trung tâm", "Kicker"),
                P("Bạn không thể xin vũ trụ một cơ hội thật sáng nếu chính mình còn chưa biết ánh sáng của mình nằm ở đâu.", "Quote"),
            ],
            fill=colors.Color(201 / 255, 168 / 255, 76 / 255, 0.15),
        )
    )
    story.append(PageBreak())

    story.append(SectionBand("06", "Kế Hoạch Hành Động", "Hai chiến lược thực tiễn cho sự nghiệp"))
    story.append(Spacer(1, 7 * mm))
    story.append(
        two_column(
            [
                P("01 · Shadow Work", "H2"),
                P("Đừng dùng Nhân số học, MBTI, DISC hay các công cụ thấu hiểu bản thân chỉ để xem cho vui. Hãy dùng chúng để đào sâu: điểm mạnh nào cần phát huy, bài học nào còn lặp lại, nỗi sợ nào đang điều khiển lựa chọn nghề nghiệp.", "BodySmall"),
                P("Bài tập: viết ra 3 kiểu môi trường từng khiến mình cạn năng lượng và 3 điều kiện làm việc giúp mình bật sáng.", "BodySmall"),
            ],
            [
                P("02 · Thương Hiệu Cá Nhân", "H2"),
                P("Với ngành ngách hoặc công việc cần chứng minh trải nghiệm, ngồi chờ việc là tự làm mình mờ đi. Hãy chủ động tạo portfolio hoặc landing page để phô diễn năng lực, cách tư duy và kết quả cụ thể.", "BodySmall"),
                P("Bài tập: chọn 3 dự án/kinh nghiệm mạnh nhất, viết lại thành case study ngắn: vấn đề, cách làm, kết quả, điều học được.", "BodySmall"),
            ],
        )
    )
    story.append(Spacer(1, 8 * mm))
    story.append(
        flow_steps(
            [
                ("Tuần 1", "Soi lại", "Dọn CV, liệt kê điểm mạnh, điểm yếu và loại môi trường không còn phù hợp."),
                ("Tuần 2", "Làm rõ", "Viết lại định vị cá nhân: mình giải quyết vấn đề gì, cho ai, bằng năng lực nào."),
                ("Tuần 3", "Hiển thị", "Tạo portfolio/landing page hoặc ít nhất một hồ sơ trực tuyến có cấu trúc rõ ràng."),
                ("Tuần 4", "Hành động", "Gửi CV có chọn lọc, kết nối chủ động và quan sát phản hồi để chỉnh tiếp."),
            ]
        )
    )
    story.append(PageBreak())

    story.append(SectionBand("07", "Thông Điệp Chốt Lại", "Dành cho hành trình sau trải bài"))
    story.append(Spacer(1, 9 * mm))
    story.append(
        card(
            [
                P("Trải bài này không phủ nhận sự mệt mỏi của chặng đường cũ. Nó chỉ chỉ ra rằng mệt mỏi ấy đang mời Querent bước sang một cách vận hành trưởng thành hơn: ít bị cuốn theo hoàn cảnh, nhiều tự soi chiếu hơn; ít chờ người khác công nhận, nhiều chủ động làm rõ giá trị của mình hơn.", "Body"),
                P("Khi bên trong được gọi tên và bên ngoài được sắp xếp lại, việc tìm kiếm công việc sẽ không còn là một chuỗi rải CV trong vô định. Nó trở thành hành trình chọn đúng cánh cửa cho phiên bản đã tỉnh thức hơn của chính mình.", "Body"),
            ],
            fill=colors.Color(107 / 255, 63 / 255, 160 / 255, 0.18),
        )
    )
    story.append(Spacer(1, 12 * mm))
    story.append(card([P("“Sự rõ ràng là lá bài đầu tiên mở đường cho mọi cơ hội.”", "Quote")], fill=colors.Color(201 / 255, 168 / 255, 76 / 255, 0.16)))
    story.append(Spacer(1, 12 * mm))
    story.append(
        insight_table(
            [
                ("Nguồn nội dung", "abc.pdf và abc.jpg trong thư mục Pdf files/input"),
                ("Phong cách thiết kế", "Clow Cat Patronus: nền sao tím đen, glass card, vàng ánh sáng, logo thương hiệu."),
                ("Ghi chú", "Bản PDF này giữ thứ tự ý chính của tài liệu gốc và biên tập lại để phù hợp định dạng tư vấn trực quan."),
            ]
        )
    )

    doc.build(story, onFirstPage=draw_cover, onLaterPages=draw_background)
    print(OUTPUT)


if __name__ == "__main__":
    build()
