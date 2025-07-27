# create_placeholders.py

from PIL import Image
import os

# --- Configuration ---
OUTPUT_DIR = 'src/assets/cards'
CARD_WIDTH = 80  # Largeur de l'image vierge
CARD_HEIGHT = 120 # Hauteur de l'image vierge

SUITS = ['Pique', 'Coeur', 'Trefle', 'Carreau']
RANKS_TO_GENERATE = ['Valet', 'Dame', 'Roi']

# --- Début du script ---
def create_placeholder_files():
    # Crée le dossier de destination s'il n'existe pas
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
        print(f"Dossier '{OUTPUT_DIR}' créé.")

    # On parcourt les cartes à générer
    for rank_name in RANKS_TO_GENERATE:
        for suit_name in SUITS:
            # On génère le nom du fichier de sortie
            output_filename = f"{rank_name}_{suit_name}.png"
            output_path = os.path.join(OUTPUT_DIR, output_filename)

            # On crée une nouvelle image transparente
            # Le tuple (255, 255, 255, 0) signifie blanc avec 0% d'opacité (totalement transparent)
            placeholder_image = Image.new('RGBA', (CARD_WIDTH, CARD_HEIGHT), (255, 255, 255, 0))

            # On sauvegarde le fichier vierge
            placeholder_image.save(output_path)
            print(f"-> Fichier vierge '{output_path}' créé.")

    print("\nSuccès ! Les 12 fichiers PNG vierges pour les figures ont été générés.")

if __name__ == "__main__":
    create_placeholder_files()