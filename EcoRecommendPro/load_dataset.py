import csv
import os
import json
import psycopg2

# Read the CSV file
dataset_path = 'attached_assets/eco_scored_products_20250717_092210_1752744453872.csv'

# Connect to PostgreSQL
conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor()

# Read and insert products
with open(dataset_path, 'r', encoding='utf-8') as csvfile:
    reader = csv.DictReader(csvfile)
    count = 0
    
    for row in reader:
        if not row.get('title') or not row.get('price'):
            continue
            
        # Clean price
        price = row.get('price', '0').replace('$', '').replace(',', '')
        try:
            price = float(price)
        except:
            price = 0.0
            
        # Clean eco-score with fallback calculation
        eco_score = row.get('eco-score', '') or row.get('eco_score', '') or '0'
        mistral_score = row.get('mistral_eco_score', '') or '0'
        llama_score = row.get('llama_eco_score', '') or '0'
        
        try:
            eco_score = float(eco_score) if eco_score else 0.0
            if eco_score == 0:
                # Use fallback calculation from mistral and llama scores
                mistral_val = float(mistral_score) if mistral_score else 0
                llama_val = float(llama_score) if llama_score else 0
                if mistral_val > 0 and llama_val > 0:
                    eco_score = (mistral_val + llama_val) / 2
                elif mistral_val > 0:
                    eco_score = mistral_val
                elif llama_val > 0:
                    eco_score = llama_val
        except (ValueError, TypeError):
            # Final fallback: calculate from product attributes
            eco_score = 0.0
            title_lower = row.get('title', '').lower()
            text_lower = row.get('text', '').lower()
            
            # Eco-friendly keywords scoring
            eco_keywords = {
                'organic': 15, 'recycled': 12, 'sustainable': 10, 'biodegradable': 15,
                'eco-friendly': 10, 'bamboo': 8, 'solar': 12, 'zero-waste': 10,
                'compostable': 12, 'renewable': 8, 'natural': 5, 'plant-based': 8,
                'carbon-neutral': 15, 'bpa-free': 5, 'reusable': 8, 'hemp': 6,
                'cork': 6, 'wheat straw': 8, 'coconut': 4, 'jute': 6, 'linen': 4
            }
            
            for keyword, score in eco_keywords.items():
                if keyword in title_lower or keyword in text_lower:
                    eco_score += score
            
            # Cap the score at 100
            eco_score = min(eco_score, 100)
            
        # Debug: Print eco-score for first few products
        if count < 3:
            print(f"[DEBUG] Product {count}: eco-score = {eco_score}, title = {row.get('title', '')[:50]}")
            
        # Clean average rating
        avg_rating = row.get('average_rating', '')
        try:
            avg_rating = float(avg_rating) if avg_rating else None
        except:
            avg_rating = None
        
        try:
            cur.execute('''
                INSERT INTO products (title, price, text, category, main_category, average_rating, eco_score, images, asin, parent_asin, details, age_target, gender_target)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT DO NOTHING
            ''', (
                row.get('title', ''),
                price,
                row.get('text', ''),
                row.get('category', ''),
                row.get('main_category', ''),
                avg_rating,
                eco_score,
                row.get('images', ''),
                row.get('asin', ''),
                row.get('parent_asin', ''),
                json.dumps({}),
                row.get('age', ''),
                row.get('gender', '')
            ))
            count += 1
            
        except Exception as e:
            print(f"Error inserting row: {e}")
            continue

conn.commit()
cur.close()
conn.close()

print(f'Successfully loaded {count} products into database')