from db import db, ma
import datetime
from werkzeug.security import generate_password_hash, check_password_hash

class Usertype(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50))
    # One-to-many relationship with User
    users = db.relationship('User', backref='usertype', lazy=True, cascade='all, delete-orphan')

    def __init__(self, name):
        self.name = name
    
    def save(self):
        db.session.add(self)
        db.session.commit() 
        
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    public_id = db.Column(db.String(50), unique=True)
    username = db.Column(db.String(50), unique=True)
    password = db.Column(db.String(500))
    email = db.Column(db.String(50), unique=True)
    phone = db.Column(db.String(25))
    whats = db.Column(db.String(25))
    profileImage = db.Column(db.Text)
    expo_push_token = db.Column(db.String(255), nullable=True)
    usertype_id = db.Column(db.Integer, db.ForeignKey("usertype.id"), nullable=False)
    products = db.relationship('Product', backref='user', lazy=True, cascade='all, delete-orphan')

    def __init__(self, public_id, username, password, email, phone, whats, usertype_id):
        self.public_id = public_id
        self.username = username
        self.password = password
        self.email = email
        self.phone = phone
        self.whats = whats
        self.usertype_id = usertype_id
        
    def set_password(self, password):
        self.password = generate_password_hash(password)
        
    def verify_password(self, password):
        return check_password_hash(self.password, password)
    
    def is_admin(self):
        return self.usertype_id == 1  # Assuming 1 is the ID for admin usertype
    
    #save method can be added here
    def save(self):
        db.session.add(self)
        db.session.commit() 
        
    def delete(self):
        db.session.delete(self)
        db.session.commit() 
    
class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    price = db.Column(db.Float, nullable=False)
    description = db.Column(db.Text)
    category = db.Column(db.String(50))
    image_url = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.now, onupdate=datetime.datetime.now)
    verified = db.Column(db.SmallInteger, nullable=False, default=0)
    owner_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)

    def __init__(self, name, price, description, category, owner_id, image_url=None):
        self.name = name
        self.price = price
        self.description = description
        self.category = category
        self.image_url = image_url
        self.owner_id = owner_id
        
# Reset Code model for password reset functionality
class ResetCode(db.Model):
    __tablename__ = 'reset_code'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(50), nullable=False, index=True)
    code = db.Column(db.String(6), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.now)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False)

    def __init__(self, email, code, expires_in_minutes=15):
        self.email = email
        self.code = code
        self.expires_at = datetime.datetime.now() + datetime.timedelta(minutes=expires_in_minutes)

    def is_valid(self):
        return not self.used and datetime.datetime.now() < self.expires_at

    def mark_used(self):
        self.used = True
        db.session.commit()

    def save(self):
        db.session.add(self)
        db.session.commit()

    def delete(self):
        db.session.delete(self)
        db.session.commit()
        
# Alternative approach with explicit field definition
class ProductSchema(ma.SQLAlchemySchema):
    class Meta:
        model = Product
        load_instance = True
        
    id = ma.auto_field()
    name = ma.auto_field()
    price = ma.auto_field()
    description = ma.auto_field()
    category = ma.auto_field()
    image_url = ma.auto_field()
    created_at = ma.auto_field()
    updated_at = ma.auto_field()
    verified = ma.auto_field()
    owner_id = ma.auto_field()

class UserSchema(ma.SQLAlchemySchema):
    class Meta:
        model = User
        load_instance = True
        
    id = ma.auto_field()
    public_id = ma.auto_field()
    username = ma.auto_field()
    email = ma.auto_field()
    phone = ma.auto_field()
    whats = ma.auto_field()
    profileImage = ma.auto_field()
    expo_push_token = ma.auto_field()
    usertype_id = ma.auto_field()
    products = ma.Nested(ProductSchema, many=True, exclude=('owner_id',))

class UsertypeSchema(ma.SQLAlchemySchema):
    class Meta:
        model = Usertype
        load_instance = True
        
    id = ma.auto_field()
    name = ma.auto_field()
    users = ma.Nested(UserSchema, many=True, exclude=('usertype_id',))
    
class ResetCodeSchema(ma.SQLAlchemySchema):
    class Meta:
        model = ResetCode
        load_instance = True
        
    id = ma.auto_field()
    email = ma.auto_field()
    code = ma.auto_field()
    created_at = ma.auto_field()
    expires_at = ma.auto_field()
    used = ma.auto_field()

product_schema = ProductSchema()
products_schema = ProductSchema(many=True)
user_schema = UserSchema()
users_schema = UserSchema(many=True)