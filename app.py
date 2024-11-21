from flask import Flask, request, send_file
import cv2
import numpy as np
from skimage import exposure
import io
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Set maximum content length to handle large file uploads
app.config['MAX_CONTENT_LENGTH'] = 1024 * 1024 * 1024  # 1 GB limit

def load_image(image_bytes):
    image = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_GRAYSCALE)
    if image is None:
        raise ValueError("Image could not be loaded.")
    return image

def contrast_stretching(image):
    p2, p98 = np.percentile(image, (2, 98))
    return exposure.rescale_intensity(image, in_range=(p2, p98))

def gamma_correction(image, gamma=1.5):
    invGamma = 1.0 / gamma
    table = np.array([(i / 255.0) ** invGamma * 255 for i in range(256)]).astype("uint8")
    return cv2.LUT(image, table)

def multi_scale_retinex(image, scales=[15, 80, 250]):
    image_float = np.float64(image) + 1.0
    retinex = np.zeros_like(image_float)
    for scale in scales:
        blurred = cv2.GaussianBlur(image_float, (0, 0), sigmaX=scale, sigmaY=scale)
        retinex += np.log10(image_float) - np.log10(blurred + 1.0)
    retinex = retinex / len(scales)
    retinex = (retinex - np.min(retinex)) / (np.max(retinex) - np.min(retinex)) * 255
    return np.uint8(retinex)

def adaptive_histogram_equalization(image):
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    return clahe.apply(image)

@app.route('/process-image', methods=['POST'])
def process_image():
    if not request.data:
        print("No file uploaded.")  # Debugging statement
        return 'No file uploaded.', 400

    try:
        print(f"Received {len(request.data)} bytes of data")  # Debugging

        image = load_image(request.data)
        print("Image loaded successfully")  # Debugging

        contrast_image = contrast_stretching(image)
        print("Contrast stretching applied")  # Debugging

        gamma_corrected_image = gamma_correction(contrast_image, gamma=1.8)
        print("Gamma correction applied")  # Debugging

        msr_image = multi_scale_retinex(gamma_corrected_image)
        print("Multi-scale retinex applied")  # Debugging

        equalized_image = adaptive_histogram_equalization(msr_image)
        print("Adaptive histogram equalization applied")  # Debugging

        img_byte_arr = io.BytesIO()
        success, encoded_image = cv2.imencode('.png', equalized_image)
        if not success:
            raise ValueError("Failed to encode image.")
        img_byte_arr.write(encoded_image)
        img_byte_arr.seek(0)

        print("Image processing completed successfully")  # Debugging
        return send_file(img_byte_arr, mimetype='image/png')
    except Exception as e:
        print(f"Error processing image: {e}")
        return f'Error processing image: {e}', 500

if __name__ == '__main__':
    from waitress import serve
    serve(app, host='0.0.0.0', port=5000)