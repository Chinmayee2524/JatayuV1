
#!/usr/bin/env python3
import sys
import json
import os
from typing import List, Dict, Any, Optional
import random

class RecommendationEngine:
    """
    Recommendation engine for eco-friendly products.
    Implements cold-start and personalized recommendation strategies.
    """
    
    def __init__(self, products_data: List[Dict[str, Any]]):
        self.products = products_data
    
    def get_cold_start_recommendations(self, user_age: int, user_gender: str, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Get recommendations for new users based on demographics.
        """
        # Filter and score products based on demographics
        scored_products = []
        for product in self.products:
            score = self._calculate_demographic_score(product, user_age, user_gender)
            if score > 0:
                scored_products.append({
                    **product,
                    'recommendation_score': score
                })
        
        # Sort by recommendation score and eco score
        scored_products.sort(key=lambda x: (x['recommendation_score'], float(x.get('ecoScore', 0))), reverse=True)
        
        return scored_products[:limit]
    
    def get_personalized_recommendations(self, user_data: Dict[str, Any], limit: int = 20) -> List[Dict[str, Any]]:
        """
        Get personalized recommendations based on user activity.
        """
        user_age = user_data.get('age', 25)
        user_gender = user_data.get('gender', 'male')
        cart_items = user_data.get('cart_items', [])
        wishlist_items = user_data.get('wishlist_items', [])
        viewed_products = user_data.get('viewed_products', [])
        
        # Extract preferences from user activity
        preferences = self._extract_user_preferences(cart_items, wishlist_items, viewed_products)
        
        # Score products based on preferences and demographics
        scored_products = []
        for product in self.products:
            # Skip products already in cart or wishlist
            if self._is_product_in_activity(product['id'], cart_items, wishlist_items):
                continue
            
            score = self._calculate_personalized_score(product, preferences, user_age, user_gender)
            if score > 0:
                scored_products.append({
                    **product,
                    'recommendation_score': score
                })
        
        # Sort by recommendation score
        scored_products.sort(key=lambda x: x['recommendation_score'], reverse=True)
        
        return scored_products[:limit]
    
    def _calculate_demographic_score(self, product: Dict[str, Any], user_age: int, user_gender: str) -> float:
        """
        Calculate recommendation score based on demographics.
        """
        score = 0.0
        
        # Base score from eco score
        score += float(product.get('ecoScore', 0)) * 0.6
        
        category = product.get('category', '').lower()
        title = product.get('title', '').lower()
        text = product.get('text', '').lower()
        
        # Age-based scoring
        if user_age < 25:
            # Younger users prefer tech, fashion, sports
            if any(keyword in category or keyword in title for keyword in ['electronics', 'fashion', 'sports', 'tech', 'gadget']):
                score += 15
            if any(keyword in text for keyword in ['portable', 'travel', 'compact', 'modern']):
                score += 5
        elif user_age < 40:
            # Middle-aged users prefer home, kitchen, outdoor
            if any(keyword in category for keyword in ['home', 'kitchen', 'outdoor', 'garden']):
                score += 15
            if any(keyword in text for keyword in ['family', 'home', 'kitchen', 'cooking']):
                score += 5
        else:
            # Older users prefer health, home improvement, garden
            if any(keyword in category for keyword in ['health', 'improvement', 'garden', 'wellness']):
                score += 15
            if any(keyword in text for keyword in ['comfort', 'health', 'wellness', 'garden']):
                score += 5
        
        # Gender-based scoring (mild preference)
        if user_gender == 'female':
            if any(keyword in category or keyword in title for keyword in ['beauty', 'fashion', 'home', 'personal care']):
                score += 8
        elif user_gender == 'male':
            if any(keyword in category or keyword in title for keyword in ['tools', 'automotive', 'sports', 'tech']):
                score += 8
        
        return max(0, score)
    
    def _extract_user_preferences(self, cart_items: List[Dict], wishlist_items: List[Dict], viewed_products: List[Dict]) -> Dict[str, Any]:
        """
        Extract user preferences from activity data.
        """
        preferences = {
            'preferred_categories': {},
            'price_range': {'min': 0, 'max': 1000},
            'eco_score_threshold': 0,
            'keywords': []
        }
        
        all_products = []
        
        # Collect all interacted products
        for item in cart_items:
            if 'product' in item:
                all_products.append(item['product'])
        
        for item in wishlist_items:
            if 'product' in item:
                all_products.append(item['product'])
        
        all_products.extend(viewed_products)
        
        if not all_products:
            return preferences
        
        # Extract category preferences
        for product in all_products:
            category = product.get('category', '')
            preferences['preferred_categories'][category] = preferences['preferred_categories'].get(category, 0) + 1
        
        # Extract price range preferences
        prices = [float(p.get('price', 0)) for p in all_products if p.get('price')]
        if prices:
            preferences['price_range']['min'] = min(prices) * 0.8
            preferences['price_range']['max'] = max(prices) * 1.2
        
        # Extract eco score threshold
        eco_scores = [float(p.get('ecoScore', 0)) for p in all_products if p.get('ecoScore')]
        if eco_scores:
            preferences['eco_score_threshold'] = sum(eco_scores) / len(eco_scores) * 0.8
        
        # Extract keywords from product texts
        for product in all_products:
            text = product.get('text', '')
            if text:
                words = text.lower().split()
                preferences['keywords'].extend(words[:10])  # Limit to avoid too many keywords
        
        return preferences
    
    def _calculate_personalized_score(self, product: Dict[str, Any], preferences: Dict[str, Any], user_age: int, user_gender: str) -> float:
        """
        Calculate personalized recommendation score.
        """
        score = 0.0
        
        # Base demographic score
        score += self._calculate_demographic_score(product, user_age, user_gender) * 0.4
        
        # Category preference score
        category = product.get('category', '')
        if category in preferences['preferred_categories']:
            score += preferences['preferred_categories'][category] * 8
        
        # Price range preference
        price = float(product.get('price', 0))
        if preferences['price_range']['min'] <= price <= preferences['price_range']['max']:
            score += 20
        
        # Eco score preference
        eco_score = float(product.get('ecoScore', 0))
        if eco_score >= preferences['eco_score_threshold']:
            score += 15
        
        # Keyword matching
        product_text = product.get('text', '').lower()
        keyword_matches = sum(1 for keyword in preferences['keywords'] if keyword in product_text)
        score += keyword_matches * 1.5
        
        return max(0, score)
    
    def _is_product_in_activity(self, product_id: int, cart_items: List[Dict], wishlist_items: List[Dict]) -> bool:
        """
        Check if product is already in user's cart or wishlist.
        """
        for item in cart_items:
            if item.get('product', {}).get('id') == product_id:
                return True
        
        for item in wishlist_items:
            if item.get('product', {}).get('id') == product_id:
                return True
        
        return False

def main():
    try:
        # Read input from stdin
        input_data = json.loads(sys.stdin.read())
        
        products = input_data['products']
        recommendation_type = input_data['type']
        user_data = input_data.get('user_data', {})
        limit = input_data.get('limit', 20)
        
        engine = RecommendationEngine(products)
        
        if recommendation_type == 'cold_start':
            user_age = user_data.get('age', 25)
            user_gender = user_data.get('gender', 'male')
            recommendations = engine.get_cold_start_recommendations(user_age, user_gender, limit)
        elif recommendation_type == 'personalized':
            recommendations = engine.get_personalized_recommendations(user_data, limit)
        else:
            recommendations = []
        
        print(json.dumps(recommendations))
        
    except Exception as e:
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
