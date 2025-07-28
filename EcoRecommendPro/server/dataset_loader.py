import csv
import json
import os
from datetime import datetime
from typing import Dict, List, Any

def load_csv_dataset(file_path: str) -> List[Dict[str, Any]]:
    """Load product data from CSV file."""
    products = []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            
            for row in reader:
                # Skip empty rows
                if not any(row.values()):
                    continue
                
                # Parse and clean the data
                product = {
                    'title': row.get('title', '').strip(),
                    'price': float(row.get('price', '0').replace('$', '').replace(',', '') or 0),
                    'text': row.get('text', '').strip(),
                    'category': row.get('category', '').strip(),
                    'main_category': row.get('main_category', '').strip(),
                    'average_rating': float(row.get('average_rating', '0') or 0),
                    'eco_score': float(row.get('eco-score', '0') or row.get('eco_score', '0') or 0),
                    'images': row.get('images', '').strip(),
                    'asin': row.get('asin', '').strip(),
                    'parent_asin': row.get('parent_asin', '').strip(),
                    'details': row.get('details', '{}'),
                    'age_target': row.get('age_target', '').strip(),
                    'gender_target': row.get('gender_target', '').strip(),
                }
                
                # Only include products with valid data
                if product['title'] and product['price'] > 0:
                    products.append(product)
                    
    except Exception as e:
        print(f"Error loading CSV: {e}")
        raise
    
    return products

def load_json_dataset(file_path: str) -> List[Dict[str, Any]]:
    """Load product data from JSON file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as jsonfile:
            data = json.load(jsonfile)
            
            # Handle different JSON structures
            if isinstance(data, list):
                return data
            elif isinstance(data, dict) and 'products' in data:
                return data['products']
            else:
                raise ValueError("Invalid JSON structure")
                
    except Exception as e:
        print(f"Error loading JSON: {e}")
        raise

def process_dataset(file_path: str) -> List[Dict[str, Any]]:
    """Process dataset file and return product data."""
    file_ext = os.path.splitext(file_path)[1].lower()
    
    if file_ext == '.csv':
        return load_csv_dataset(file_path)
    elif file_ext == '.json':
        return load_json_dataset(file_path)
    else:
        raise ValueError(f"Unsupported file format: {file_ext}")

def simulate_eco_scoring(products: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Simulate the hybrid eco-scoring strategy.
    In a real implementation, this would call Mistral-7B and LLaMA-2 APIs.
    """
    import random
    
    # Step 1: Score all products using Mistral-7B (simulated)
    for product in products:
        if not product.get('eco_score') or product['eco_score'] == 0:
            # Simulate Mistral-7B scoring based on product text
            text_keywords = ['eco', 'sustainable', 'organic', 'recycled', 'biodegradable', 'renewable', 'green', 'natural']
            text_lower = product['text'].lower()
            
            base_score = 20  # Base score
            for keyword in text_keywords:
                if keyword in text_lower:
                    base_score += random.randint(3, 8)
            
            product['mistral_eco_score'] = min(base_score, 50)
        else:
            product['mistral_eco_score'] = product['eco_score']
    
    # Step 2: Select top 5,000 products (or all if less than 5,000)
    sorted_products = sorted(products, key=lambda x: x['mistral_eco_score'], reverse=True)
    top_products = sorted_products[:5000]
    
    # Step 3: Re-score top products using LLaMA-2 (simulated)
    for product in top_products:
        # Simulate LLaMA-2 higher precision scoring
        mistral_score = product['mistral_eco_score']
        precision_adjustment = random.uniform(-5, 5)
        product['llama_eco_score'] = max(0, min(50, mistral_score + precision_adjustment))
        product['eco_score'] = product['llama_eco_score']
    
    # For products not in top 5,000, use Mistral score
    for product in sorted_products[5000:]:
        product['llama_eco_score'] = product['mistral_eco_score']
        product['eco_score'] = product['mistral_eco_score']
    
    return products

if __name__ == "__main__":
    # Example usage
    dataset_path = "attached_assets/eco_scored_products_20250717_092210_1752744453872.csv"
    products = process_dataset(dataset_path)
    scored_products = simulate_eco_scoring(products)
    
    print(f"Processed {len(scored_products)} products")
    print(f"Sample product: {scored_products[0] if scored_products else 'None'}")
