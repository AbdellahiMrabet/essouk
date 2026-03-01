# notifications.py
from flask import Blueprint, request, jsonify
from models import User, Product
from auth import token_required, admin_required
import datetime
import os
import requests
import json

notifications_bp = Blueprint('notifications', __name__)

# Expo Push Notification configuration
EXPO_API_URL = 'https://exp.host/--/api/v2/push/send'
EXPO_ACCESS_TOKEN = os.environ.get('EXPO_ACCESS_TOKEN')

class ExpoNotificationService:
    @staticmethod
    def send_push_notification(expo_push_tokens, title, message, data=None):
        """
        Send push notification to multiple Expo push tokens
        """
        if not expo_push_tokens:
            print("⚠️ No Expo push tokens available")
            return []

        # Filter valid tokens
        valid_tokens = []
        for token in expo_push_tokens:
            if token and isinstance(token, str) and token.startswith('ExponentPushToken'):
                valid_tokens.append(token)
            else:
                print(f"⚠️ Invalid token skipped: {token}")

        if not valid_tokens:
            print("⚠️ No valid Expo push tokens to send")
            return []

        # Prepare messages (max 100 per request)
        chunks = [valid_tokens[i:i + 100] for i in range(0, len(valid_tokens), 100)]
        all_results = []

        for chunk in chunks:
            messages = []
            for token in chunk:
                message_data = {
                    'to': token,
                    'title': title,
                    'body': message,
                    'sound': 'default',
                    'priority': 'high',
                    'channelId': 'default',
                }
                
                if data:
                    message_data['data'] = data
                    
                messages.append(message_data)

            try:
                headers = {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Accept-encoding': 'gzip, deflate',
                }
                
                # Add access token if available
                if EXPO_ACCESS_TOKEN:
                    headers['Authorization'] = f'Bearer {EXPO_ACCESS_TOKEN}'
                    print("🔑 Using Expo Access Token for enhanced limits")
                else:
                    print("⚠️ No Expo Access Token - using basic rate limits")

                response = requests.post(
                    EXPO_API_URL,
                    headers=headers,
                    data=json.dumps(messages),
                    timeout=30  # 30 second timeout
                )

                if response.status_code == 200:
                    result = response.json()
                    
                    # Process results
                    if 'data' in result:
                        for i, receipt in enumerate(result['data']):
                            if receipt.get('status') == 'error':
                                error_message = receipt.get('message', 'Unknown error')
                                print(f"❌ Failed to send to token: {error_message}")
                            elif receipt.get('status') == 'ok':
                                print(f"✅ Successfully sent to token {i}")
                        
                        all_results.extend(result['data'])
                    else:
                        print(f"❌ Unexpected response format: {result}")
                        
                else:
                    print(f"❌ Expo API error {response.status_code}: {response.text}")
                    # Create error results for this chunk
                    error_results = [{'status': 'error', 'message': f'HTTP {response.status_code}'} for _ in chunk]
                    all_results.extend(error_results)

            except requests.exceptions.Timeout:
                print("❌ Expo API request timed out")
                error_results = [{'status': 'error', 'message': 'Request timeout'} for _ in chunk]
                all_results.extend(error_results)
                
            except requests.exceptions.ConnectionError:
                print("❌ Expo API connection error")
                error_results = [{'status': 'error', 'message': 'Connection error'} for _ in chunk]
                all_results.extend(error_results)
                
            except Exception as e:
                print(f"❌ Unexpected error: {str(e)}")
                error_results = [{'status': 'error', 'message': str(e)} for _ in chunk]
                all_results.extend(error_results)

        return all_results

    @staticmethod
    def get_rate_limit_info():
        """
        Get information about current rate limits
        """
        if EXPO_ACCESS_TOKEN:
            return {
                'limit': 1000,
                'window': 'minute',
                'message': 'Enhanced limits with access token'
            }
        else:
            return {
                'limit': 100,
                'window': 'minute', 
                'message': 'Basic limits without access token'
            }

# Store for user push tokens (in production, use database)
user_push_tokens = {}

@notifications_bp.route('/api/notifications/rate-limits', methods=['GET'])
def get_rate_limits():
    """Get current rate limit information"""
    limits = ExpoNotificationService.get_rate_limit_info()
    return jsonify(limits), 200

@notifications_bp.route('/api/users/register-push-token', methods=['POST'])
@token_required
def register_push_token(current_user):
    """Register Expo push token for a user"""
    try:
        data = request.get_json()
        expo_push_token = data.get('expo_push_token')
        
        if not expo_push_token:
            return jsonify({'error': 'Expo push token is required'}), 400
        
        # Validate token format
        if not expo_push_token.startswith('ExponentPushToken'):
            return jsonify({'error': 'Invalid Expo push token format'}), 400
        
        # Store the token
        user_push_tokens[current_user.id] = expo_push_token
        
        print(f"✅ Registered push token for user {current_user.username}")
        
        return jsonify({
            'success': True,
            'message': 'Push token registered successfully',
            'rate_limits': ExpoNotificationService.get_rate_limit_info()
        }), 200
        
    except Exception as e:
        print(f"Error registering push token: {str(e)}")
        return jsonify({'error': 'Failed to register push token'}), 500

@notifications_bp.route('/api/admin/notifications/broadcast', methods=['POST'])
@token_required
@admin_required
def broadcast_notification(current_user):
    """Send notification to all users (Admin only)"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        title = data.get('title', '').strip()
        message = data.get('message', '').strip()
        notification_type = data.get('type', 'broadcast')
        data_payload = data.get('data', {})
        
        # Validate required fields
        if not title or not message:
            return jsonify({'error': 'Title and message are required'}), 400
        
        # Get all active users
        users = User.query.filter_by(is_active=True).all()
        user_count = len(users)
        
        # Get Expo push tokens
        expo_tokens = list(user_push_tokens.values())
        
        # Send push notifications via Expo
        sent_count = 0
        failed_count = 0
        results = []
        
        if expo_tokens:
            notification_data = {
                'type': notification_type,
                'navigateTo': 'Products',
                'sentBy': current_user.username,
                'timestamp': datetime.datetime.utcnow().isoformat(),
                **data_payload
            }
            
            results = ExpoNotificationService.send_push_notification(
                expo_tokens,
                title,
                message,
                notification_data
            )
            
            sent_count = len([r for r in results if r.get('status') == 'ok'])
            failed_count = len([r for r in results if r.get('status') == 'error'])
            
            print(f"📢 Broadcast results: {sent_count} sent, {failed_count} failed")
        else:
            print("⚠️ No Expo tokens available for broadcast")
        
        return jsonify({
            'success': True,
            'message': f'Notification processed for {user_count} users',
            'push_notifications': {
                'sent': sent_count,
                'failed': failed_count,
                'total_tokens': len(expo_tokens),
                'success_rate': f"{(sent_count / len(expo_tokens) * 100) if expo_tokens else 0:.1f}%"
            },
            'rate_limits': ExpoNotificationService.get_rate_limit_info(),
            'broadcast': {
                'title': title,
                'message': message,
                'type': notification_type,
                'sent_by': current_user.username,
                'sent_at': datetime.datetime.utcnow().isoformat(),
                'total_users': user_count
            }
        }), 200
        
    except Exception as e:
        print(f"Error broadcasting notification: {str(e)}")
        return jsonify({'error': 'Failed to send notification'}), 500

@notifications_bp.route('/api/admin/notifications/new-product', methods=['POST'])
@token_required
@admin_required
def notify_new_product(current_user):
    """Send notification to all users about a new product"""
    try:
        data = request.get_json()
        product_id = data.get('product_id')
        print('product_id', product_id)
        if not product_id:
            return jsonify({'error': 'Product ID is required'}), 400
        
        product = Product.query.filter_by(id=product_id).first()
        if not product:
            return jsonify({'error': 'Product not found'}), 404
        
        # Get all active users
        users = User.query.all()
        user_count = len(users)
        
        # Get product owner info
        owner = User.query.get(product.owner_id)
        owner_name = owner.username if owner else 'Unknown Seller'
        
        # Prepare notification data
        notification_data = {
            'productId': product.id,
            'productName': product.name,
            'navigateTo': 'ProductDetail',
            'type': 'new_product_broadcast',
            'price': product.price,
            'category': product.category,
            'ownerName': owner_name,
            'imageUrl': product.image_url,
            'timestamp': datetime.datetime.utcnow().isoformat()
        }
        
        # Get Expo push tokens
        expo_tokens = list(user_push_tokens.values())
        
        # Send push notifications via Expo
        sent_count = 0
        failed_count = 0
        results = []
        
        if expo_tokens:
            title = "🛍️ New Product Available!"
            message = f"Check out '{product.name}' for MRO {product.price:.2f}"
            
            results = ExpoNotificationService.send_push_notification(
                expo_tokens,
                title,
                message,
                notification_data
            )
            
            sent_count = len([r for r in results if r.get('status') == 'ok'])
            failed_count = len([r for r in results if r.get('status') == 'error'])
            
            print(f"✅ New product notification: {sent_count} sent, {failed_count} failed")
        else:
            print("⚠️ No Expo tokens available for new product notification")
        
        return jsonify({
            'success': True,
            'message': f'New product notification processed for {user_count} users',
            'push_notifications': {
                'sent': sent_count,
                'failed': failed_count,
                'total_tokens': len(expo_tokens),
                'success_rate': f"{(sent_count / len(expo_tokens) * 100) if expo_tokens else 0:.1f}%"
            },
            'product': {
                'id': product.id,
                'name': product.name,
                'price': product.price,
                'category': product.category
            }
        }), 200
        
    except Exception as e:
        print(f"Error sending new product notification: {str(e)}")
        return jsonify({'error': 'Failed to send product notification'}), 500

@notifications_bp.route('/api/admin/notifications/targeted', methods=['POST'])
@token_required
@admin_required
def targeted_notification(current_user):
    """Send notification to specific users or user groups"""
    try:
        data = request.get_json()
        
        user_ids = data.get('user_ids', [])
        user_type = data.get('user_type')
        title = data.get('title', '').strip()
        message = data.get('message', '').strip()
        notification_type = data.get('type', 'targeted')
        data_payload = data.get('data', {})
        
        if not title or not message:
            return jsonify({'error': 'Title and message are required'}), 400
        
        # Build query based on parameters
        query = User.query.filter_by(is_active=True)
        
        if user_ids:
            query = query.filter(User.id.in_(user_ids))
        elif user_type:
            query = query.filter_by(usertype_id=user_type)
        
        users = query.all()
        user_count = len(users)
        
        # Get Expo tokens for targeted users
        target_tokens = []
        for user in users:
            token = user_push_tokens.get(user.id)
            if token:
                target_tokens.append(token)
        
        # Send push notifications
        sent_count = 0
        failed_count = 0
        results = []
        
        if target_tokens:
            notification_data = {
                'type': notification_type,
                'navigateTo': 'Notifications',
                'timestamp': datetime.datetime.now().isoformat(),
                **data_payload
            }
            
            results = ExpoNotificationService.send_push_notification(
                target_tokens,
                title,
                message,
                notification_data
            )
            
            sent_count = len([r for r in results if r.get('status') == 'ok'])
            failed_count = len([r for r in results if r.get('status') == 'error'])
            
            print(f"🎯 Targeted notification: {sent_count} sent, {failed_count} failed")
        else:
            print("⚠️ No Expo tokens available for targeted users")
        
        return jsonify({
            'success': True,
            'message': f'Targeted notification sent to {sent_count} users',
            'push_notifications': {
                'sent': sent_count,
                'failed': failed_count,
                'total_tokens': len(target_tokens),
                'success_rate': f"{(sent_count / len(target_tokens) * 100) if target_tokens else 0:.1f}%"
            },
            'recipients': [{'id': user.id, 'username': user.username} for user in users],
            'target_count': user_count
        }), 200
        
    except Exception as e:
        print(f"Error sending targeted notification: {str(e)}")
        return jsonify({'error': 'Failed to send notification'}), 500

@notifications_bp.route('/api/admin/notifications/stats', methods=['GET'])
@token_required
@admin_required
def notification_stats(current_user):
    """Get notification statistics"""
    try:
        total_users = User.query.filter_by(is_active=True).count()
        admin_users = User.query.filter_by(usertype_id=1, is_active=True).count()
        regular_users = User.query.filter_by(usertype_id=2, is_active=True).count()
        
        # Count users with push tokens
        users_with_tokens = len(user_push_tokens)
        
        return jsonify({
            'total_users': total_users,
            'admin_users': admin_users,
            'regular_users': regular_users,
            'users_with_push_tokens': users_with_tokens,
            'push_token_coverage': f"{(users_with_tokens / total_users * 100) if total_users > 0 else 0:.1f}%",
            'notification_ready': users_with_tokens > 0,
            'rate_limits': ExpoNotificationService.get_rate_limit_info()
        }), 200
        
    except Exception as e:
        print(f"Error getting notification stats: {str(e)}")
        return jsonify({'error': 'Failed to get notification stats'}), 500

@notifications_bp.route('/api/admin/notifications/test', methods=['POST'])
@token_required
@admin_required
def test_notification(current_user):
    """Send a test notification"""
    try:
        # Get Expo tokens
        expo_tokens = list(user_push_tokens.values())
        
        if not expo_tokens:
            return jsonify({
                'success': False,
                'message': 'No push tokens registered for testing'
            }), 400
        
        title = "✅ Test Notification"
        message = f"This is a test notification from {current_user.username}"
        
        notification_data = {
            'type': 'test',
            'navigateTo': 'Products',
            'timestamp': datetime.datetime.utcnow().isoformat(),
            'test': True
        }
        
        # Limit to 5 tokens for testing
        test_tokens = expo_tokens[:5]
        results = ExpoNotificationService.send_push_notification(
            test_tokens,
            title,
            message,
            notification_data
        )
        
        sent_count = len([r for r in results if r.get('status') == 'ok'])
        failed_count = len([r for r in results if r.get('status') == 'error'])
        
        return jsonify({
            'success': True,
            'message': f'Test notification sent to {sent_count} devices',
            'tested_tokens': len(test_tokens),
            'results': {
                'sent': sent_count,
                'failed': failed_count
            },
            'rate_limits': ExpoNotificationService.get_rate_limit_info()
        }), 200
        
    except Exception as e:
        print(f"Error sending test notification: {str(e)}")
        return jsonify({'error': 'Failed to send test notification'}), 500

@notifications_bp.route('/api/admin/notifications/verify-token', methods=['GET'])
@token_required
@admin_required
def verify_expo_token(current_user):
    """Verify if Expo Access Token is working"""
    try:
        has_token = bool(EXPO_ACCESS_TOKEN)
        limits = ExpoNotificationService.get_rate_limit_info()
        
        return jsonify({
            'has_access_token': has_token,
            'token_preview': EXPO_ACCESS_TOKEN[:20] + '...' if EXPO_ACCESS_TOKEN else None,
            'rate_limits': limits,
            'message': 'Token is configured correctly' if has_token else 'No access token found'
        }), 200
        
    except Exception as e:
        print(f"Error verifying token: {str(e)}")
        return jsonify({'error': 'Failed to verify token'}), 500

@notifications_bp.route('/api/admin/notifications/tokens', methods=['GET'])
@token_required
@admin_required
def get_registered_tokens(current_user):
    """Get all registered push tokens (Admin only)"""
    try:
        tokens_info = []
        for user_id, token in user_push_tokens.items():
            user = User.query.get(user_id)
            if user:
                tokens_info.append({
                    'user_id': user_id,
                    'username': user.username,
                    'email': user.email,
                    'token_preview': token[:20] + '...',
                    'registered_at': 'N/A'  # You might want to add registration timestamp
                })
        
        return jsonify({
            'total_tokens': len(tokens_info),
            'tokens': tokens_info
        }), 200
        
    except Exception as e:
        print(f"Error getting registered tokens: {str(e)}")
        return jsonify({'error': 'Failed to get registered tokens'}), 500

@notifications_bp.route('/api/admin/notifications/cleanup', methods=['POST'])
@token_required
@admin_required
def cleanup_tokens(current_user):
    """Clean up invalid push tokens (Admin only)"""
    try:
        initial_count = len(user_push_tokens)
        
        # Remove tokens that don't start with ExponentPushToken
        invalid_tokens = []
        for user_id, token in list(user_push_tokens.items()):
            if not token or not token.startswith('ExponentPushToken'):
                invalid_tokens.append(user_id)
                del user_push_tokens[user_id]
        
        final_count = len(user_push_tokens)
        
        return jsonify({
            'success': True,
            'message': f'Cleaned up {len(invalid_tokens)} invalid tokens',
            'initial_count': initial_count,
            'final_count': final_count,
            'removed_tokens': len(invalid_tokens)
        }), 200
        
    except Exception as e:
        print(f"Error cleaning up tokens: {str(e)}")
        return jsonify({'error': 'Failed to clean up tokens'}), 500

# Health check endpoint
@notifications_bp.route('/api/notifications/health', methods=['GET'])
def health_check():
    """Health check for notifications service"""
    try:
        return jsonify({
            'status': 'healthy',
            'service': 'notifications',
            'expo_configured': bool(EXPO_ACCESS_TOKEN),
            'registered_tokens': len(user_push_tokens),
            'timestamp': datetime.datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 500