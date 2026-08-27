import os
from PIL import Image, ImageDraw, ImageFont

img_path = 'elance-app.ui/public/assets/templates/traite_template_bg.png'
out_path = 'c:/Users/amine/.gemini/antigravity-ide/brain/40a01fb5-ba94-4e2f-9ebb-52ee26ba1d78/scratch/current_boxes.png'

os.makedirs(os.path.dirname(out_path), exist_ok=True)

img = Image.open(img_path).convert('RGB')
draw = ImageDraw.Draw(img)

# Current INITIAL_TRAITE_PIXEL_MAP coordinates
boxes = {
  'echeanceCorps': (225, 75, 148, 22),
  'echeanceTalon': (268, 272, 120, 25),
  'montantCorps': (613, 118, 180, 24),
  'montantSecond': (615, 188, 179, 23),
  'lieuCreationCorps': (397, 57, 123, 20),
  'dateCreationCorps': (399, 80, 122, 22),
  'ribTireCorps': (225, 119, 344, 25),
  'ordrePaiement': (233, 202, 350, 24),
  'montantLettres': (22, 231, 768, 26),
  'valeurEn': (410, 309, 81, 17),
  'nomAdresseTire': (355, 349, 175, 83),
  'domiciliation': (545, 324, 252, 49),
  'ribTireTalon': (13, 323, 324, 21),
  'lieuCreationTalon': (13, 275, 121, 25),
  'dateCreationTalon': (144, 273, 114, 26),
  'aval': (183, 379, 157, 60),
}

for name, (x, y, w, h) in boxes.items():
    draw.rectangle([x, y, x + w, y + h], outline='red', width=2)
    draw.text((x + 2, y + 2), name, fill='blue')

img.save(out_path)
print("Saved visualization to", out_path)
