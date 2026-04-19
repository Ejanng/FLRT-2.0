# SIFT Image Matching Algorithm

A Python implementation of Scale-Invariant Feature Transform (SIFT) for image feature extraction and matching, with Google Drive integration for cloud-based training and storage.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
  - [Command Line Interface](#command-line-interface)
  - [Python API](#python-api)
- [Core Functions](#core-functions)
  - [Training](#training)
  - [Detection](#detection)
  - [Google Drive Operations](#google-drive-operations)
- [Data Structures](#data-structures)
- [Error Handling](#error-handling)
- [Limitations](#limitations)

---

## Overview

This module provides SIFT-based image recognition capabilities:

- **Feature Extraction**: Extracts SIFT descriptors from training images
- **Feature Matching**: Matches test images against trained database using FLANN
- **Google Drive Integration**: Train from and save results to Google Drive
- **Persistent Storage**: Saves/loads database using pickle

---

## Features

| Feature | Description |
|---------|-------------|
| SIFT Feature Detection | Scale-invariant feature extraction |
| FLANN Matching | Fast approximate nearest neighbor matching |
| Lowe's Ratio Test | Filters good matches (threshold: 0.75) |
| Google Drive Training | Train directly from GDrive folders |
| OAuth Authentication | Secure API access with token persistence |
| Headless Operation | No GUI required for server deployment |

---

## Requirements

### Python Packages

```bash
pip install opencv-python numpy matplotlib requests
pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib
```

### System Requirements

- Python 3.8+
- OpenCV with SIFT support (opencv-python 4.4.0+)
- Google Cloud Project with Drive API enabled

### Google Cloud Setup

1. Enable Google Drive API in [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials (Desktop application type)
3. Download `client_secret.json` and place in `sift/res/`

---

## Installation

```bash
# Clone or copy the sift module to your project
project/
├── app.py
└── sift/
    ├── __init__.py
    ├── algorithm.py      # This module
    ├── routes.py
    ├── services.py
    └── res/              # Resources directory
        ├── client_secret.json    # OAuth credentials
        ├── token.pickle          # Saved authentication token
        ├── sift_database.pkl     # Trained database
        ├── train/                # Local training images
        └── reports/              # Output reports
```

---

## Configuration

### Path Configuration

Paths are automatically resolved relative to `algorithm.py`:

```python
MODULE_DIR = os.path.dirname(os.path.abspath(__file__))
RES_DIR = os.path.join(MODULE_DIR, 'res')

# Key files
GDRIVE_CREDENTIALS = os.path.join(RES_DIR, "client_secret.json")
TOKEN_FILE = os.path.join(RES_DIR, "token.pickle")
DB_FILE = os.path.join(RES_DIR, "sift_database.pkl")
IMAGE_DIR = os.path.join(RES_DIR, "train")
```

### Algorithm Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `MIN_MATCH_COUNT` | 30 | Minimum matches for valid detection |
| `FLANN_INDEX_KDITREE` | 0 | FLANN index algorithm |
| `tree` | 5 | Number of trees in FLANN index |
| `ratio_test` | 0.75 | Lowe's ratio test threshold |

---

## Usage

### Command Line Interface

```bash
# Train from local folder
python -m sift.algorithm --mode train_local --source ./images

# Train from Google Drive folder
python -m sift.algorithm --mode train_gdrive \
    --source "https://drive.google.com/drive/folders/FOLDER_ID"

# Detect from local image
python -m sift.algorithm --mode detect \
    --test_img ./test.jpg \
    --output_folder "GDRIVE_FOLDER_ID"

# Detect from URL
python -m sift.algorithm --mode detect \
    --source "https://example.com/image.jpg" \
    --output_folder "GDRIVE_FOLDER_ID"
```

### Python API

```python
from sift import algorithm as sift

# Load existing database
database = sift.load_database()

# Train from Google Drive
result = sift.build_database_from_gdrive("https://drive.google.com/drive/folders/...")

# Detect image
result = sift.detect_from_database(
    test_img_source="https://.../image.jpg",
    database=database,
    output_gdrive_folder_id="FOLDER_ID"
)

print(result['best_match'])  # Name of matched image
print(result['match_score'])  # Number of good matches
```

---

## Core Functions

### Training

#### `load_database()`
Loads existing SIFT database from disk.

**Returns:**
- `list`: Database tuples `(image_name, descriptors)` or empty list

**Example:**
```python
database = sift.load_database()
if not database:
    print("No database found, training required")
```

---

#### `build_database_from_files(train_dir=IMAGE_DIR)`
Build database from local image files.

**Parameters:**
| Name | Type | Default | Description |
|------|------|---------|-------------|
| `train_dir` | str | `IMAGE_DIR` | Path to training images |

**Supported Formats:** `.jpg`, `.jpeg`, `.png`, `.bmp`, `.tiff`

**Returns:** `list` - Database of extracted features

**Example:**
```python
database = sift.build_database_from_files("./my_images")
```

---

#### `build_database_from_gdrive(folder_url)`
Build database directly from Google Drive folder.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `folder_url` | str | Google Drive folder URL or ID |

**Returns:** `dict` - Training summary
```python
{
    "success": True,
    "images_processed": 5,
    "database_location": "/path/to/sift_database.pkl",
    "image_names": ["img1.jpg", "img2.jpg"]
}
```

**Authentication:** First run opens browser for OAuth consent. Token saved for subsequent runs.

**Example:**
```python
result = sift.build_database_from_gdrive(
    "https://drive.google.com/drive/folders/1ABC123..."
)
```

---

#### `extract_and_save_features(img_source, img_name, database, is_frame=False, is_array=False)`
Extract SIFT features and append to database.

**Parameters:**
| Name | Type | Default | Description |
|------|------|---------|-------------|
| `img_source` | str/array | - | Image path or numpy array |
| `img_name` | str | - | Identifier for image |
| `database` | list | - | Database to append to |
| `is_frame` | bool | False | Source is video frame |
| `is_array` | bool | False | Source is numpy array |

**Storage:** Only descriptors (numpy array) are saved, not KeyPoint objects (not pickleable).

---

### Detection

#### `detect_from_database(test_img_source, database, output_gdrive_folder_id=None)`
Match test image against trained database.

**Parameters:**
| Name | Type | Default | Description |
|------|------|---------|-------------|
| `test_img_source` | str | - | Local path, URL, or GDrive URL |
| `database` | list | - | Trained database from `load_database()` |
| `output_gdrive_folder_id` | str | None | GDrive folder to save result |

**Returns:** `dict` - Detection results
```python
{
    "success": True,                    # Match found above threshold
    "best_match": "report1.jpg",        # Name of best matching image
    "match_score": 440,                 # Number of good matches
    "all_matches": [                    # Top 5 matches sorted by score
        {"name": "report1.jpg", "score": 440},
        {"name": "report2.jpg", "score": 123}
    ],
    "saved_to_gdrive": True,            # Whether result was uploaded
    "gdrive_file_id": "1ABC...",        # Uploaded file ID
    "gdrive_view_link": "https://...",  # Shareable link
    "error": None                       # Error message if failed
}
```

**Matching Algorithm:**
1. Extract SIFT features from the query image to obtain `desc_test`.
2. For each database image, match descriptors using FLANN with `k=2`.
3. Apply Lowe's ratio test: accept a match only when the best descriptor distance is significantly better than the second-best.
4. Count the number of "good" matches for each image.
5. Compute a normalized match ratio using the smaller of the query and database descriptor counts.
6. Choose the image with the highest good-match count, breaking ties by higher match ratio.
7. Verify the top candidate passes the configured thresholds.

### How the SIFT matching calculation works

The code uses these exact steps when scoring each database entry:

- Use `cv2.FlannBasedMatcher(...).knnMatch(desc_test, desc_train, k=2)` to get two nearest neighbors for every query descriptor.
- For each returned pair `(m, n)`:
  - Keep the match if `m.distance < LOWE_RATIO_TEST * n.distance`
  - This is Lowe's ratio test, which rejects ambiguous matches where the second-best match is nearly as good as the best.
- Count every accepted pair as one good match.
- Compute the normalized match ratio as:

```text
match_ratio = good_matches / max(1, min(len(desc_test), len(desc_train)))
```

This ratio measures how many strong matches exist relative to the number of extracted features in the smaller image.

### Simple conceptual flow

- Extract descriptors from the query image and from each candidate database image.
- For each query descriptor, find the two nearest candidate descriptors.
- Use Lowe's ratio test to keep a match only when the best distance is clearly better than the second-best.
- The number of remaining matches becomes the raw score for that database image.
- Normalize that score by the smaller descriptor count to compute the match ratio.

```
query descriptor -> [best match d1, second-best match d2]
                    keep if d1 < 0.75 * d2
```

### Thresholds used by `detect_from_database`

The selected best match is accepted only if all of these are true:

- `best_good >= MIN_MATCH_COUNT`
- `best_ratio >= MIN_MATCH_RATIO`
- `best_good >= second_best_good * SECOND_BEST_MATCH_MULTIPLIER`

These thresholds protect against weak or ambiguous matches by requiring a minimum number of distinct correspondences, a minimum coverage ratio, and a clear gap between the best and second-best candidate.

### Manual example

Suppose the query image has 250 descriptors and a candidate database image has 300 descriptors.

1. FLANN finds matches for each descriptor pair.
2. After Lowe's ratio test, 80 good matches remain.
3. The denominator is `min(250, 300) = 250`, so:

```text
match_ratio = 80 / 250 = 0.32
```

4. If the configured thresholds are:
   - `MIN_MATCH_COUNT = 30`
   - `MIN_MATCH_RATIO = 0.15`
   - `SECOND_BEST_MATCH_MULTIPLIER = 1.5`

Then this candidate passes the first two checks.

5. If the second-best candidate has 50 good matches, the gap check is:

```text
80 >= 50 * 1.5  => 80 >= 75  => true
```

So this image would be accepted as the best match.

If instead the candidate had only 25 good matches, it would fail because `25 < 30`.
If it had 35 good matches but `match_ratio = 0.14`, it would fail the ratio threshold.

### Comparison example: best vs second-best candidate

Suppose two database candidates are evaluated against the same query image with 250 query descriptors.

- Candidate A: 80 good matches, 300 train descriptors
- Candidate B: 50 good matches, 220 train descriptors

For Candidate A:
```text
match_ratio_A = 80 / min(250, 300) = 80 / 250 = 0.32
```
For Candidate B:
```text
match_ratio_B = 50 / min(250, 220) = 50 / 220 ≈ 0.227
```

Threshold checks:
- Candidate A passes `MIN_MATCH_COUNT = 30` and `MIN_MATCH_RATIO = 0.15`
- Candidate B also passes both thresholds, but has a lower score and ratio

Gap check:
```text
80 >= 50 * 1.5  => 80 >= 75  => true
```

Because Candidate A has more good matches and a higher ratio, it is selected as the best match.

**Example:**
```python
database = sift.load_database()
result = sift.detect_from_database(
    "https://drive.google.com/file/d/.../view",
    database,
    "1qtyquqQntdIu9FU8nnu-cmWkL6Lt1oXm"
)

if result['success']:
    print(f"Matched: {result['best_match']} ({result['match_score']} matches)")
```

---

### Google Drive Operations

#### `get_drive_service()`
Authenticate with Google Drive API using OAuth.

**Behavior:**
- Loads saved token from `token.pickle` if exists
- Refreshes expired tokens automatically
- Opens browser for new authentication if needed
- Saves token for future use

**Returns:** `googleapiclient.discovery.Resource` - Drive API service

**Scope:** `https://www.googleapis.com/auth/drive` (full access)

---

#### `extract_gdrive_file_id(url)`
Extract file ID from various Google Drive URL formats.

**Supported Formats:**
- `https://drive.google.com/file/d/FILE_ID/view`
- `https://drive.google.com/open?id=FILE_ID`
- `https://drive.google.com/uc?id=FILE_ID`
- Raw file ID string

**Returns:** `str` - File ID or `None`

---

#### `extract_folder_id(folder_url)`
Extract folder ID from Google Drive folder URL.

**Supported Formats:**
- `https://drive.google.com/drive/folders/FOLDER_ID`
- `https://drive.google.com/drive/folders/FOLDER_ID?usp=sharing`

**Returns:** `str` - Folder ID

---

#### `save_image_to_gdrive(image_array, filename, folder_id, add_timestamp=True)`
Upload OpenCV image to Google Drive folder.

**Parameters:**
| Name | Type | Default | Description |
|------|------|---------|-------------|
| `image_array` | ndarray | - | OpenCV image (BGR or grayscale) |
| `filename` | str | - | Desired filename |
| `folder_id` | str | - | GDrive folder ID |
| `add_timestamp` | bool | True | Append timestamp to avoid overwrites |

**Returns:** `dict`
```python
{
    "success": True,
    "id": "1ABC...",
    "name": "match_report_1234567890.jpg",
    "view_link": "https://drive.google.com/file/d/..."
}
```

---

## Data Structures

### Database Format

```python
# List of tuples: (image_name, descriptors)
[
    ("report1.jpg", numpy.ndarray of shape (n_keypoints, 128)),
    ("report2.jpg", numpy.ndarray of shape (m_keypoints, 128)),
]
```

- **image_name**: `str` - Original filename
- **descriptors**: `numpy.ndarray` - SIFT descriptors (float32, 128 dimensions per keypoint)

### SIFT Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| `nfeatures` | 0 (unlimited) | Maximum features to detect |
| `nOctaveLayers` | 3 | Layers per octave |
| `contrastThreshold` | 0.04 | Filter weak features |
| `edgeThreshold` | 10 | Filter edge-like features |
| `sigma` | 1.6 | Gaussian sigma |

---

## Error Handling

Common errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| `client_secret.json not found` | Wrong working directory | Ensure file is in `sift/res/` |
| `Token has insufficient scope` | Old readonly token | Delete `token.pickle` and re-auth |
| `HttpError 403: storageQuotaExceeded` | Service account upload | Use OAuth or Shared Drive |
| `No features in test image` | Blurry/textureless image | Use higher quality image |
| `ndarray is not JSON serializable` | Returning raw database | Return summary dict instead |

---

## Limitations

1. **Google Drive Upload**: Regular folders require OAuth (not service accounts)
2. **SIFT Patent**: SIFT is patented in some jurisdictions (use ORB as alternative if needed)
3. **Memory**: Large databases load entirely into memory
4. **Matching Speed**: Linear search through database (consider FLANN index for large datasets)
5. **Image Size**: Very large images may cause memory issues

---

## Performance Tips

- **Database Size**: Keep under 1000 images for reasonable matching speed
- **Image Resolution**: Resize images to ~1000px max dimension before processing
- **Feature Count**: Typical images yield 500-2000 keypoints
- **Matching Threshold**: Adjust `MIN_MATCH_COUNT` based on your use case (30 for strict, 10 for lenient)

---

## License

### SIFT Algorithm

The Scale-Invariant Feature Transform (SIFT) algorithm was patented by David Lowe (US6711293B1) from 2000-2020. **The patent expired on March 6, 2020** and is now in the public domain worldwide, including the Philippines.

- ✅ **Commercial use permitted** - No licensing fees
- ✅ **Modification permitted** - Open source or proprietary
- ✅ **Distribution permitted** - No restrictions

### OpenCV License

This project uses OpenCV, which is licensed under the **Apache License 2.0**.

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-02-28 | Initial implementation with OAuth support |
```
