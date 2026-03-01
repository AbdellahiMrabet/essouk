from db import app
from auth import auth_bp
from images import img_bp
from products import products_bp
from sellers import sellers_bp
from notifications import notifications_bp
from terms import terms_bp
from gevent.pywsgi import WSGIServer

# app.app_context().push()
# db.create_all()

#handle login from auth blueprint
app.register_blueprint(auth_bp)
#handle upload image from image blueprint
app.register_blueprint(img_bp)
#menage products from product blueprint
app.register_blueprint(products_bp)
#menage sellers from sellers blueprint
app.register_blueprint(sellers_bp)
app.register_blueprint(notifications_bp)
app.register_blueprint(terms_bp)

if __name__ == '__main__':
    http_server = WSGIServer(('localhost', 4500), app)
    http_server.serve_forever()