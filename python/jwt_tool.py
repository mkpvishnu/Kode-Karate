import sys
import json
import jwt
from datetime import datetime
import time

def decode_jwt(token, secret=None):
    try:
        # First decode without verification to get header
        header = jwt.get_unverified_header(token)
        
        # Decode payload - first try with verification if secret provided
        if secret:
            try:
                payload = jwt.decode(token, secret, algorithms=[header.get('alg', 'HS256')])
                is_valid = True
            except jwt.InvalidSignatureError:
                payload = jwt.decode(token, options={"verify_signature": False})
                is_valid = False
        else:
            payload = jwt.decode(token, options={"verify_signature": False})
            is_valid = None

        # Add human readable dates for timestamp fields
        if 'exp' in payload:
            payload['expiry_readable'] = datetime.fromtimestamp(payload['exp']).strftime('%Y-%m-%d %H:%M:%S')
            payload['is_expired'] = payload['exp'] < time.time()
        if 'iat' in payload:
            payload['issued_at_readable'] = datetime.fromtimestamp(payload['iat']).strftime('%Y-%m-%d %H:%M:%S')
        if 'nbf' in payload:
            payload['not_before_readable'] = datetime.fromtimestamp(payload['nbf']).strftime('%Y-%m-%d %H:%M:%S')

        parts = token.split('.')
        result = {
            'status': 'success',
            'header': header,
            'payload': payload,
            'signature': parts[2] if len(parts) > 2 else '',
            'is_valid': is_valid
        }
    except Exception as e:
        result = {
            'status': 'error',
            'message': str(e)
        }

    print(json.dumps(result))

def encode_jwt(header_str, payload_str, secret):
    try:
        header = json.loads(header_str)
        payload = json.loads(payload_str)
        algorithm = header.get('alg', 'HS256')
        
        token = jwt.encode(payload, secret, algorithm=algorithm, headers=header)
        result = {
            'status': 'success',
            'token': token
        }
    except Exception as e:
        result = {
            'status': 'error',
            'message': str(e)
        }

    print(json.dumps(result))

def main():
    command = sys.stdin.readline().strip()
    data = json.loads(sys.stdin.readline().strip())

    if command == 'decode':
        decode_jwt(data['token'], data.get('secret'))
    elif command == 'encode':
        encode_jwt(data['header'], data['payload'], data['secret'])

if __name__ == "__main__":
    main()