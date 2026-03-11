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
    
    # Convert to clean JSON response
    json_result = {
        "success": result.get('success', False),
        
        # QUERY IMAGE (the one being processed/uploaded)
        "query_image": {
            "original_source": result['query_image']['original_source'],
            "source_type": result['query_image']['source_type'],
            "saved_to_gdrive": result['query_image']['saved_to_gdrive'],
            "gdrive_file_id": result['query_image']['gdrive_file_id'],
            "gdrive_view_link": result['query_image']['gdrive_view_link']
        },
        
        # MATCHED IMAGE (from database)
        "matched_image": {
            "name": result['matched_image']['name'],
            "match_score": int(result.get('match_score', 0)),
            "source_url": result['matched_image']['source_url'],
            "source_type": result['matched_image']['source_type'],
            "gdrive_file_id": result['matched_image']['gdrive_file_id'],
            "gdrive_view_link": result['matched_image']['gdrive_view_link']
        },
        
        # All potential matches
        "all_matches": [
            {
                "name": m['name'],
                "score": int(m['score']),
                "source_url": m['source_url'],
                "source_type": m['source_type'],
                "gdrive_view_link": m.get('gdrive_view_link')
            }
            for m in result.get('all_matches', [])
        ],
        
        "error": result.get('error')
    }
    
    # Print summary
    print(f"\nRESULT SUMMARY:")
    print(f"   Success: {json_result['success']}")
    print(f"\n   QUERY IMAGE:")
    print(f"      Source: {json_result['query_image']['original_source'][:60]}...")
    print(f"      Type: {json_result['query_image']['source_type']}")
    print(f"      Saved to GDrive: {json_result['query_image']['saved_to_gdrive']}")
    if json_result['query_image'].get('gdrive_view_link'):
        print(f"      View Link: {json_result['query_image']['gdrive_view_link']}")
    
    print(f"\n   MATCHED IMAGE:")
    print(f"      Name: {json_result['matched_image']['name']}")
    print(f"      Score: {json_result['matched_image']['match_score']}")
    print(f"      Source URL: {json_result['matched_image'].get('source_url', 'N/A')}")
    print(f"      Source Type: {json_result['matched_image'].get('source_type', 'N/A')}")
    if json_result['matched_image'].get('gdrive_view_link'):
        print(f"      GDrive Link: {json_result['matched_image']['gdrive_view_link']}")
    
    return json_result