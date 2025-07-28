import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, ShoppingCart, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Product } from "@shared/schema";

interface ProductCardProps {
  product: Product;
  onView?: (productId: number) => void;
}

function getPlaceholderImage(product: Product): string {
  const productTitle = product.title.toLowerCase();
  const category = product.category?.toLowerCase() || '';
  
  // Map product types to relevant Unsplash categories
  if (productTitle.includes('water bottle') || productTitle.includes('bottle')) {
    return 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=300&h=300&fit=crop&crop=center';
  }
  if (productTitle.includes('bags') || productTitle.includes('bag')) {
    return 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&h=300&fit=crop&crop=center';
  }
  if (productTitle.includes('garden') || productTitle.includes('lights')) {
    return 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=300&fit=crop&crop=center';
  }
  if (productTitle.includes('plates') || productTitle.includes('kitchen')) {
    return 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=300&h=300&fit=crop&crop=center';
  }
  if (productTitle.includes('furniture') || productTitle.includes('outdoor')) {
    return 'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=300&h=300&fit=crop&crop=center';
  }
  if (productTitle.includes('bamboo')) {
    return 'https://images.unsplash.com/photo-1520637836862-4d197d17c648?w=300&h=300&fit=crop&crop=center';
  }
  if (productTitle.includes('cork')) {
    return 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=300&fit=crop&crop=center';
  }
  if (productTitle.includes('hemp') || productTitle.includes('organic')) {
    return 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300&h=300&fit=crop&crop=center';
  }
  
  // Category-based fallbacks
  if (category.includes('home') || category.includes('kitchen')) {
    return 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300&h=300&fit=crop&crop=center';
  }
  if (category.includes('grocery') || category.includes('food')) {
    return 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&h=300&fit=crop&crop=center';
  }
  if (category.includes('tools') || category.includes('improvement')) {
    return 'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=300&h=300&fit=crop&crop=center';
  }
  if (category.includes('patio') || category.includes('garden')) {
    return 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=300&h=300&fit=crop&crop=center';
  }
  
  // Default eco-friendly image
  return 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=300&h=300&fit=crop&crop=center';
}

export function ProductCard({ product, onView }: ProductCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isWishlisted, setIsWishlisted] = useState(false);

  const addToCartMutation = useMutation({
    mutationFn: (productId: number) => 
      apiRequest("POST", "/api/cart", { productId, quantity: 1 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({
        title: "Added to cart",
        description: `${product.title} has been added to your cart.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add item to cart. Please try again.",
        variant: "destructive",
      });
    },
  });

  const addToWishlistMutation = useMutation({
    mutationFn: (productId: number) => 
      apiRequest("POST", "/api/wishlist", { productId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wishlist"] });
      setIsWishlisted(true);
      toast({
        title: "Added to wishlist",
        description: `${product.title} has been added to your wishlist.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add item to wishlist. Please try again.",
        variant: "destructive",
      });
    },
  });

  const trackViewMutation = useMutation({
    mutationFn: (productId: number) => 
      apiRequest("POST", "/api/activity/view", { productId }),
  });

  const handleAddToCart = () => {
    addToCartMutation.mutate(product.id);
  };

  const handleAddToWishlist = () => {
    addToWishlistMutation.mutate(product.id);
  };

  const handleCardClick = () => {
    trackViewMutation.mutate(product.id);
    onView?.(product.id);
  };

  const getEcoScoreColor = (score: number) => {
    if (score >= 40) return "bg-eco-600";
    if (score >= 30) return "bg-eco-500";
    if (score >= 20) return "bg-eco-400";
    return "bg-eco-300";
  };

  const formatPrice = (price: string) => {
    return `$${parseFloat(price).toFixed(2)}`;
  };

  return (
    <Card className="product-card bg-white shadow-sm overflow-hidden cursor-pointer" onClick={handleCardClick}>
      <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
        <img 
          src={product.images && product.images.trim() 
            ? product.images 
            : getPlaceholderImage(product)}
          alt={product.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = `https://via.placeholder.com/300x300/22c55e/ffffff?text=${encodeURIComponent(product.category || 'Eco')}`;
          }}
        />
      </div>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <Badge className={`eco-score-badge text-white text-xs font-semibold ${getEcoScoreColor(Number(product.ecoScore))}`}>
            ⭐ {Number(product.ecoScore).toFixed(0)} ECO
          </Badge>
          <span className="text-sm text-gray-500">{product.category}</span>
        </div>
        
        <h3 className="font-semibold text-gray-900 mb-1 text-sm line-clamp-2">
          {product.title}
        </h3>
        
        <p className="text-xs text-gray-600 mb-2 line-clamp-2">
          {product.text}
        </p>
        
        <div className="flex items-center justify-between mb-3">
          <span className="text-lg font-bold text-eco-600">
            {formatPrice(product.price)}
          </span>
          {product.averageRating && (
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 fill-current text-yellow-400" />
              <span className="text-xs text-gray-500">
                {Number(product.averageRating).toFixed(1)}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex space-x-2">
          <Button 
            className="flex-1 bg-eco-500 text-white hover:bg-eco-600 transition-colors text-sm"
            onClick={(e) => {
              e.stopPropagation();
              handleAddToCart();
            }}
            disabled={addToCartMutation.isPending}
          >
            <ShoppingCart className="w-4 h-4 mr-1" />
            Add to Cart
          </Button>
          <Button 
            variant="outline"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleAddToWishlist();
            }}
            disabled={addToWishlistMutation.isPending}
            className={isWishlisted ? "bg-eco-100 border-eco-500" : ""}
          >
            <Heart className={`w-4 h-4 ${isWishlisted ? "fill-current text-eco-500" : "text-gray-600"}`} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
