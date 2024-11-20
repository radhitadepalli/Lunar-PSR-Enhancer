import sys
import os
from PIL import Image, ImageFilter

def process_image(image_path):
    img = Image.open(image_path)

    # Apply some simple processing (e.g., blur the image)
    img = img.filter(ImageFilter.BLUR)

    # Save the processed image to the output directory
    output_dir = 'output'
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    output_path = os.path.join(output_dir, f'processed-{os.path.basename(image_path)}')
    img.save(output_path)

    return output_path

if __name__ == "__main__":
    input_image = sys.argv[1]
    processed_image = process_image(input_image)
    print(processed_image)  # Return processed image path
