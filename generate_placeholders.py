import os
from PIL import Image, ImageDraw, ImageFont

# Directory to save images
output_dir = "frontend/public/asl-words"
os.makedirs(output_dir, exist_ok=True)

# List of words to generate
words = [
    "hello", "thank-you", "please", "sorry", 
    "yes", "no", "love", "help", 
    "good", "morning", "night", "friend", 
    "name", "you", "me", "generic"
]

# Settings
width, height = 512, 512
bg_color = (255, 255, 255)
text_color = (0, 0, 0)

for word in words:
    # Create image
    img = Image.new('RGB', (width, height), color=bg_color)
    d = ImageDraw.Draw(img)
    
    # Text content (replace hyphens for display)
    display_text = word.replace("-", " ").title()
    if word == "generic":
        display_text = "ASL Word"
        
    # Draw text in center (approximated centering without font metrics)
    # Using default font since we might not have a ttf path
    # To make it bigger/centered better, we'd need a font file, but default is fine for a placeholder
    
    # Attempt to load a better font if possible, else default
    try:
        # Common macOS font location
        font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 40)
    except IOError:
        font = ImageFont.load_default()

    # Calculate text position (basic centering)
    # getbbox returns (left, top, right, bottom)
    bbox = d.textbbox((0, 0), display_text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    
    x = (width - text_w) / 2
    y = (height - text_h) / 2
    
    d.text((x, y), display_text, fill=text_color, font=font)
    
    # Save
    filename = f"{word}.png"
    filepath = os.path.join(output_dir, filename)
    img.save(filepath)
    print(f"Generated {filepath}")

print("All placeholders generated.")
