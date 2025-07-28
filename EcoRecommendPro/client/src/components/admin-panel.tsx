import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface AdminPanelProps {
  open: boolean;
  onClose: () => void;
}

export function AdminPanel({ open, onClose }: AdminPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiRequest("POST", "/api/admin/upload-dataset", formData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Dataset uploaded successfully",
        description: "The product dataset has been processed and eco-scored.",
      });
      setFile(null);
      setUploadProgress(0);
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: "Failed to upload dataset. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === "text/csv" || selectedFile.type === "application/json") {
        setFile(selectedFile);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select a CSV or JSON file.",
          variant: "destructive",
        });
      }
    }
  };

  const handleUpload = () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("dataset", file);

    uploadMutation.mutate(formData);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (droppedFile.type === "text/csv" || droppedFile.type === "application/json") {
        setFile(droppedFile);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select a CSV or JSON file.",
          variant: "destructive",
        });
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Admin Panel</DialogTitle>
          <DialogDescription>
            Upload a product dataset to update the eco-friendly product recommendations.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="dataset-upload" className="text-sm font-medium text-gray-700">
              Upload Dataset
            </Label>
            <div 
              className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-eco-500 transition-colors"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600 mb-2">
                Drop CSV or JSON file here, or click to browse
              </p>
              <Input
                id="dataset-upload"
                type="file"
                accept=".csv,.json"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button 
                variant="outline"
                onClick={() => document.getElementById("dataset-upload")?.click()}
                className="text-eco-600 hover:text-eco-700"
              >
                Choose File
              </Button>
              {file && (
                <p className="text-sm text-gray-600 mt-2">
                  Selected: {file.name}
                </p>
              )}
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Hybrid Eco-Scoring Strategy
            </h4>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-eco-500 mr-2" />
                <span>Step 1: Score all products using Mistral-7B</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-eco-500 mr-2" />
                <span>Step 2: Select top 5,000 products by eco-score</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-eco-500 mr-2" />
                <span>Step 3: Re-score using LLaMA-2 for precision</span>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <Button 
              className="flex-1 bg-eco-600 text-white hover:bg-eco-700 transition-colors"
              onClick={handleUpload}
              disabled={!file || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? "Processing..." : "Start Eco-Scoring"}
            </Button>
            <Button 
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
