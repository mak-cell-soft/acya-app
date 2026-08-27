import os
from PIL import Image, ImageDraw

img_path = 'elance-app.ui/public/assets/templates/traite_template_bg.png'
out_path = 'c:/Users/amine/.gemini/antigravity-ide/brain/40a01fb5-ba94-4e2f-9ebb-52ee26ba1d78/scratch/final_boxes.png'

os.makedirs(os.path.dirname(out_path), exist_ok=True)

img = Image.open(img_path).convert('RGB')
draw = ImageDraw.Draw(img)

# Final calibrated INITIAL_TRAITE_PIXEL_MAP coordinates
final_boxes = {
  'echeanceCorps': (235, 75, 205, 24),
  'lieuCreationCorps': (475, 48, 80, 20),
  'dateCreationCorps': (485, 75, 85, 20),
  'ribTireCorps': (225, 142, 340, 28),
  'ordrePaiement': (355, 195, 340, 24),
  'montantCorps': (630, 122, 165, 24),
  'montantSecond': (630, 192, 165, 23),
  'montantLettres': (140, 236, 580, 24),
  'lieuCreationTalon': (15, 278, 140, 22),
  'dateCreationTalon': (175, 278, 135, 22),
  'echeanceTalon': (325, 278, 135, 22),
  'ribTireTalon': (13, 332, 325, 22),
  'valeurEn': (430, 308, 95, 18),
  'nomAdresseTire': (360, 358, 165, 75),
  'domiciliation': (550, 332, 240, 95),
  'aval': (180, 388, 155, 50),
}

for name, (x, y, w, h) in final_boxes.items():
    draw.rectangle([x, y, x + w, y + h], outline='lime', width=2)
    draw.text((x + 2, y + 2), name, fill='cyan')

img.save(out_path)
print("Saved final visualization to", out_path)
