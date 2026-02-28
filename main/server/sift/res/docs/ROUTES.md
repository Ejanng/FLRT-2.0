# FLRT-2.0 API Routes Documentation

RESTful API endpoints for the SIFT-based image matching system. Built with Flask and Flask-CORS for cross-origin support.

---

## Table of Contents

- [Overview](#overview)
- [Base URL](#base-url)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Endpoints](#endpoints)
  - [POST /sift/train](#post-sifttrain)
  - [POST /sift/detect](#post-siftdetect)
- [Request/Response Examples](#requestresponse-examples)
- [Status Codes](#status-codes)
- [CORS Configuration](#cors-configuration)
- [Integration Guide](#integration-guide)

---

## Overview

The FLRT API provides HTTP endpoints for:
- **Training**: Build SIFT database from Google Drive folders
- **Detection**: Match claim images against trained database

All endpoints accept and return JSON data.

---

## Base URL

```http
http://localhost:5000/sift
```

Production URL depends on deployment configuration.

---

## Authentication

Currently, **no API key authentication** is required. Authentication is handled via:
- Google Drive OAuth (first-time browser flow)
- Saved token persistence (`token.pickle`)

**Note:** OAuth consent screen appears on first Google Drive operation.

---

## Error Handling

All errors follow this format:

```json
{
  "error": "Human-readable error message",
  "details": "Additional technical details (optional)"
}
```

---

## Endpoints

### POST /sift/train

Train the SIFT model using images from a Google Drive folder.

#### Description

Downloads images from the specified Google Drive folder, extracts SIFT features, and builds a searchable database. Existing database will be overwritten.

#### Request

**URL:** `/sift/train`  
**Method:** `POST`  
**Content-Type:** `application/json`

**Body Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `gdrive_url` | string | Yes | Google Drive folder URL or ID |

**Example Request:**

```json
{
  "gdrive_url": "https://drive.google.com/drive/folders/1L67SDe_Tw0riFXWE_remlt0w0qfW-WGH"
}
```

#### Response

**Success (200 OK):**

```json
{
  "success": true,
  "message": "Training completed successfully",
  "images_processed": 5,
  "database_location": "/home/user/project/sift/res/sift_database.pkl",
  "image_names": ["report1.jpg", "report2.jpg", "report3.jpg"]
}
```

**Error (400 Bad Request):**

```json
{
  "error": "Missing gdrive_url"
}
```

**Error (500 Internal Server Error):**

```json
{
  "error": "Google Drive authentication failed",
  "details": "client_secret.json not found"
}
```

#### Process Flow

```
1. Validate gdrive_url parameter
2. Load existing database (if any)
3. Authenticate with Google Drive (OAuth)
4. List images in folder
5. Download each image
6. Extract SIFT features
7. Save to database.pkl
8. Return summary
```

---

### POST /sift/detect

Detect and match a claim image against the trained database.

#### Description

Analyzes a test image (from URL), matches it against the trained SIFT database, and optionally saves the annotated result to Google Drive.

#### Request

**URL:** `/sift/detect`  
**Method:** `POST`  
**Content-Type:** `application/json`

**Body Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `image_url` | string | Yes | URL to test image (GDrive, HTTP, or local path) |

**Example Request:**

```json
{
  "image_url": "https://drive.google.com/file/d/1oDnAuXpacSEt4EntxJA_JGH3oHMQoI43/view"
}
```

#### Response

**Success (200 OK) - Match Found:**

```json
{
  "success": true,
  "best_match": "report1.jpg",
  "match_score": 440,
  "saved_to_gdrive": true,
  "gdrive_file_id": "1ABC123xyz...",
  "gdrive_view_link": "https://drive.google.com/file/d/.../view",
  "all_matches": [
    {"name": "report1.jpg", "score": 440},
    {"name": "report2.jpg", "score": 123},
    {"name": "report3.jpg", "score": 45}
  ]
}
```

**Success (200 OK) - No Match:**

```json
{
  "success": false,
  "best_match": null,
  "match_score": 15,
  "error": "No match found (best score: 15, threshold: 30)",
  "all_matches": [
    {"name": "report1.jpg", "score": 15},
    {"name": "report2.jpg", "score": 8}
  ]
}
```

**Error (400 Bad Request):**

```json
{
  "error": "Missing image_url"
}
```

**Error (400 Bad Request) - No Database:**

```json
{
  "error": "Database not found. Please train the model first."
}
```

#### Process Flow

```
1. Validate image_url parameter
2. Load trained database
3. Download test image (from URL)
4. Extract SIFT features
5. FLANN match against database
6. Apply Lowe's ratio test
7. Select best match
8. Annotate result image
9. Upload to Google Drive (if configured)
10. Return match results
```

---

## Request/Response Examples

### cURL Examples

#### Train Model

```bash
curl -X POST http://localhost:5000/sift/train \
  -H "Content-Type: application/json" \
  -d '{
    "gdrive_url": "https://drive.google.com/drive/folders/1L67SDe_Tw0riFXWE_remlt0w0qfW-WGH"
  }'
```

#### Detect Image

```bash
curl -X POST http://localhost:5000/sift/detect \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://drive.google.com/file/d/1oDnAuXpacSEt4EntxJA_JGH3oHMQoI43/view"
  }'
```

### Python (requests) Examples

#### Train Model

```python
import requests

response = requests.post(
    "http://localhost:5000/sift/train",
    json={
        "gdrive_url": "https://drive.google.com/drive/folders/1L67SDe_Tw0riFXWE_remlt0w0qfW-WGH"
    }
)

print(response.json())
# {'success': True, 'images_processed': 5, ...}
```

#### Detect Image

```python
import requests

response = requests.post(
    "http://localhost:5000/sift/detect",
    json={
        "image_url": "https://drive.google.com/file/d/1oDnAuXpacSEt4EntxJA_JGH3oHMQoI43/view"
    }
)

result = response.json()
print(f"Best match: {result['best_match']} ({result['match_score']} matches)")
```

### JavaScript (fetch) Examples

#### Train Model

```javascript
fetch('http://localhost:5000/sift/train', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    gdrive_url: 'https://drive.google.com/drive/folders/1L67SDe_Tw0riFXWE_remlt0w0qfW-WGH'
  })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
```

#### Detect Image

```javascript
fetch('http://localhost:5000/sift/detect', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    image_url: 'https://drive.google.com/file/d/1oDnAuXpacSEt4EntxJA_JGH3oHMQoI43/view'
  })
})
.then(response => response.json())
.then(data => {
  if (data.success) {
    console.log(`Match found: ${data.best_match}`);
    console.log(`Score: ${data.match_score}`);
    console.log(`View result: ${data.gdrive_view_link}`);
  } else {
    console.log('No match found');
  }
});
```

---

## Status Codes

| Code | Meaning | When Returned |
|------|---------|---------------|
| 200 | OK | Successful train or detect operation |
| 201 | Created | Training completed (alternative success) |
| 400 | Bad Request | Missing parameters or invalid input |
| 500 | Internal Server Error | Processing error, authentication failure, or system error |

---

## CORS Configuration

Cross-Origin Resource Sharing is enabled for all routes:

```python
from flask_cors import CORS

CORS(app, resources={
    r"/sift/*": {
        "origins": "*",  # Configure for production
        "methods": ["POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})
```

### Production CORS Setup

For production, restrict origins:

```python
CORS(app, resources={
    r"/sift/*": {
        "origins": ["https://yourdomain.com", "https://app.yourdomain.com"],
        "methods": ["POST"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})
```

---

## Integration Guide

### Frontend Integration (React Example)

```jsx
import React, { useState } from 'react';

function ClaimDetector() {
  const [imageUrl, setImageUrl] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const detectImage = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/sift/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrl })
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Detection failed:', error);
    }
    setLoading(false);
  };

  return (
    <div>
      <input 
        type="text" 
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        placeholder="Enter image URL"
      />
      <button onClick={detectImage} disabled={loading}>
        {loading ? 'Detecting...' : 'Detect'}
      </button>
      
      {result && (
        <div>
          {result.success ? (
            <div className="success">
              <h3>Match Found: {result.best_match}</h3>
              <p>Score: {result.match_score} matches</p>
              <a href={result.gdrive_view_link} target="_blank">
                View Annotated Result
              </a>
            </div>
          ) : (
            <div className="error">
              <p>{result.error || 'No match found'}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

### Backend Integration (Webhook Example)

```python
import requests

def process_claim_webhook(claim_data):
    """
    Webhook handler for new claims
    """
    claim_image_url = claim_data['image_url']
    
    # Call FLRT API
    response = requests.post(
        'http://localhost:5000/sift/detect',
        json={'image_url': claim_image_url}
    )
    
    result = response.json()
    
    if result['success']:
        # Update claim with match info
        claim_data['matched_report'] = result['best_match']
        claim_data['match_score'] = result['match_score']
        claim_data['evidence_link'] = result['gdrive_view_link']
    
    return claim_data
```

---

## Rate Limiting Recommendations

For production deployment, implement rate limiting:

```python
from flask_limiter import Limiter

limiter = Limiter(
    app,
    key_func=lambda: request.headers.get("X-API-Key") or request.remote_addr,
    default_limits=["200 per day", "50 per hour"]
)

@sift_bp.route('/detect', methods=['POST'])
@limiter.limit("10 per minute")  # Detection is computationally expensive
def detect_image_route():
    # ... existing code
```

---

## Security Considerations

| Risk | Mitigation |
|------|------------|
| OAuth token exposure | Store `token.pickle` outside web root |
| Large file uploads | Limit image size (recommend <10MB) |
| URL validation | Validate `image_url` is from trusted domains |
| CORS misconfiguration | Restrict origins in production |
| Database overwrite | Add confirmation for re-training |

---

## Testing

### Using Postman

1. **Import** the following collection:

```json
{
  "info": {
    "name": "FLRT API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Train Model",
      "request": {
        "method": "POST",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "url": "{{base_url}}/sift/train",
        "body": {
          "mode": "raw",
          "raw": "{\"gdrive_url\": \"https://drive.google.com/drive/folders/YOUR_FOLDER_ID\"}"
        }
      }
    },
    {
      "name": "Detect Image",
      "request": {
        "method": "POST",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "url": "{{base_url}}/sift/detect",
        "body": {
          "mode": "raw",
          "raw": "{\"image_url\": \"https://drive.google.com/file/d/YOUR_FILE_ID/view\"}"
        }
      }
    }
  ]
}
```

2. Set environment variable `base_url` to `http://localhost:5000`

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| `CORS error` | Frontend on different origin | Ensure Flask-CORS is enabled |
| `No database found` | Training not performed | Call `/train` first |
| `OAuth popup blocked` | Browser security | Allow popups for localhost |
| `Timeout` | Large image or slow connection | Increase Flask timeout |
| `403 Forbidden` | Token scope insufficient | Delete `token.pickle` and re-auth |

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2024-02-28 | Initial API with train/detect endpoints |
| 2.0.1 | TBD | Added rate limiting, authentication |

---

## Support

For issues or questions:

- **Repository**: [[FLRT-2.0](https://github.com/Ejanng/FLRT-2.0)]
- **Email**: [earljasper21@gmail.com]
- **Institution**: [Mariano Marcos State University]
