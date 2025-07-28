import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/auth";
import type { Product } from "@shared/schema";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedEcoScore, setSelectedEcoScore] = useState<string>("all");
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>("all");
  const [showAllProducts, setShowAllProducts] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: auth.me,
    retry: false,
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["/api/products", { 
      search: searchQuery, 
      category: selectedCategory,
      ecoScore: selectedEcoScore,
      priceRange: selectedPriceRange,
      showAll: showAllProducts
    }],
    queryFn: async () => {
      if (searchQuery) {
        const response = await fetch(`/api/products/search?q=${encodeURIComponent(searchQuery)}`);
        return response.json();
      }
      // When showing all products, fetch with higher limit
      const limit = showAllProducts ? 100 : 20;
      const response = await fetch(`/api/products?limit=${limit}`);
      return response.json();
    },
  });

  const { data: recommendations = [] } = useQuery({
    queryKey: ["/api/products/recommendations"],
    queryFn: async () => {
      if (user) {
        // For logged-in users, get personalized recommendations
        const response = await fetch("/api/products/recommendations");
        return response.json();
      }
      return [];
    },
    enabled: !!user,
  });

  const { data: coldStartRecommendations = [] } = useQuery({
    queryKey: ["/api/products/cold-start", user?.age, user?.gender],
    queryFn: async () => {
      if (!user) return [];
      // Get cold start recommendations for new users with limited activity
      const response = await fetch(`/api/products/cold-start?age=${user.age}&gender=${user.gender}`);
      return response.json();
    },
    enabled: !!user,
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const filteredProducts = products.filter((product: Product) => {
    // Category filter
    if (selectedCategory !== "all" && product.category !== selectedCategory) {
      return false;
    }

    // Eco score filter
    if (selectedEcoScore !== "all") {
      const score = Number(product.ecoScore);
      switch (selectedEcoScore) {
        case "excellent":
          if (score < 40) return false;
          break;
        case "good":
          if (score < 30 || score >= 40) return false;
          break;
        case "fair":
          if (score < 20 || score >= 30) return false;
          break;
      }
    }

    // Price range filter
    if (selectedPriceRange !== "all") {
      const price = Number(product.price);
      switch (selectedPriceRange) {
        case "under-25":
          if (price >= 25) return false;
          break;
        case "25-50":
          if (price < 25 || price >= 50) return false;
          break;
        case "50-100":
          if (price < 50 || price >= 100) return false;
          break;
        case "100-plus":
          if (price < 100) return false;
          break;
      }
    }

    return true;
  });

  // Determine which products to show based on user state and activity
  const getDisplayProducts = () => {
    if (searchQuery) return filteredProducts;
    if (showAllProducts) return filteredProducts; // Show all products when View All is clicked
    if (!user) return products;
    
    // For logged-in users, check if they have activity for personalized recommendations
    const hasActivity = recommendations.length > 0 && 
      recommendations.some((p: any) => p.recommendation_score > 0);
    
    return hasActivity ? recommendations : coldStartRecommendations;
  };

  const displayProducts = getDisplayProducts();

  const getRecommendationType = () => {
    if (searchQuery) return "Search Results";
    if (showAllProducts) return "All Eco-Friendly Products";
    if (!user) return "Eco-Friendly Products";
    
    // Check if showing personalized vs demographic recommendations
    const hasActivity = recommendations.length > 0 && 
      recommendations.some((p: any) => p.recommendation_score > 0);
    
    if (hasActivity) return "Personalized for You";
    return `Recommended for ${user.gender === 'male' ? 'Men' : 'Women'} (Age ${user.age})`;
  };

  const uniqueCategories = Array.from(new Set(products.map((p: Product) => p.category)));

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onSearch={handleSearch} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-eco-50 to-eco-100 rounded-xl p-8 mb-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Discover Sustainable Products
              <span className="text-eco-600"> Tailored for You</span>
            </h1>
            <p className="text-lg text-gray-600 mb-6">
              AI-powered recommendations for eco-friendly products based on your preferences and sustainability goals
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="bg-eco-100 text-eco-800 px-3 py-1 rounded-full">🌱 Eco-Scored Products</span>
              <span className="bg-eco-100 text-eco-800 px-3 py-1 rounded-full">🔄 Personalized Recommendations</span>
              <span className="bg-eco-100 text-eco-800 px-3 py-1 rounded-full">🌍 Carbon-Neutral Shipping</span>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Filter by:</span>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {uniqueCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Eco Score:</span>
              <Select value={selectedEcoScore} onValueChange={setSelectedEcoScore}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="All Scores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Scores</SelectItem>
                  <SelectItem value="excellent">40+ (Excellent)</SelectItem>
                  <SelectItem value="good">30-39 (Good)</SelectItem>
                  <SelectItem value="fair">20-29 (Fair)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Price Range:</span>
              <Select value={selectedPriceRange} onValueChange={setSelectedPriceRange}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="All Prices" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Prices</SelectItem>
                  <SelectItem value="under-25">Under $25</SelectItem>
                  <SelectItem value="25-50">$25 - $50</SelectItem>
                  <SelectItem value="50-100">$50 - $100</SelectItem>
                  <SelectItem value="100-plus">$100+</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Products Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {getRecommendationType()}
            </h2>
            <Button 
              variant="ghost" 
              className="text-eco-600 hover:text-eco-700"
              onClick={() => {
                setShowAllProducts(!showAllProducts);
                setSearchQuery(""); // Clear search when viewing all
              }}
            >
              {showAllProducts ? "Show Recommendations" : "View All"} →
            </Button>
          </div>

          {/* Product Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <Skeleton className="w-full h-48" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : displayProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {displayProducts.map((product: Product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No products found matching your criteria.</p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-eco-500 to-eco-400 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">E</span>
                </div>
                <span className="ml-2 text-xl font-bold">EcoRecommend</span>
              </div>
              <p className="text-gray-400">Discover sustainable products tailored to your lifestyle and values.</p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Shop</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Home & Kitchen</a></li>
                <li><a href="#" className="hover:text-white">Grocery & Food</a></li>
                <li><a href="#" className="hover:text-white">Personal Care</a></li>
                <li><a href="#" className="hover:text-white">Fashion</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">About</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Our Mission</a></li>
                <li><a href="#" className="hover:text-white">Eco-Scoring</a></li>
                <li><a href="#" className="hover:text-white">Sustainability</a></li>
                <li><a href="#" className="hover:text-white">Partners</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Help Center</a></li>
                <li><a href="#" className="hover:text-white">Contact Us</a></li>
                <li><a href="#" className="hover:text-white">Returns</a></li>
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 EcoRecommend. All rights reserved. | Powered by sustainable technology.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
