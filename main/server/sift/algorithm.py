import cv2
import numpy as np
import matplotlib.pyplot as plt
import pickle
import os
import argparse
import requests
import re
from io import BytesIO
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

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
IMAGE_DIR = "./res/train"
GDRIVE_CREDENTIALS = "./res/credentials.json"  # Service account JSON key

def extract_gdrive_file_id(url):
    """
    Extract Google Drive file ID from various URL formats
    """
    if not url or not isinstance(url, str):
        return None
    
    # Pattern 1: https://drive.google.com/file/d/FILE_ID/view
    pattern1 = r'/file/d/([a-zA-Z0-9_-]+)'
    match = re.search(pattern1, url)
    if match:
        return match.group(1)
    
    # Pattern 2: https://drive.google.com/open?id=FILE_ID
    pattern2 = r'[?&]id=([a-zA-Z0-9_-]+)'
    match = re.search(pattern2, url)
    if match:
        return match.group(1)
    
    # Pattern 3: https://drive.google.com/uc?id=FILE_ID
    pattern3 = r'uc\?.*?id=([a-zA-Z0-9_-]+)'
    match = re.search(pattern3, url)
    if match:
        return match.group(1)
    
    # If it's just the ID itself (no URL)
    if re.match(r'^[a-zA-Z0-9_-]{20,}$', url):
        return url
    
    return None

def convert_to_direct_download(url):
    """
    Convert any Google Drive sharing URL to direct download URL
    """
    file_id = extract_gdrive_file_id(url)
    if file_id:
        return f"https://drive.google.com/uc?export=download&id={file_id}"
    return None

def get_drive_service():
    """Authenticate and return Google Drive service"""
    if not os.path.exists(GDRIVE_CREDENTIALS):
        raise FileNotFoundError(f"❌ Credentials not found: {GDRIVE_CREDENTIALS}. "
                               f"Download from Google Cloud Console and place in ./res/")
    
    creds = service_account.Credentials.from_service_account_file(
        GDRIVE_CREDENTIALS,
        scopes=['https://www.googleapis.com/auth/drive.readonly']
    )
    return build('drive', 'v3', credentials=creds)

def extract_folder_id(folder_url):
    """Extract folder ID from various Google Drive URL formats"""
    if '/folders/' in folder_url:
        return folder_url.split('/folders/')[1].split('?')[0].split('/')[0]
    elif 'id=' in folder_url:
        return folder_url.split('id=')[1].split('&')[0]
    return folder_url  # Assume it's already an ID

def list_images_in_folder(service, folder_id):
    """List all image files in a Google Drive folder"""
    query = (f"'{folder_id}' in parents and "
             f"(mimeType contains 'image/jpeg' or mimeType contains 'image/png') "
             f"and trashed=false")
    
    results = service.files().list(
        q=query,
        fields="files(id, name, mimeType, size)",
        pageSize=1000
    ).execute()
    
    return results.get('files', [])

def download_image_from_drive(service, file_id):
    """Download image from Drive and return as OpenCV image (numpy array)"""
    try:
        request = service.files().get_media(fileId=file_id)
        fh = BytesIO()
        downloader = MediaIoBaseDownload(fh, request)
        
        done = False
        while not done:
            status, done = downloader.next_chunk()
        
        fh.seek(0)
        img_array = np.frombuffer(fh.read(), np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_GRAYSCALE)
        return img
    except Exception as e:
        print(f"⚠️ Failed to download image {file_id}: {e}")
        return None

def load_image_from_source(source):
    """
    Load image from local path, URL, or Google Drive sharing link
    Returns: (image_array, source_type)
    """
    if not source:
        raise ValueError("No source provided")
    
    print(f"📂 Loading from: {source[:80]}...")
    
    # Check if it's a Google Drive URL
    gdrive_file_id = extract_gdrive_file_id(source)
    
    if gdrive_file_id and 'drive.google.com' in source:
        print(f"🔍 Detected Google Drive file ID: {gdrive_file_id}")
        
        # Method 1: Try direct download URL first (fastest, no API needed)
        direct_url = f"https://drive.google.com/uc?export=download&id={gdrive_file_id}"
        print(f"⬇️ Trying direct download...")
        
        try:
            # Use session to handle redirects
            session = requests.Session()
            response = session.get(direct_url, timeout=30, allow_redirects=True)
            
            # Check if we got a confirmation page (large file warning)
            if 'confirm' in response.url or 'downloadWarning' in response.text:
                # Extract confirm token
                for key, value in response.cookies.items():
                    if 'download' in key.lower():
                        confirm_url = f"{direct_url}&confirm={value}"
                        response = session.get(confirm_url, timeout=30)
                        break
            
            response.raise_for_status()
            
            # Check if we got HTML instead of image
            if 'text/html' in response.headers.get('content-type', ''):
                raise Exception("Got HTML page instead of image (file may be too large or private)")
            
            img_array = np.frombuffer(response.content, np.uint8)
            img = cv2.imdecode(img_array, cv2.IMREAD_GRAYSCALE)
            
            if img is not None:
                print(f"✅ Successfully loaded via direct download")
                return img, 'gdrive_direct'
            else:
                raise Exception("Could not decode image")
                
        except Exception as e:
            print(f"⚠️ Direct download failed: {e}")
            
            # Method 2: Try Google Drive API if credentials exist
            if os.path.exists(GDRIVE_CREDENTIALS):
                print(f"🔐 Trying Google Drive API...")
                try:
                    service = get_drive_service()
                    img = download_image_from_drive(service, gdrive_file_id)
                    if img is not None:
                        print(f"✅ Successfully loaded via Drive API")
                        return img, 'gdrive_api'
                except Exception as api_e:
                    print(f"⚠️ Drive API failed: {api_e}")
    
    # Handle regular HTTP/HTTPS URLs
    if source.startswith(('http://', 'https://')):
        print(f"⬇️ Downloading from URL...")
        try:
            response = requests.get(source, timeout=30)
            response.raise_for_status()
            img_array = np.frombuffer(response.content, np.uint8)
            img = cv2.imdecode(img_array, cv2.IMREAD_GRAYSCALE)
            if img is not None:
                print(f"✅ Successfully loaded from URL")
                return img, 'url'
            else:
                raise Exception("Could not decode image from URL")
        except Exception as e:
            raise Exception(f"Failed to download from URL: {e}")
    
    # Handle local files
    print(f"📁 Loading local file...")
    img = cv2.imread(source, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise FileNotFoundError(f"Could not load local image: {source}")
    print(f"✅ Successfully loaded local file")
    return img, 'local'

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

def extract_and_save_features(img_source, img_name, database, is_frame=False, is_array=False):
    """
    Extract SIFT features and save to database
    img_source: can be file path, frame, or numpy array
    """
    try:
        if is_frame or is_array:
            if len(img_source.shape) == 3:
                gray = cv2.cvtColor(img_source, cv2.COLOR_BGR2GRAY)
            else:
                gray = img_source
        elif isinstance(img_source, str):
            gray = cv2.imread(img_source, cv2.IMREAD_GRAYSCALE)
        else:
            return False
        
        if gray is None:
            print(f"⚠️ Could not load image: {img_name}")
            return False
        
        kp, desc = sift.detectAndCompute(gray, None)
        
        if desc is not None and len(desc) > 0:
            # ✅ ONLY SAVE DESCRIPTORS (numpy array) - KeyPoints are NOT saved
            database.append((img_name, desc))
            print(f"✅ SAVED '{img_name}' to database ({len(desc)} descriptors)")
            return True
        else:
            print(f"⚠️ No features found in {img_name}")
            return False
            
    except Exception as e:
        print(f"❌ Error processing {img_name}: {e}")
        return False

def build_database_from_files(train_dir=IMAGE_DIR):
    """
    Build database from local image files in folder
    """
    database = []
    if not os.path.exists(train_dir):
        os.makedirs(train_dir)
        print(f"📁 Created {train_dir}. Add .jpg/.png files there.")
        return database
    
    image_files = [f for f in os.listdir(train_dir) 
                   if f.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp', '.tiff'))]
    
    if not image_files:
        print(f"⚠️ No images found in {train_dir}")
        return database
    
    print(f"📸 Found {len(image_files)} images in local folder")
    
    for img_file in image_files:
        img_path = os.path.join(train_dir, img_file)
        extract_and_save_features(img_path, img_file, database)
    
    # Save database
    if database:
        with open(DB_FILE, 'wb') as f:
            pickle.dump(database, f)
        print(f"💾 Database saved: {DB_FILE} ({len(database)} images)")
    
    return database

def build_database_from_gdrive(folder_url):
    """
    Build database directly from Google Drive folder (no local download)
    """
    database = []
    
    try:
        print("🔐 Authenticating with Google Drive...")
        service = get_drive_service()
        
        folder_id = extract_folder_id(folder_url)
        print(f"📂 Folder ID: {folder_id}")
        
        print("🔍 Listing images in folder...")
        images = list_images_in_folder(service, folder_id)
        
        if not images:
            print("⚠️ No images found in folder. Check if folder is shared with service account.")
            return database
        
        print(f"📸 Found {len(images)} images in Google Drive folder")
        
        for idx, img_file in enumerate(images, 1):
            print(f"\n[{idx}/{len(images)}] Processing: {img_file['name']}")
            
            # Download image to memory
            img = download_image_from_drive(service, img_file['id'])
            
            if img is not None:
                extract_and_save_features(img, img_file['name'], database, is_array=True)
        
        # Save database locally
        if database:
            with open(DB_FILE, 'wb') as f:
                pickle.dump(database, f)
            print(f"\n💾 Database saved: {DB_FILE} ({len(database)} images)")
        
    except Exception as e:
        print(f"❌ Google Drive error: {e}")
        print("💡 Make sure you've:")
        print("   1. Enabled Google Drive API in Cloud Console")
        print("   2. Downloaded service account JSON to ./res/credentials.json")
        print("   3. Shared the Drive folder with the service account email")
    
    return database

def build_database_from_url(image_url):
    """
    Build database from a single image URL (http/https)
    """
    database = []
    
    try:
        img, source_type = load_image_from_source(image_url)
        
        if img is not None:
            img_name = os.path.basename(image_url.split('?')[0]) or "url_image.jpg"
            if extract_and_save_features(img, img_name, database, is_array=True):
                # Save single image database
                with open(DB_FILE, 'wb') as f:
                    pickle.dump(database, f)
                print(f"💾 Database saved: {DB_FILE}")
        else:
            print("❌ Could not decode image from URL")
            
    except Exception as e:
        print(f"❌ Error: {e}")

def detect_from_database(test_img_source, database):
    """
    Detect/match test image against trained database
    Supports: local path, URL, Google Drive sharing link
    """
    try:
        test_gray, source_type = load_image_from_source(test_img_source)
    except Exception as e:
        print(f"❌ Could not load test image: {e}")
        return
        
    kp_test, desc_test = sift.detectAndCompute(test_gray, None)
    
    if desc_test is None:
        print("⚠️ No features in test image")
        return
    
    best_match = None
    best_good = 0
    best_img_name = None
    all_matches = []
    
    print(f"\n🔍 Matching against {len(database)} database images...")
    
    for img_name, desc_train in database:
        matches = flann.knnMatch(desc_test, desc_train, k=2)
        
        # Lowe's ratio test
        goodMatch = []
        for m, n in matches:
            if m.distance < 0.75 * n.distance:
                goodMatch.append(m)
        
        all_matches.append((img_name, len(goodMatch)))
        
        if len(goodMatch) > best_good:
            best_good = len(goodMatch)
            best_img_name = img_name
            best_match = goodMatch
    
    # Sort and show top 5 matches
    all_matches.sort(key=lambda x: x[1], reverse=True)
    print(f"\n📊 Top matches:")
    for name, count in all_matches[:5]:
        status = "✅" if count > MIN_MATCH_COUNT else "❌"
        print(f"   {status} {name}: {count} matches")
    
    # Display result if we have enough matches
    if best_img_name and best_good > MIN_MATCH_COUNT:
        test_color = cv2.cvtColor(test_gray, cv2.COLOR_GRAY2BGR)
        
        # Add text with background for visibility
        text = f'Match: {best_img_name}'
        (text_width, text_height), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_COMPLEX, 1, 2)
        
        cv2.rectangle(test_color, (10, 10), (10 + text_width, 40), (0, 0, 0), -1)
        cv2.putText(test_color, text, (10, 35), 
                   cv2.FONT_HERSHEY_COMPLEX, 1, (0, 255, 0), 2)
        
        cv2.putText(test_color, f'Score: {best_good} matches', 
                   (10, 80), cv2.FONT_HERSHEY_COMPLEX, 0.7, (0, 255, 0), 2)
        
        plt.figure(figsize=(10, 8))
        plt.imshow(cv2.cvtColor(test_color, cv2.COLOR_BGR2RGB))
        plt.title(f'Best Match: {best_img_name} ({best_good} matches)')
        plt.axis('off')
        plt.tight_layout()
        plt.show()
        
        print(f"\n🎯 RESULT: Best match is '{best_img_name}' with {best_good} matches")
    else:
        print(f"\n❌ No sufficient matches found (best was {best_good}, need >{MIN_MATCH_COUNT})")

def build_database_live_capture():
    """Interactive live capture mode (placeholder)"""
    print("📷 Live capture mode not implemented yet")
    print("Planned: Open webcam, press 's' to save frame, 'q' to quit")

def detect_live_from_database():
    """Live detection from webcam (placeholder)"""
    print("📹 Live detection mode not implemented yet")
    print("Planned: Continuous webcam feed with real-time matching")

def main():
    parser = argparse.ArgumentParser(description="SIFT Database Training & Detection")
    parser.add_argument('--mode', choices=['train_local', 'train_gdrive', 'train_url', 'detect', 'detect_live'], 
                       default='detect', help="Mode: train_local, train_gdrive, train_url, detect, detect_live")
    parser.add_argument('--source', type=str, 
                       help="Source: local folder path, GDrive URL, or image URL")
    parser.add_argument('--test_img', type=str, help="Test image path/URL for detection")
    
    args = parser.parse_args()
    
    database = load_database()
    
    if args.mode == 'train_local':
        print("=== LOCAL TRAINING MODE ===")
        source = args.source or IMAGE_DIR
        build_database_from_files(source)
        
    elif args.mode == 'train_gdrive':
        print("=== GOOGLE DRIVE TRAINING MODE ===")
        if not args.source:
            print("❌ Provide GDrive folder URL: --source 'https://drive.google.com/drive/folders/...'")
            return
        build_database_from_gdrive(args.source)
        
    elif args.mode == 'train_url':
        print("=== URL TRAINING MODE ===")
        if not args.source:
            print("❌ Provide image URL: --source 'https://example.com/image.jpg'")
            return
        build_database_from_url(args.source)
        
    elif args.mode == 'detect':
        if not database:
            print("❌ No database found. Train first!")
            print("   Local:  python sift_db.py --mode train_local")
            print("   GDrive: python sift_db.py --mode train_gdrive --source <folder_url>")
            return
        
        test_img = args.test_img or args.source
        if not test_img:
            print("❌ Provide test image: --test_img path_or_url_to_image.jpg")
            return
            
        print("=== DETECTION MODE ===")
        detect_from_database(test_img, database)
        
    elif args.mode == 'detect_live':
        print("=== LIVE DETECTION MODE ===")
        detect_live_from_database()

if __name__ == "__main__":
    main()

    
# format for detect mode: source
# https://drive.google.com/uc?export=view&id=1oDnAuXpacSEt4EntxJA_JGH3oHMQoI43