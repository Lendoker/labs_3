"""Концептуальна ER-діаграма бібліотеки."""
import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(__file__), "conceptual_model.png")
FONT = r"C:\Windows\Fonts\segoeui.ttf"
FONTB = r"C:\Windows\Fonts\segoeuib.ttf"


def font(size, bold=False):
    return ImageFont.truetype(FONTB if bold else FONT, size)


def entity(draw, box, title, attrs):
    x, y, w, h = box
    draw.rounded_rectangle((x, y, x + w, y + h), radius=8, fill="white", outline="#1c2420", width=2)
    draw.rectangle((x, y, x + w, y + 36), fill="#1f6b4a")
    draw.text((x + 12, y + 8), title, fill="white", font=font(16, True))
    yy = y + 46
    for attr in attrs:
        draw.text((x + 12, yy), attr, fill="#1c2420", font=font(13))
        yy += 18


def main():
    img = Image.new("RGB", (1400, 980), "#f4f7f5")
    draw = ImageDraw.Draw(img)
    draw.text((40, 16), "Концептуальна модель бібліотеки", fill="#1f6b4a", font=font(24, True))
    boxes = {
        "authors": (40, 70, 300, 190),
        "publishers": (550, 70, 300, 170),
        "genres": (1060, 70, 300, 130),
        "books": (500, 340, 400, 250),
        "readers": (40, 700, 320, 210),
        "loans": (500, 700, 340, 210),
        "reservations": (980, 700, 380, 210),
    }
    entity(draw, boxes["authors"], "Автор", ["PK author_id", "first_name", "last_name", "birth_year", "country"])
    entity(draw, boxes["publishers"], "Видавництво", ["PK publisher_id", "name", "city", "country"])
    entity(draw, boxes["genres"], "Жанр", ["PK genre_id", "name"])
    entity(draw, boxes["books"], "Книга", [
        "PK book_id", "isbn (UNIQUE)", "title", "FK author_id", "FK publisher_id",
        "FK genre_id", "publication_year", "pages", "total_copies", "available_copies",
    ])
    entity(draw, boxes["readers"], "Читач", [
        "PK reader_id", "first_name", "last_name", "email (UNIQUE)",
        "phone", "library_card_number", "status",
    ])
    entity(draw, boxes["loans"], "Видача", [
        "PK loan_id", "FK book_id", "FK reader_id", "loan_date", "due_date", "return_date",
    ])
    entity(draw, boxes["reservations"], "Бронювання", [
        "PK reservation_id", "FK book_id", "FK reader_id",
        "reservation_date", "expiration_date", "status",
    ])

    def center_bottom(box):
        x, y, w, h = box
        return (x + w / 2, y + h)

    def center_top(box):
        x, y, w, h = box
        return (x + w / 2, y)

    def link(a, b, label):
        draw.line((a, b), fill="#1f6b4a", width=2)
        mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        draw.text((mx + 6, my - 18), label, fill="#1c2420", font=font(14, True))

    link(center_bottom(boxes["authors"]), center_top(boxes["books"]), "1 : N")
    link(center_bottom(boxes["publishers"]), (700, boxes["books"][1]), "1 : N")
    link(center_bottom(boxes["genres"]), (900, boxes["books"][1]), "1 : N")
    link((200, boxes["readers"][1]), (500, 780), "1 : N")
    link(center_bottom(boxes["books"]), center_top(boxes["loans"]), "1 : N")
    link((360, 800), (980, 800), "1 : N")
    link((900, boxes["books"][1] + boxes["books"][3]), (1100, boxes["reservations"][1]), "1 : N")

    draw.text((40, 940), "Луцьк, 2026. Пінкевич Артем Романович, ІПЗ-32. Зв'язок багато-до-багатьох між книгою і читачем розкладено на видачу та бронювання.", fill="#333", font=font(13))
    img.save(OUT)
    print(OUT)


if __name__ == "__main__":
    main()
