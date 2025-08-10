"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Camera, 
  User, 
  Loader2, 
  Upload,
  X,
  ArrowRight
} from "lucide-react";
import Image from "next/image";

export default function ProfileSetup() {
  const [bio, setBio] = useState("");
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const router = useRouter();
  const rootUrl = process.env.NEXT_PUBLIC_ROOT_URL;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }

      setProfileImage(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setProfileImage(null);
    setImagePreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      
      if (bio.trim()) {
        formData.append('bio', bio.trim());
      }
      
      if (profileImage) {
        formData.append('profilePicture', profileImage);
      }

      const response = await fetch(`${rootUrl}/profile/setup`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: "Profile setup completed successfully!",
        });
        router.replace('/chat');
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to setup profile",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Profile setup error:", error);
      toast({
        title: "Error",
        description: "An error occurred while setting up your profile",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setIsSkipping(true);

    try {
      const response = await fetch(`${rootUrl}/profile/skip`, {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Profile setup skipped",
          description: "You can update your profile later from settings",
        });
        router.replace('/chat');
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to skip profile setup",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Skip profile setup error:", error);
      toast({
        title: "Error",
        description: "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSkipping(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-orange-600 dark:bg-orange-500 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <User className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Complete Your Profile
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Add a photo and bio to help others recognize you
          </p>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <div className="space-y-6">
            {/* Profile Picture Section */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  {imagePreview ? (
                    <Image
                      src={imagePreview}
                      alt="Profile preview"
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12 text-gray-400" />
                  )}
                </div>
                
                {imagePreview && (
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-orange-600 hover:bg-orange-700 text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors shadow-lg"
                >
                  <Camera className="w-5 h-5" />
                </button>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                Click the camera icon to upload a photo
                <br />
                <span className="text-xs">Max size: 5MB</span>
              </p>
            </div>

            {/* Bio Section */}
            <div className="space-y-2">
              <Label 
                htmlFor="bio" 
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                About you (optional)
              </Label>
              <Textarea
                id="bio"
                placeholder="Tell others about yourself..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={150}
                rows={4}
                className="resize-none border-gray-300 dark:border-gray-600 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>This will appear in your profile</span>
                <span>{bio.length}/150</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleSkip}
                disabled={isSubmitting || isSkipping}
                className="flex-1 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {isSkipping ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Skipping...
                  </>
                ) : (
                  <>
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Skip for now
                  </>
                )}
              </Button>
              
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || isSkipping}
                className="flex-1 bg-orange-600 dark:bg-orange-500 text-white hover:bg-orange-700 dark:hover:bg-orange-600"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Complete Setup
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You can always update your profile later from settings
          </p>
        </div>
      </div>
    </div>
  );
}