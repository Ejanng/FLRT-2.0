# SIFT Database Training & Live Detection

> **Credits & Licenses**

This project is a modified wrapper around existing open-source work on the SIFT (Scale-Invariant Feature Transform) algorithm and OpenCV’s implementation.

- **SIFT Algorithm (Core idea & mathematics)**  
  - David G. Lowe, “Distinctive Image Features from Scale-Invariant Keypoints”, International Journal of Computer Vision, 2004.  
  - Paper: https://www.cs.ubc.ca/~lowe/papers/ijcv04.pdf  
  - Please cite this paper if you publish any academic work based on this project.

- **Original OpenCV SIFT Implementation**  
  - OpenCV project: https://opencv.org  
  - License: Apache 2.0  
  - SIFT is available through `opencv-contrib-python` in recent versions of OpenCV.

- **Original Codebase Used as Reference**  
  - Repository: `OpenGenus/SIFT-Scale-Invariant-Feature-Transform`  
    - https://github.com/OpenGenus/SIFT-Scale-Invariant-Feature-Transform  
  - License: GPL-3.0  
  - This project reuses/extends the original `sift-detect.py` logic for:
    - Feature extraction  
    - FLANN-based matching  
    - Homography-based object localization (in some variants)

- **Additional References**  
  - OpenCV SIFT tutorial: https://docs.opencv.org/  
  - Various community snippets and Q&A posts were consulted for:
    - SIFT + FLANN usage patterns  
    - Homography-based bounding boxes  
    - Camera/video capture troubleshooting

The modifications in this repository focus on:

- Building a persistent SIFT **feature database** from:
  - Live camera capture (object isolation & saving)
  - Image files in a training directory
- Running **live detection** against the database in real time
- Adding simple and optional **visual bounding boxes** around detected objects
- Making the system easier to run and extend on Linux/Windows using Python + OpenCV

---

## 1. Project Overview

This project lets you:

- **Train** a SIFT descriptor database from:
  - Live webcam capture (press `s` to capture objects)
  - A folder of training images
- **Save** all features in a persistent `.pkl` database file
- **Detect** trained objects:
  - Against a single test image
  - Live from the webcam feed
- Optionally **visualize matches** with:
  - On-screen labels (`MATCH: object_xxx (N pts)`)
  - (Optional) bounding boxes / polylines around detected objects

Main script:

- `sift_db_train.py`

Main resources:

- `res/train/` – training images (cropped object images)
- `res/sift_database.pkl` – serialized SIFT descriptor database

---

## 2. Requirements

### 2.1. Operating System

- **Linux**: Ubuntu 20.04+ recommended
- **Windows**: Windows 10/11 supported
- **Other**: macOS and most modern Linux distros should work with minor adjustments

### 2.2. Software

- Python **3.8+**
- OpenCV with SIFT support:
  - `opencv-contrib-python` (recommended)
- Python packages:
  - `numpy`
  - `matplotlib` (for optional visualizations)
  - `argparse`
  - `pickle` (standard library)

---

## 3. Installation

### 3.1. Common (Linux & Windows)

Create a virtual environment and install dependencies:

```bash
# Create virtual environment
python -m venv ~/sift_env

# Activate (Linux/macOS)
source ~/sift_env/bin/activate

# Activate (Windows PowerShell)
# .\sift_env\Scripts\Activate.ps1

# Install dependencies
pip install opencv-contrib-python numpy matplotlib
```

Clone or copy the project:

```bash
# Example Linux layout
cd ~/Desktop
git clone https://github.com/OpenGenus/SIFT-Scale-Invariant-Feature-Transform.git
cd SIFT-Scale-Invariant-Feature-Transform
# Place your modified sift_db_train.py in ./src if not already there
mkdir -p res/train
```

Ensure the paths in `sift_db_train.py` match your layout, for example:

```python
DB_FILE = "../res/sift_database.pkl"
# Training images read from ../res/train/
```

---

## 4. Usage

### 4.1. Activate Environment

Every new terminal/session:

```bash
# Linux/macOS
source ~/sift_env/bin/activate

# Windows PowerShell
# .\sift_env\Scripts\Activate.ps1
```

Change to the project `src` directory:

```bash
cd /path/to/SIFT-Scale-Invariant-Feature-Transform/src
```

---

### 4.2. Live Training Mode (`train_live`)

Use the webcam to capture and store objects into the SIFT database.

```bash
python3 sift_db_train.py --mode train_live
```

Controls:

- `s` – Capture current object:
  - Automatically crops the detected object region
  - Saves the cropped image into `../res/train/`
  - Extracts SIFT descriptors and **appends** them to the database
- `q` – Quit training:
  - Writes/updates `../res/sift_database.pkl` with all objects seen this session (plus any previously saved objects, if implemented as append)

Notes:

- The script generally:
  - Converts each frame to grayscale
  - Optionally isolates the main object via contour/threshold logic
  - Extracts SIFT descriptors from the cropped region
- You may train multiple objects over multiple runs; the database can be updated to **append** rather than overwrite (depending on your final code version).

---

### 4.3. File Training Mode (`train_files`)

Build the database from existing images in a folder.

```bash
python3 sift_db_train.py --mode train_files
```

Behavior:

- Scans `../res/train/` for `.jpg`, `.jpeg`, `.png` files
- Extracts SIFT descriptors from each
- Saves resulting database into `../res/sift_database.pkl`

Usage tips:

- Place one clear image per object in `res/train/`
- The more textured the object, the better SIFT performs

---

### 4.4. Detect from Static Image (`detect`)

Match a single test image against the trained database.

```bash
python3 sift_db_train.py --mode detect --test_img ../res/train/object_000_xxx.jpg
```

Behavior:

- Loads `../res/sift_database.pkl`
- Computes SIFT descriptors of the test image
- Matches against each database entry (FLANN + ratio test)
- Reports best match and number of good matches
- Optionally visualizes overlays/bounding boxes (depending on your code version)

---

### 4.5. Live Detection Mode (`detect_live`)

Run SIFT matching in real time from the camera.

```bash
python3 sift_db_train.py --mode detect_live
```

Typical behavior (depending on your chosen variant):

- Opens the default camera (`VideoCapture(0)`)
- Extracts SIFT features for each frame
- Matches against all database entries via FLANN
- Displays:
  - Live video
  - Best match name & match score (good matches count)
  - Optionally:
    - A bounding box / quadrilateral around the detected instance  
      (e.g., via homography + `cv2.perspectiveTransform` or via `cv2.boundingRect` of matched points)

Controls:

- `q` – Quit live detection

Performance notes:

- Full-frame SIFT + matching is expensive:
  - You can downscale frames
  - Or run SIFT every N frames (e.g., every 3–5 frames)
- Bounding boxes based on homography are more precise but heavier than simple text overlays.

---

## 5. Data & Persistence

- **Image storage**:
  - Cropped training images are saved to `res/train/`
- **Database storage**:
  - SIFT descriptors and associated object names are stored in `res/sift_database.pkl` using Python’s `pickle`.
- **Persistence behavior** (depending on your final implementation):
  - `train_live` can be configured to:
    - **Overwrite** the database with only current session objects, or
    - **Append** current session objects to a previously saved database (load, extend, save).

---

## 6. Known Issues & Tips

- **Black camera window / no video**:
  - Check the camera index (`cv2.VideoCapture(0)` vs `1`)
  - On Linux/Wayland, you may need:
    - `QT_QPA_PLATFORM=xcb python3 sift_db_train.py --mode detect_live`
- **Database getting overwritten**:
  - Ensure your `train_live` saving logic:
    - Loads the existing DB via `load_database()`
    - Extends it with new objects
    - Writes back the combined list
- **Pickle errors (`EOFError`, `cannot pickle 'cv2.KeyPoint'`)**:
  - Save only descriptors and minimal metadata (e.g., `(img_name, desc)`), not raw `cv2.KeyPoint` objects.
  - Ensure the file is fully written before reuse.

---

## 7. License & Attribution

This project is a derivative work built on top of:

- OpenCV (Apache 2.0 license)
- `OpenGenus/SIFT-Scale-Invariant-Feature-Transform` (GPL-3.0)
- SIFT algorithm by David G. Lowe (patent has expired; algorithm is widely used, but always credit the original paper in academic or research use)

When using or redistributing this project:

- **Retain all credit statements** above.
- **Respect the most restrictive license in the chain** (GPL-3.0 from the original repo), unless you fully reimplement the SIFT detection/matching logic from scratch under another license.
- When publishing research or results, cite:
  - Lowe’s original SIFT paper
  - OpenCV (if used)
  - The original repository and any other libraries/tools you rely on.

---

## 8. Quick Command Summary

```bash
# Activate environment
source ~/sift_env/bin/activate              # Linux/macOS
# .\sift_env\Scripts\Activate.ps1           # Windows PowerShell

# Train from camera
python3 sift_db_train.py --mode train_live

# Train from images
python3 sift_db_train.py --mode train_files

# Detect from a single image
python3 sift_db_train.py --mode detect --test_img ../res/train/object_000.jpg

# Live detection
python3 sift_db_train.py --mode detect_live
```

Feel free to adjust object isolation, frame downscaling, or matching thresholds to trade off between speed and accuracy depending on your hardware and use case.
```
