import sift.algorithm as sift


def process_image(gdrive_url):
    database = sift.load_database()
    if not database:
        print("❌ No database found. Please run in training mode first.")
        return
    
    result = sift.detect_from_database(gdrive_url, database)
    return result
