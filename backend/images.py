from flask import Blueprint, request

from dotenv import load_dotenv
load_dotenv()

# Import the Cloudinary libraries
# ==============================
import cloudinary
from cloudinary import CloudinaryImage
import cloudinary.uploader
import cloudinary.api

img_bp = Blueprint('images', __name__)

import json

# Set configuration parameter: return "https" URLs by setting secure=True  
# ==============================
config = cloudinary.config(secure=True)

@img_bp.route('/api/upload', methods=['POST'])
def upload_file():
    data = request.form
    file = request.files['file']
    token = data.get('owner')
    try:
        print(file.name)
    except Exception as e:
        print(f"Error: {e}")
    result = cloudinary.uploader.upload(file)
    return result["secure_url"]
