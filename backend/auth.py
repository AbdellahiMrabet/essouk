import datetime
from functools import wraps
from flask import Blueprint, jsonify, request
import jwt
import uuid              
from urllib.parse import quote
from models import User, UserSchema, Usertype, UsertypeSchema, ResetCode
from db import app, db

auth_bp = Blueprint('auth', __name__)

# Token required decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        # Check if Authorization header is present
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                # Extract token from "Bearer <token>"
                token = auth_header.split(' ')[1]
            except IndexError:
                return jsonify({'message': 'Invalid token format'}), 401

        if not token:
            return jsonify({'message': 'مطلوب الإذن!'}), 401

        try:
            data = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=["HS256"])
            current_user = User.query.filter_by(public_id=data['public_id']).first()
            if not current_user:
                return jsonify({'message': 'Invalid token'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'انتهت صلاحية معلومات الدخول !'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'معلومات الدخول غير صحيحة !'}), 401

        return f(current_user, *args, **kwargs)

    return decorated
def admin_required(f):
    @wraps(f)
    def decorated(current_user, *args, **kwargs):
        # Check if user is admin
        if not current_user.is_admin():
            return jsonify({
                'error': 'Admin access required',
                'message': 'This action requires administrator privileges'
            }), 403
        
        return f(current_user, *args, **kwargs)
    
    return decorated

@auth_bp.route('/api/addgroup', methods=['POST'])
@admin_required
def addgroup():

    name = request.json['name']

    existing_group = Usertype.query.filter_by(name=name).first()
    if existing_group:
        return jsonify({"message": "Group already exists"}), 400

    usergroup = Usertype(name)
    group_schema = UsertypeSchema()
    try:
        usergroup.save()
        return group_schema.jsonify(usergroup)

    except Exception as e:
        return jsonify({"message": "Group Registration failed", "error": str(e)}), 500

@auth_bp.route('/api/register', methods=['POST'])
def register():

    username = request.json['username']
    password = request.json['password']
    email = request.json['email']
    phone = request.json['phone']
    whats = request.json['whats']
    type = request.json['type']

    existing_user = User.query.filter_by(username=username).first()
    if existing_user:
        return jsonify({"message": "المستخدم موجود مسبقا"}), 400
    
    if email == '':
        email = phone

    user = User(str(uuid.uuid4()), username, password, email, phone, whats, type)
    user.set_password(password)
    try:
        user.save()
        return UserSchema().jsonify(user)

    except Exception as e:
        print(e)
        return jsonify({"message": "فشل في إنشاء الحساب ", "error": str(e)}), 500
    
@auth_bp.route('/api/updateuser/<id>/', methods=['PUT'])
@token_required
def update_user(current_user, id):
    if not current_user.is_admin():
        return jsonify("error", "غير مصرح لك بتحديث المستخدمين"), 403
    user = User.query.get(id)

    username = request.json['username']
    password = request.json['password']
    type = request.json['type']
    
    user.username = username
    user.password = password
    user.usertype_id = type
    
    user.save()
    return UserSchema().jsonify(user)

@auth_bp.route('/api/forgot-password', methods=['POST'])
def forgot_password():  
    email = request.json['email']

    user = User.query.filter_by(email=email).first()
    if not user:
        # For security, don't reveal if email exists
        return jsonify({"message": "هذا الايميل غير موجود"}), 400
    
    secret_key = app.config['JWT_SECRET_KEY']
    payload = {
        'public_id': user.public_id,
        'email': email,
        'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=15)
    }
    
    token = jwt.encode(payload, secret_key, algorithm='HS256')
    
    return jsonify({
        "message": "سوف يصلك رمز إعادة التعيين",
        "reset_token": token
    }), 200


@auth_bp.route('/api/save-reset-code', methods=['POST'])

def save_reset_code():
    email = request.json['email']
    code = request.json['code']
    
    # Delete any existing reset codes for this email
    ResetCode.query.filter_by(email=email).delete()
    db.session.commit()
    
    # Create and save new reset code
    reset_code_entry = ResetCode(email=email, code=code)
    reset_code_entry.save()
    
    return jsonify({
        "message": "code saved successfully",
    }), 200

@auth_bp.route('/api/activate-user', methods=['POST'])
@admin_required
def activate_user():
    email = request.json['email']
    code = request.json['code']
    
    # Delete any existing reset codes for this email
    ResetCode.query.filter_by(email=email).delete()
    db.session.commit()
    
    # Create and save new reset code
    reset_code_entry = ResetCode(email=email, code=code)
    reset_code_entry.save()
    
    return jsonify({
        "message": "code saved successfully",
    }), 200


@auth_bp.route('/api/reset-password', methods=['PUT'])
@token_required
def reset_password(current_user):
    email = request.json['email']
    code = request.json['code']
    new_password = request.json['new_password']
    # Find the reset code in database
    reset_code = ResetCode.query.filter_by(email=current_user.email, code=code).first()
        
    if not reset_code:
            return jsonify({"message": "الرمز غير صحيح"}), 400
            
    if not reset_code.is_valid():
            return jsonify({"message": "انتهت صلاحية الرمز أو تم استخدامه سابقا"}), 400
    # Reset the password
    current_user.set_password(new_password)
    current_user.save()
    
    # Mark reset code as used
    reset_code.mark_used()
    
    return jsonify({"message": "تمت إعادت تعيين كلمة المرور بنجاح"}), 200

@auth_bp.route('/api/deleteuser/<id>/', methods=['DELETE'])
@token_required
def delete_user(current_user, id):
    if not current_user.is_admin():
        return jsonify("error", "غير مصرح لك بحذف المستخدمين"), 403
    user = User.query.get(id)
    user.delete()
    return jsonify({user.username, "deleted susccefully"})
    
@auth_bp.route('/api/login', methods=['POST'])
def login():

    username = request.json['username']
    password = request.json['password']

    user = User.query.filter_by(username=username).first()
    if user and user.verify_password(password):
        # Define the secret key
        secret_key = app.config['JWT_SECRET_KEY']
        # Define the payload with an expiration time
        payload = {
        'public_id': user.public_id,
        'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=15) #
        }
        # Create the tokens we will be sending back to the user
        token = jwt.encode(payload, secret_key, algorithm='HS256')
       
        # in this response
        response = jsonify({"message": "مرحبا بكم!",
                            "access_token":token,
                            "usertype": user.usertype_id})
        return response
    else:
        return jsonify({"message": "خطأ في الاسم أو كلمة المرور"}), 401 
    
@auth_bp.route("/api/logout", methods=["POST"])
def logout():
    return jsonify({"msg": "تم تسجيل الخروج بنجاح"}), 200
    
@auth_bp.route('/api/getUsers', methods=['GET'])
def get_users():
    users_schema = UserSchema(many=True)
    all_users = User.query.all()
    result = users_schema.dump(all_users)
    return jsonify(result)