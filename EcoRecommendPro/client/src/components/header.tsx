import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Search, ShoppingCart, Heart, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/auth";
import { SearchBar } from "./search-bar";
import { AdminPanel } from "./admin-panel";

interface HeaderProps {
  onSearch: (query: string) => void;
}

export function Header({ onSearch }: HeaderProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  const { data: user, refetch: refetchUser } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: auth.me,
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });

  const { data: cartItems = [] } = useQuery({
    queryKey: ["/api/cart"],
    enabled: !!user,
  });

  const { data: wishlistItems = [] } = useQuery({
    queryKey: ["/api/wishlist"],
    enabled: !!user,
  });

  const logoutMutation = useMutation({
    mutationFn: auth.logout,
    onSuccess: () => {
      queryClient.clear();
      navigate("/login");
      toast({
        title: "Logged out successfully",
        description: "You have been logged out.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-eco-500 to-eco-400 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">E</span>
                </div>
                <span className="ml-2 text-xl font-bold text-gray-900">EcoRecommend</span>
              </Link>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-2xl mx-8">
              <SearchBar onSearch={onSearch} />
            </div>

            {/* User Actions */}
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-700">
                    <span>Welcome, <span className="font-medium text-eco-600">{user.name}</span></span>
                  </div>

                  {/* Cart & Wishlist */}
                  <div className="flex items-center space-x-3">
                    <Button variant="ghost" size="icon" className="relative">
                      <Heart className="h-5 w-5" />
                      {wishlistItems.length > 0 && (
                        <Badge className="absolute -top-1 -right-1 bg-eco-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {wishlistItems.length}
                        </Badge>
                      )}
                    </Button>

                    <Button variant="ghost" size="icon" className="relative">
                      <ShoppingCart className="h-5 w-5" />
                      {cartItems.length > 0 && (
                        <Badge className="absolute -top-1 -right-1 bg-eco-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {cartItems.length}
                        </Badge>
                      )}
                    </Button>

                    {/* Direct Profile Link */}
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/profile" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span className="hidden sm:inline">Profile</span>
                      </Link>
                    </Button>
                  </div>

                  {/* User Profile Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative rounded-full">
                        <div className="w-8 h-8 bg-eco-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-medium text-sm">{getUserInitials(user.name)}</span>
                        </div>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                        <p className="text-xs text-gray-500">Age: {user.age} | Gender: {user.gender}</p>
                      </div>
                      <DropdownMenuItem asChild>
                        <Link href="/profile">My Account</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>Order History</DropdownMenuItem>
                      <DropdownMenuItem>Settings</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Admin Panel Access */}
                  <Button onClick={() => setShowAdminPanel(true)} variant="secondary" size="sm">
                    Admin
                  </Button>
                </>
              ) : (
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" asChild>
                    <Link href="/login">Login</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/signup">Sign Up</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <AdminPanel open={showAdminPanel} onClose={() => setShowAdminPanel(false)} />
    </>
  );
}