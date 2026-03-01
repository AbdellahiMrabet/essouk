from datetime import datetime
from flask import Blueprint, jsonify, request, flash, redirect, url_for
from models import User, Product, product_schema, products_schema, ResetCode
from db import db
import cloudinary
import cloudinary.uploader
from sqlalchemy import text
from auth import token_required

config = cloudinary.config(secure=True)

products_bp = Blueprint('products', __name__)

@products_bp.route('/api/products', methods=['GET'])
def get_products():
    try:
        products = Product.query.all()
        return jsonify(products_schema.dump(products))
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@products_bp.route('/api/products/<int:id>', methods=['GET'])
def get_product(id):
    try:
        product = Product.query.get_or_404(id)
        return product_schema.jsonify(product)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@products_bp.route('/api/products', methods=['POST'])
@token_required
def create_product(current_user):
    data = request.form
    try:
        file = request.files['file']
    except Exception as e:
        print(e)
    file_path = None
    
    if not current_user.is_admin():
        print("Not admin user", current_user.email)
        # Find the reset code in database
        reset_code = ResetCode.query.filter_by(email=current_user.id).first()
            
        if not reset_code or not reset_code.is_valid():
            return jsonify({"user_inactive": "قم بتفعيل إحدى الخدمات لتممكن من إضافة منتجات أو خدمات"}), 400
    try:
        product_id = 0
        last_product = db.session.execute(text("SELECT MAX(id) FROM product")).mappings().first()
        if last_product["MAX(id)"]:
            product_id = last_product["MAX(id)"] + 1
        else:
            product_id = 1
            db.session.execute(text("ALTER TABLE product AUTO_INCREMENT = 1"))
        result = cloudinary.uploader.upload(
            file,
            public_id = current_user.public_id+'_'+str(product_id))
        file_path = result["secure_url"]
    except Exception as e:
        print(f"Error: {e}")
    try:
        
        # Validate required fields
        if not data.get('name') or not data.get('price'):
            return jsonify({'error': 'اسم المنتج / الخدمة والسعر ضروريان'}), 400
        
        product = Product(
            name=data['name'],
            price=float(data['price']),
            description=data.get('description', ''),
            category=data.get('category', 'General'),
            image_url=file_path, # Store the image URI
            owner_id=current_user.id
        )
        
        db.session.add(product)
        db.session.commit()
        
        return product_schema.jsonify(product), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@products_bp.route('/api/products/<int:id>', methods=['PUT'])
@token_required
def update_product(current_user, id):
    print("Update product :", id)
    data = request.get_json()  
    product = Product.query.get_or_404(id)
    owner = User.query.filter_by(id=product.owner_id).first()
    if not (owner) or not (owner.public_id == current_user.public_id):
            return jsonify({"not_authorized": "وحدهم مالكو المنتجات يستطيعون تعديلها أو حذفها"}), 400
    try:
        
        if 'name' in data:
            product.name = data['name']
        if 'price' in data:
            product.price = float(data['price'])
        if 'description' in data:
            product.description = data['description']
        if 'category' in data:
            product.category = data['category']
        if 'image_url' in data:
            product.image_url = data['image_url']
        
        product.updated_at = datetime.now()
        db.session.commit()
        
        return product_schema.jsonify(product)
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@products_bp.route('/api/products/<int:id>', methods=['DELETE'])
@token_required
def delete_product(current_user, id): 
    product = Product.query.get_or_404(id)
    owner = User.query.filter_by(id=product.owner_id).first()
    if not (owner) or not (owner.public_id == current_user.public_id):
            return jsonify({"error": "وحدهم مالكو المنتجات يستطيعون تعديلها أو حذفها"}), 400
    try:
        product = Product.query.get_or_404(id)
        owner = User.query.get_or_404(product.owner_id)
        cloudinary.uploader.destroy(owner.public_id+'_'+str(product.id))
    except Exception as e:
        print(f"Error: {e}")
    try:
        product = Product.query.get_or_404(id)
        db.session.delete(product)
        db.session.commit()
        
        return jsonify({'message': 'Product deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500