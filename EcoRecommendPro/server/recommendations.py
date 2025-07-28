from typing import List, Dict, Any, Optional
import random
from datetime import datetime, timedelta

class RecommendationEngine:
    """
    Recommendation engine for eco-friendly products.
    Implements cold-start and personalized recommendation strategies.
    """
    
    def __init__(self, storage):
        self.storage = storage
    
    async def get_cold_start_recommendations(self, user_age: int, user_gender: str, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Get recommendations for new users based on demographics.
        """
        # Get products suitable for user's age and gender
        products = await self.storage.getProducts(limit=100)
        
        # Filter and score products based on demographics
        scored_products = []
        for product in products:
            score = self._calculate_demographic_score(product, user_age, user_gender)
            if score > 0:
                scored_products.append({
                    **product,
                    'recommendation_score': score
                })
        
        # Sort by recommendation score and eco score
        scored_products.sort(key=lambda x: (x['recommendation_score'], x['eco_score']), reverse=True)
        
        return scored_products[:limit]
    
    async def get_personalized_recommendations(self, user_id: int, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Get personalized recommendations based on user activity.
        """
        user = await self.storage.getUser(user_id)
        if not user:
            return []
        
        # Get user's activity data
        cart_items = await self.storage.getCartItems(user_id)
        wishlist_items = await self.storage.getWishlistItems(user_id)
        viewed_products = await self.storage.getViewedProducts(user_id, limit=50)
        
        # Extract preferences from user activity
        preferences = self._extract_user_preferences(cart_items, wishlist_items, viewed_products)
        
        # Get candidate products
        products = await self.storage.getProducts(limit=200)
        
        # Score products based on preferences and demographics
        scored_products = []
        for product in products:
            # Skip products already in cart or wishlist
            if self._is_product_in_activity(product['id'], cart_items, wishlist_items):
                continue
            
            score = self._calculate_personalized_score(product, preferences, user.age, user.gender)
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
        score += float(product.get('eco_score', 0)) * 0.6
        
        # Age-based scoring
        if user_age < 25:
            # Younger users prefer tech, fashion, sports
            if any(keyword in product['category'].lower() for keyword in ['electronics', 'fashion', 'sports']):
                score += 10
        elif user_age < 40:
            # Middle-aged users prefer home, kitchen, outdoor
            if any(keyword in product['category'].lower() for keyword in ['home', 'kitchen', 'outdoor', 'garden']):
                score += 10
        else:
            # Older users prefer health, home improvement, garden
            if any(keyword in product['category'].lower() for keyword in ['health', 'improvement', 'garden']):
                score += 10
        
        # Gender-based scoring (mild preference)
        if user_gender == 'female':
            if any(keyword in product['category'].lower() for keyword in ['beauty', 'fashion', 'home']):
                score += 5
        elif user_gender == 'male':
            if any(keyword in product['category'].lower() for keyword in ['tools', 'automotive', 'sports']):
                score += 5
        
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
            all_products.append(item['product'])
        
        for item in wishlist_items:
            all_products.append(item['product'])
        
        all_products.extend(viewed_products)
        
        if not all_products:
            return preferences
        
        # Extract category preferences
        for product in all_products:
            category = product['category']
            preferences['preferred_categories'][category] = preferences['preferred_categories'].get(category, 0) + 1
        
        # Extract price range preferences
        prices = [float(p['price']) for p in all_products]
        if prices:
            preferences['price_range']['min'] = min(prices) * 0.8
            preferences['price_range']['max'] = max(prices) * 1.2
        
        # Extract eco score threshold
        eco_scores = [float(p['eco_score']) for p in all_products]
        if eco_scores:
            preferences['eco_score_threshold'] = sum(eco_scores) / len(eco_scores) * 0.8
        
        # Extract keywords from product texts
        for product in all_products:
            words = product['text'].lower().split()
            preferences['keywords'].extend(words)
        
        return preferences
    
    def _calculate_personalized_score(self, product: Dict[str, Any], preferences: Dict[str, Any], user_age: int, user_gender: str) -> float:
        """
        Calculate personalized recommendation score.
        """
        score = 0.0
        
        # Base demographic score
        score += self._calculate_demographic_score(product, user_age, user_gender) * 0.3
        
        # Category preference score
        category = product['category']
        if category in preferences['preferred_categories']:
            score += preferences['preferred_categories'][category] * 5
        
        # Price range preference
        price = float(product['price'])
        if preferences['price_range']['min'] <= price <= preferences['price_range']['max']:
            score += 15
        
        # Eco score preference
        eco_score = float(product['eco_score'])
        if eco_score >= preferences['eco_score_threshold']:
            score += 10
        
        # Keyword matching
        product_text = product['text'].lower()
        keyword_matches = sum(1 for keyword in preferences['keywords'] if keyword in product_text)
        score += keyword_matches * 2
        
        return max(0, score)
    
    def _is_product_in_activity(self, product_id: int, cart_items: List[Dict], wishlist_items: List[Dict]) -> bool:
        """
        Check if product is already in user's cart or wishlist.
        """
        for item in cart_items:
            if item['product']['id'] == product_id:
                return True
        
        for item in wishlist_items:
            if item['product']['id'] == product_id:
                return True
        
        return False
    
    async def get_search_recommendations(self, query: str, user_id: Optional[int] = None, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get search results with personalized ranking.
        """
        # Get base search results
        products = await self.storage.searchProducts(query, limit=limit * 2)
        
        if not user_id:
            # For anonymous users, just return by eco score
            return sorted(products, key=lambda x: x['eco_score'], reverse=True)[:limit]
        
        # For logged-in users, personalize the results
        user = await self.storage.getUser(user_id)
        if not user:
            return products[:limit]
        
        # Get user preferences
        cart_items = await self.storage.getCartItems(user_id)
        wishlist_items = await self.storage.getWishlistItems(user_id)
        viewed_products = await self.storage.getViewedProducts(user_id, limit=20)
        
        preferences = self._extract_user_preferences(cart_items, wishlist_items, viewed_products)
        
        # Score and rank results
        scored_products = []
        for product in products:
            score = self._calculate_personalized_score(product, preferences, user.age, user.gender)
            scored_products.append({
                **product,
                'recommendation_score': score
            })
        
        # Sort by recommendation score and eco score
        scored_products.sort(key=lambda x: (x['recommendation_score'], x['eco_score']), reverse=True)
        
        return scored_products[:limit]
