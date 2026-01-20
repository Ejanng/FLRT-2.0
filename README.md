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
## **Windows Installation**

### **Prerequisites**
```
Windows 10/11 (64-bit recommended)
Any webcam (built-in laptop camera works)
```

### **Step 1: Install Python 3**
1. Go to https://www.python.org/downloads/
2. Download **"Windows installer (64-bit)"** 
3. **IMPORTANT**: Check **"Add Python to PATH"** during installation
4. Click **"Install Now"**

### **Step 2: Create Project**
```cmd
REM Open Command Prompt as Administrator
mkdir C:\SIFT
cd C:\SIFT
```

### **Step 3: Setup Virtual Environment**
```cmd
REM Create virtual environment
python -m venv sift_env

REM Activate (Command Prompt)
sift_env\Scripts\activate.bat

REM Activate (PowerShell)
# sift_env\Scripts\Activate.ps1
```

### **Step 4: Install Dependencies**
```cmd
pip install --upgrade pip
pip install opencv-contrib-python==4.8.1.78 numpy matplotlib
```

### **Step 5: Create Folders**
```cmd
mkdir res
mkdir res\train
```

### **Step 6: Test Installation**
```cmd
REM Copy your sift_db_train.py to C:\SIFT\
python sift_db_train.py --mode detect_live
```

**Expected Output:**
```
✅ Loaded database: X objects
🔍 Live Detection - Press 'q' to quit
[Live camera window opens!]
```

---

## 🐧 **Linux Installation (Ubuntu/Debian)**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install python3 python3-pip python3-venv python3-opencv libopencv-dev v4l-utils -y

# Create project
mkdir ~/SIFT && cd ~/SIFT

# Setup virtual environment
python3 -m venv sift_env
source sift_env/bin/activate

# Install Python packages
pip install opencv-contrib-python==4.8.1.78 numpy matplotlib

# Create folders
mkdir -p res/train

# Test
python3 sift_db_train.py --mode detect_live
```

---

## 📱 **Quick Start Commands** (All OS)

```bash
# Activate environment (run every session)
# Windows: sift_env\Scripts\activate.bat
# Linux:   source sift_env/bin/activate

# 1. TRAIN objects from camera
python3 sift_db_train.py --mode train_live
# Press 's' to capture objects, 'q' to save database

# 2. LIVE DETECTION
python3 sift_db_train.py --mode detect_live
# Press 'q' to quit - shows matches with bounding boxes!

# 3. Test single image
python3 sift_db_train.py --mode detect --test_img res/train/object_000.jpg

# 4. Train from folder
python3 sift_db_train.py --mode train_files
```

---

## 🎮 **Controls**

**Training (`train_live`):**
- `s` = Capture & save current object to database
- `q` = Quit & save database

**Detection (`detect_live`):**
- `q` = Quit live detection

---

## 📁 **Files Created**

```
res/
├── train/                 # Training images (object_001.jpg, etc.)
└── sift_database.pkl      # SIFT feature database (persistent!)
```

---

## 🛠️ **Troubleshooting**

### **Camera not working**
```cmd
# Try camera index 1
# Edit: cap = cv2.VideoCapture(1)

# Windows: No permissions needed
# Linux: sudo usermod -a -G video $USER (then logout)
```

### **SIFT not found**
```cmd
pip uninstall opencv-contrib-python opencv-python
pip install opencv-contrib-python==4.8.1.78
```

### **Linux Wayland warnings**
```bash
QT_QPA_PLATFORM=xcb python3 sift_db_train.py --mode detect_live
```

### **Database overwritten**
Ensure `train_live` **appends** to existing database:
```python
existing_db = load_database()
existing_db.extend(new_objects)
pickle.dump(existing_db, f)
```

---

## 🎯 **Expected Results**

1. **Training**: Press `s` → `✅ SAVED 'object_001.jpg' (245 descriptors)`
2. **Detection**: Hold object → **GREEN BOX** + `"MATCH: object_001 (45 pts)"`
3. **Database**: Multiple runs → All objects preserved

---

## 📄 **License**

- **SIFT**: David G. Lowe (algorithm - cite paper for academic use)
- **OpenCV**: Apache 2.0
- **Base code**: GPL-3.0 (OpenGenus repo)
- **This wrapper**: MIT (modifications only)

**Retain all credits above when redistributing.**


