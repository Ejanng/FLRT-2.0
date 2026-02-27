import time 
import cv2
import numpy as np
import matplotlib.pyplot as plt
import pickle
import os
import argparse

# Threshold 
MIN_MATCH_COUNT=30

# Initiate SIFT detector - Updated for modern OpenCV (post-3.4.2)
try:
    sift = cv2.SIFT_create()
except:
    sift = cv2.xfeatures2d.SIFT_create()  # Legacy fallback

# Create the Flann Matcher object
FLANN_INDEX_KDITREE=0
flannParam=dict(algorithm=FLANN_INDEX_KDITREE,tree=5)
flann=cv2.FlannBasedMatcher(flannParam,{})

# Database file
DB_FILE = "./res/sift_database.pkl"
IMAGE_DIR = "https://drive.google.com/drive/folders/1L67SDe_Tw0riFXWE_remlt0w0qfW-WGH?usp=sharing"  # Local directory for training images (can be changed to a URL or cloud storage path if needed)

def load_database():
    """Load existing database - FIXED for empty/corrupted files"""
    if os.path.exists(DB_FILE):
        try:
            # Check file size first
            if os.path.getsize(DB_FILE) == 0:
                print(f"⚠️ {DB_FILE} is empty - starting fresh")
                return []
            
            with open(DB_FILE, 'rb') as f:
                db = pickle.load(f)
                print(f"✅ Loaded database: {len(db)} objects")
                return db
        except (EOFError, pickle.UnpicklingError) as e:
            print(f"⚠️ Corrupted database {DB_FILE}: {e}")
            print("🔄 Starting fresh database")
            return []
    return []


def build_database_live_capture():
    pass


def extract_and_save_features(img_source, img_name, database, is_frame=False):
    """
    FIXED: Save ONLY descriptors (pickleable) - discard KeyPoints
    """
    if is_frame:
        gray = cv2.cvtColor(img_source, cv2.COLOR_BGR2GRAY)
    elif isinstance(img_source, str):
        gray = cv2.imread(img_source, 0)
    else:
        return
    
    kp, desc = sift.detectAndCompute(gray, None)
    
    if desc is not None and len(desc) > 0:
        # ✅ ONLY SAVE DESCRIPTORS (numpy array) - KeyPoints are NOT saved
        database.append((img_name, desc))
        print(f"✅ SAVED '{img_name}' to database ({len(desc)} descriptors)")
    else:
        print(f"⚠️ No features found in {img_name}")


def build_database_from_files(train_dir=IMAGE_DIR):
    """
    Build database from image files in folder
    """
    database = []
    if not os.path.exists(train_dir):
        os.makedirs(train_dir)
        print(f"Created {train_dir}. Add .jpg files there.")
        return database
    
    for img_file in os.listdir(train_dir):
        if img_file.lower().endswith(('.jpg', '.jpeg', '.png')):
            img_path = os.path.join(train_dir, img_file)
            extract_and_save_features(img_path, img_file, database)
    
    # Save database
    with open(DB_FILE, 'wb') as f:
        pickle.dump(database, f)
    print(f"Database saved: {DB_FILE} ({len(database)} images)")
    return database


def detect_from_database(test_img_path, database):
    """
    Detect/match test image against trained database
    """
    test_gray = cv2.imread(test_img_path, 0)
    if test_gray is None:
        print(f"❌ Could not load test image: {test_img_path}")
        return
        
    kp_test, desc_test = sift.detectAndCompute(test_gray, None)
    
    if desc_test is None:
        print("No features in test image")
        return
    
    best_match = None
    best_good = 0
    best_img_name = None
    
    # FIXED: Only unpack 2 values (img_name, desc_train) - no keypoints stored
    for img_name, desc_train in database:
        matches = flann.knnMatch(desc_test, desc_train, k=2)
        
        # store all the good matches as per Lowe's ratio test.
        goodMatch = []
        for m,n in matches:
            if m.distance < 0.75*n.distance:
                goodMatch.append(m)
        
        # SIMPLIFIED: Just count matches, skip homography (no keypoints stored)
        if len(goodMatch) > best_good:
            best_good = len(goodMatch)
            best_img_name = img_name
            best_match = goodMatch
        
        print(f"'{img_name}': {len(goodMatch)} matches (need >{MIN_MATCH_COUNT})")
    
    # Display result if we have enough matches
    if best_img_name and best_good > MIN_MATCH_COUNT:
        test_color = cv2.cvtColor(test_gray, cv2.COLOR_GRAY2BGR)
        cv2.putText(test_color, f'Best Match: {best_img_name}', 
                   (0,50), cv2.FONT_HERSHEY_COMPLEX, 0.75, (0,255,0), 2)
        cv2.putText(test_color, f'({best_good} matches)', 
                   (0,100), cv2.FONT_HERSHEY_COMPLEX, 1, (0,255,0), 2)
        
        
        plt.imshow(cv2.cvtColor(test_color, cv2.COLOR_BGR2RGB))
        plt.title(f'Match Found: {best_img_name}')
        plt.show()
        
        print(f"✅ Best match: {best_img_name} ({best_good} matches)")
    else:
        print("❌ No sufficient matches found in database")


def detect_live_from_database():
    pass

def main():
    parser = argparse.ArgumentParser(description="SIFT Database Training & Detection")
    parser.add_argument('--mode', choices=['train_live', 'train_files', 'detect', 'detect_live'], 
                       default='detect', help="Mode: train_live, train_files, detect, detect_live")
    parser.add_argument('--test_img', type=str, help="Test image path for detection")
    
    args = parser.parse_args()
    
    database = load_database()
    
    if args.mode == 'train_live':
        print("=== LIVE TRAINING MODE ===")
        build_database_live_capture()
    elif args.mode == 'train_files':
        print("=== FILE TRAINING MODE ===")
        build_database_from_files()
    elif args.mode == 'detect':
        if not database:
            print("❌ No database found. Train first: python3 src/sift_db_train.py --mode train_live")
            return
        if not args.test_img or not os.path.exists(args.test_img):
            print("❌ Provide test image: python3 src/sift_db_train.py --mode detect --test_img res/test.jpg")
            return
        print("=== DATABASE FILE DETECTION MODE ===")
        detect_from_database(args.test_img, database)
    elif args.mode == 'detect_live':
        print("=== LIVE DATABASE DETECTION MODE ===")
        detect_live_from_database()

if __name__ == "__main__":
    main()
