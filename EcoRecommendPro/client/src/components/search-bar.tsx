import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    // Real-time search as user types
    onSearch(value);
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Input
        type="text"
        value={query}
        onChange={handleChange}
        className="w-full px-4 py-2 pl-10 pr-4 border border-gray-300 rounded-full bg-gray-50 focus:outline-none focus:ring-2 focus:ring-eco-500 focus:border-transparent search-glow"
        placeholder="Search eco-friendly products..."
      />
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-5 w-5 text-gray-400" />
      </div>
    </form>
  );
}
