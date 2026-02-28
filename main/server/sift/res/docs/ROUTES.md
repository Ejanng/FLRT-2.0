# SIFT Image Processing API Documentation

This document describes a local API for training and processing images using the Scale-Invariant Feature Transform (SIFT) algorithm. SIFT detects and matches keypoints in images for tasks like object recognition and validation. [blog.roboflow](https://blog.roboflow.com/sift/)

## Overview
The system handles score points (keypoints and descriptors) for image comparison. It integrates Google Drive (via OAuth 2.0) for data storage and local files for efficiency. Access endpoints via http://localhost:5000 after starting the server. [blog.roboflow](https://blog.roboflow.com/sift/)

## Endpoints

### Training Endpoint
**URL:** `http://localhost:5000/sift/train`

**Purpose:** Trains the SIFT model by loading image data from a Google Drive folder, extracting keypoints, and saving a `database.pkl` file locally.

**Process:**
- Loads images from a specified Google Drive folder.
- Applies SIFT to generate score points (keypoints and descriptors).
- Serializes keypoints into `database.pkl` for storage and reuse.
- Uses OAuth 2.0 for authentication (set up at console.cloud.google.com); tokens save locally after developer approval for read/write access.

**Usage Notes:**
- Run once to build the reference database.
- Requires Google Drive folder with training images.
- Output: Local `database.pkl` with SIFT features. [en.wikipedia](https://en.wikipedia.org/wiki/Scale-invariant_feature_transform)

### Processing Endpoint
**URL:** `http://localhost:5000/sift/process`

**Purpose:** Processes a new image by matching it against the trained SIFT database and saving high-score matches to Google Drive.

**Process:**
- Loads `database.pkl` for reference keypoints.
- Extracts SIFT keypoints from input image.
- Computes matches based on descriptor similarity (e.g., Euclidean distance).
- Highest-scoring matches (strongest keypoint alignments) save to Google Drive for admin review/claim validation.

**Usage Notes:**
- Requires prior training (database.pkl exists).
- Input: Image via POST or query param (implementation-specific).
- Output: Matched results uploaded to Drive folder. [en.wikipedia](https://en.wikipedia.org/wiki/Scale-invariant_feature_transform)

## Setup Requirements
- **Authentication:** Configure OAuth 2.0 credentials in Google Cloud Console. Approve app for Drive read/write.
- **Dependencies:** Likely OpenCV (for SIFT), `pydrive` or `google-auth` for Drive, `pickle` for serialization.
- **Local Storage:** Ensure write access for `database.pkl`.
- **Server:** Run Flask/FastAPI app exposing these routes.

## Example Workflow
1. Train: Hit `/sift/train` to build database from Drive images.
2. Process: Submit image to `/sift/process`; review matches in Drive.

This setup suits claim validation by automating image matching with robust, scale/rotation-invariant features. [ultralytics](https://www.ultralytics.com/blog/what-is-the-scale-invariant-feature-transform-sift)