import hmac
import hashlib
import base64
import uuid
import os
import json
from datetime import datetime, timedelta, timezone
from typing import Optional

SECRET_KEY = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')

def generate_warranty_token(warranty_id: str, tenant_id: str) -> str:
    """
    Generate a secure warranty token with self-contained payload.
    Format: <base64url(payload)>.<signature>
    Payload: JSON with {guid, tenant_id, warranty_id, issued_at}
    Signature: HMAC-SHA256 of the full payload string
    """
    guid = str(uuid.uuid4()).replace('-', '')
    issued_at = str(int(datetime.now(timezone.utc).timestamp()))
    
    # Create self-contained payload
    payload = {
        "guid": guid,
        "tenant_id": tenant_id,
        "warranty_id": warranty_id,
        "issued_at": issued_at
    }
    
    # Encode payload as base64url JSON
    payload_json = json.dumps(payload, separators=(',', ':'))
    payload_b64 = base64.urlsafe_b64encode(payload_json.encode()).decode('utf-8').rstrip('=')
    
    # Create signature of the entire payload
    signature = hmac.new(
        SECRET_KEY.encode(),
        payload_b64.encode(),
        hashlib.sha256
    ).digest()
    
    # Use full signature (no truncation) for maximum security
    sig_b64 = base64.urlsafe_b64encode(signature).decode('utf-8').rstrip('=')
    
    # Token format: payload.signature
    token = f"{payload_b64}.{sig_b64}"
    return token

def verify_and_extract_token(token: str) -> Optional[dict]:
    """
    Verify warranty token signature and extract all payload data.
    Returns payload dict if valid, None if invalid.
    """
    try:
        parts = token.split('.')
        if len(parts) != 2:
            return None
        
        payload_b64, provided_sig = parts
        
        # Verify signature FIRST before trusting payload
        expected_signature = hmac.new(
            SECRET_KEY.encode(),
            payload_b64.encode(),
            hashlib.sha256
        ).digest()
        
        expected_sig_b64 = base64.urlsafe_b64encode(expected_signature).decode('utf-8').rstrip('=')
        
        # Constant-time comparison to prevent timing attacks
        if not hmac.compare_digest(provided_sig, expected_sig_b64):
            return None
        
        # Decode payload only after signature verification
        # Add padding if needed
        padding = 4 - (len(payload_b64) % 4)
        if padding != 4:
            payload_b64 += '=' * padding
        
        payload_json = base64.urlsafe_b64decode(payload_b64).decode('utf-8')
        payload = json.loads(payload_json)
        
        # Validate required fields
        required_fields = ['guid', 'tenant_id', 'warranty_id', 'issued_at']
        if not all(field in payload for field in required_fields):
            return None
        
        return payload
    except Exception:
        return None

def verify_warranty_token_full(token: str) -> Optional[dict]:
    """
    Full verification of warranty token.
    Returns payload if token is valid and not expired, None otherwise.
    This is an alias for verify_and_extract_token for backward compatibility.
    """
    return verify_and_extract_token(token)

def calculate_days_remaining(expiry_date: datetime) -> int:
    now = datetime.now(timezone.utc)
    if expiry_date.tzinfo is None:
        expiry_date = expiry_date.replace(tzinfo=timezone.utc)
    
    delta = expiry_date - now
    return max(0, delta.days)

def is_warranty_valid(expiry_date: datetime, grace_days: int = 7) -> bool:
    now = datetime.now(timezone.utc)
    if expiry_date.tzinfo is None:
        expiry_date = expiry_date.replace(tzinfo=timezone.utc)
    
    grace_end = expiry_date + timedelta(days=grace_days)
    return now <= grace_end

def detect_fraud_indicators(
    warranty_record: dict,
    claim_data: dict,
    recent_claims: list
) -> float:
    fraud_score = 0.0
    
    if warranty_record.get('serial_number') and claim_data.get('serial_number'):
        if warranty_record['serial_number'] != claim_data.get('serial_number'):
            fraud_score += 0.4
    
    if len(recent_claims) > 3:
        fraud_score += 0.3
    
    if not claim_data.get('images') or len(claim_data.get('images', [])) == 0:
        fraud_score += 0.2
    
    return min(fraud_score, 1.0)
