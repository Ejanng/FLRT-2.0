#!/usr/bin/env python3
"""
SIFT Database Training and Matching - Modified Version
Original: sift-detect.py from OpenGenus/SIFT-Scale-Invariant-Feature-Transform
Author: Original developers (kept all comments)
Modified: Added database training (live capture/upload), file input option
Date: 2026

Credits:
- SIFT Algorithm: David G. Lowe (2004) https://www.cs.ubc.ca/~lowe/papers/ijcv04.pdf
- OpenCV Implementation: https://opencv.org (Apache 2.0)
- Original Repo: https://github.com/OpenGenus/SIFT-Scale-Invariant-Feature-Transform (GPL-3.0)

Usage:
1. python3 sift_db_train.py  # Build database from live or files
2. python3 sift_detect_db.py  # Detect against trained database
"""

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
DB_FILE = "../res/sift_database.pkl"
IMAGE_DIR = "../res/train"

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

def build_database_live_capture():
    """
    Live capture with OBJECT ISOLATION: Press 's' to auto-crop object + save to database
    Background noise removed - only object recorded!
    """
    database = []
    os.makedirs(IMAGE_DIR, exist_ok=True)
    
    cap = cv2.VideoCapture(0)
    frame_count = 0
    
    print("🎯 Live Training Mode - OBJECT DETECTION + AUTO-CROP")
    print("Press 's' to isolate object and save to database, 'q' to quit")
    
    while True:
        ret, frame = cap.read()
        if not ret: 
            break
        
        # STEP 1: Pre-process for better segmentation
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (15, 15), 0)
        
        # STEP 2: Background subtraction + thresholding
        _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # STEP 3: Find object contours (largest non-background area)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if contours:
            # Get largest contour (main object)
            largest_contour = max(contours, key=cv2.contourArea)
            area = cv2.contourArea(largest_contour)
            
            if area > 1000:  # Minimum object size filter
                # STEP 4: Create bounding box with padding
                x, y, w, h = cv2.boundingRect(largest_contour)
                padding = 20
                x = max(0, x - padding)
                y = max(0, y - padding)
                w = min(frame.shape[1] - x, w + 2 * padding)
                h = min(frame.shape[0] - y, h + 2 * padding)
                
                # STEP 5: Crop ONLY the object
                object_roi = frame[y:y+h, x:x+w]
                
                # STEP 6: SIFT on isolated object
                gray_roi = cv2.cvtColor(object_roi, cv2.COLOR_BGR2GRAY)
                kp_roi, desc_roi = sift.detectAndCompute(gray_roi, None)
                
                # STEP 7: Visualize isolation + keypoints
                frame_display = frame.copy()
                cv2.rectangle(frame_display, (x, y), (x+w, y+h), (0, 255, 0), 3)
                cv2.putText(frame_display, f"Object Detected! Area: {area:.0f}", (10, 30), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                
                if kp_roi:
                    frame_kp = cv2.drawKeypoints(gray_roi, kp_roi, object_roi.copy(), (255, 0, 0), 4)
                    cv2.putText(frame_display, f"KP: {len(kp_roi)} | Press 's' to SAVE", (10, 60), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
                else:
                    cv2.putText(frame_display, "No SIFT features - move closer", (10, 60), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
                
                cv2.imshow('Live Training - OBJECT ISOLATION', frame_display)
                
                key = cv2.waitKey(1) & 0xFF
                if key == ord('s') and desc_roi is not None and len(desc_roi) > 20:
                    # AUTO-SAVE CROPPED OBJECT
                    img_name = f"object_{frame_count:03d}_{int(time.time())}.jpg"
                    save_path = f"{IMAGE_DIR}/{img_name}"
                    cv2.imwrite(save_path, object_roi)
                    
                    # ADD ISOLATED OBJECT TO DATABASE
                    extract_and_save_features(object_roi, img_name, database, is_frame=True)
                    
                    frame_count += 1
                    print(f"✅ OBJECT ISOLATED & SAVED: {save_path}")
                    print(f"   -> {len(desc_roi)} SIFT features extracted")
                    
                elif key == ord('q'):
                    break
            else:
                cv2.putText(frame_display, "Object too small - get closer", (10, 30), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
                cv2.imshow('Live Training - OBJECT ISOLATION', frame_display)
                cv2.waitKey(1)
        else:
            cv2.putText(frame, "No object detected", (10, 30), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            cv2.imshow('Live Training - OBJECT ISOLATION', frame)
            cv2.waitKey(1)
    
    cap.release()
    cv2.destroyAllWindows()
    
    os.makedirs(IMAGE_DIR, exist_ok=True)

    if database:
        cap.release()
        cv2.destroyAllWindows()
        
        os.makedirs(IMAGE_DIR, exist_ok=True)
        
        # ✅ FIXED: LOAD EXISTING + APPEND NEW
        existing_db = load_database()  # Load old objects
        existing_db.extend(database)    # Add new objects
        
        with open(DB_FILE, 'wb') as f:
            pickle.dump(existing_db, f)
        
        print(f"🎉 Database UPDATED: {DB_FILE} ({len(existing_db)} TOTAL objects)")
        print(f"📁 Latest images: {IMAGE_DIR}/")

        print(f"🎉 Clean database saved: {DB_FILE} ({len(database)} objects)")
        print(f"📁 Training images saved to: {IMAGE_DIR}/")
    else:
        print("⚠️ No objects trained - database empty")

    return database

def detect_from_database(test_img_path, database):

    """
    Detect/match test image against trained database
    """
    test_gray = cv2.imread(test_img_path, 0)
    kp_test, desc_test = sift.detectAndCompute(test_gray, None)
    
    if desc_test is None:
        print("No features in test image")
        return
    
    best_match = None
    best_good = 0
    best_img_name = None
    
    for img_name, kp_train, desc_train in database:
        matches = flann.knnMatch(desc_test, desc_train, k=2)
        
        # store all the good matches as per Lowe's ratio test.
        goodMatch = []
        for m,n in matches:
            if m.distance < 0.75*n.distance:
                goodMatch.append(m)
        
        # If enough matches are found, we extract the locations of matched keypoints 
        # in both the images. They are passed to find the perpective transformation.
        if len(goodMatch) > MIN_MATCH_COUNT:
            tp = []  # src_pts (train)
            qp = []  # dst_pts (test)
            for m in goodMatch:
                tp.append(kp_train[m.trainIdx].pt)
                qp.append(kp_test[m.queryIdx].pt)
            tp, qp = np.float32((tp, qp))
            
            H, status = cv2.findHomography(tp, qp, cv2.RANSAC, 3.0)
            
            if H is not None:
                h, w = test_gray.shape  # Note: swapped for outline
                train_outline = np.float32([[[0,0],[0,h-1],[w-1,h-1],[w-1,0]]])
                query_outline = cv2.perspectiveTransform(train_outline, H)
                
                # Display result
                test_color = cv2.cvtColor(test_gray, cv2.COLOR_GRAY2BGR)
                cv2.polylines(test_color, [np.int32(query_outline)], True, (0,255,0), 5)
                cv2.putText(test_color, f'Object Found: {img_name} ({len(goodMatch)} matches)', 
                           (50,50), cv2.FONT_HERSHEY_COMPLEX, 1, (0,255,0), 2)
                
                plt.imshow(cv2.cvtColor(test_color, cv2.COLOR_BGR2RGB))
                plt.title(f'Match Found: {img_name}')
                plt.show()
                
                best_match = test_color
                best_good = len(goodMatch)
                best_img_name = img_name
        
        print(f"'{img_name}': {len(goodMatch)} matches (need >{MIN_MATCH_COUNT})")
    
    if best_img_name:
        print(f"Best match: {best_img_name} ({best_good} matches)")
    else:
        print("No sufficient matches found in database")

def detect_live_from_database():
    """SIMPLE LIVE DETECTION - Like original SIFT demo"""
    database = load_database()
    if not database:
        print("❌ No database found! Train first: --mode train_live")
        return
    
    cap = cv2.VideoCapture(0)
    
    print("🔍 Live Detection - Press 'q' to quit")
    print(f"Database: {len(database)} objects")
    
    while True:
        ret, frame = cap.read()
        if not ret:
            print("Camera failed")
            break
        
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        kp, des = sift.detectAndCompute(gray, None)
        
        if des is not None:
            best_score = 0
            best_name = None
            best_matches = None
            
            for img_name, train_des in database:
                matches = flann.knnMatch(des, train_des, k=2)
                good = [m for m, n in matches if m.distance < 0.7*n.distance]
                
                if len(good) > MIN_MATCH_COUNT and len(good) > best_score:
                    best_score = len(good)
                    best_name = img_name
                    best_matches = good
            
            # DISPLAY LIKE ORIGINAL SIFT
            display = frame.copy()

            if best_name and best_matches:
                # ✅ SAFE BOUNDING BOX with error checking
                match_points = []
                for match in best_matches:
                    pt = kp[match.queryIdx].pt  # Get point safely
                    match_points.append(pt)
                
                # SAFETY CHECKS
                if len(match_points) > 10:
                    points = np.array(match_points, dtype=np.float32)  # ← FIXED dtype
                    if points.size > 0:
                        x, y, w, h = cv2.boundingRect(points)
                        # Clamp to frame bounds
                        x = max(0, x)
                        y = max(0, y)
                        w = min(w, frame.shape[1] - x)
                        h = min(h, frame.shape[0] - y)
                        
                        cv2.rectangle(display, (x, y), (x+w, y+h), (0, 255, 0), 3)
                        cv2.putText(display, f'{best_name} ({best_score} pts)', (x, y-10),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                    else:
                        cv2.putText(display, f'MATCH: {best_name} ({best_score} pts)', (10,30),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0,255,0), 2)
                else:
                    cv2.putText(display, f'MATCH: {best_name} ({best_score} pts)', (10,30),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0,255,0), 2)

            cv2.imshow('SIFT Live Detection (q=quit)', display)
        
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    
    cap.release()
    cv2.destroyAllWindows()

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
