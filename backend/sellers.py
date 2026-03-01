from flask import Blueprint, jsonify
from models import User, user_schema, users_schema

sellers_bp = Blueprint('sellers', __name__)

@sellers_bp.route('/api/sellers', methods=['GET'])
def get_sellers():
    try:
        users = User.query.all()
        return jsonify(users_schema.dump(users))
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@sellers_bp.route('/api/sellers/<int:owner>', methods=['GET'])
def get_seller(owner):
    try:
        seller = User.query.filter_by(id=owner).first()
        return user_schema.jsonify(seller)
    except Exception as e:
        return jsonify({'error': str(e)}), 500