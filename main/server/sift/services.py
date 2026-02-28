import sift.algorithm as sift

def train_model(gdrive_url):
    database = sift.load_database()
    if database:
        print("⚠️ Database already exists. Training will overwrite the existing database.")
    
    result = sift.build_database_from_gdrive(gdrive_url)
    
    # Return JSON-serializable response (not the raw database)
    return {
        "success": True,
        "message": "Training completed successfully",
        "images_processed": len(result),
        "database_location": sift.DB_FILE
    }

def process_image(image_url):
    GDRIVE_FOLDER_ID = "1qtyquqQntdIu9FU8nnu-cmWkL6Lt1oXm"

    database = sift.load_database()

    if not database:
        return {"error": "Database not found. Please train the model first."}
    
    result = sift.detect_from_database(image_url, database, GDRIVE_FOLDER_ID)
    
    # Convert result to JSON-serializable format
    json_result = {
        "success": result.get('success', False),
        "best_match": result.get('best_match'),
        "match_score": int(result.get('match_score', 0)),  # Ensure int
        "saved_to_gdrive": result.get('saved_to_gdrive', False),
        "gdrive_file_id": result.get('gdrive_file_id'),
        "gdrive_view_link": result.get('gdrive_view_link'),
        "error": result.get('error')
    }
    
    # Convert all_matches to serializable format if present
    if 'all_matches' in result:
        json_result['all_matches'] = [
            {"name": name, "score": int(score)} 
            for name, score in result['all_matches']
        ]
    
    print(f"\n📋 RESULT SUMMARY:")
    print(f"   Success: {json_result['success']}")
    print(f"   Best Match: {json_result['best_match']}")
    print(f"   Score: {json_result['match_score']}")
    print(f"   Saved to GDrive: {json_result['saved_to_gdrive']}")
    if json_result.get('gdrive_file_id'):
        print(f"   GDrive File ID: {json_result['gdrive_file_id']}")
        print(f"   View Link: {json_result.get('gdrive_view_link', 'N/A')}")
    
    return json_result