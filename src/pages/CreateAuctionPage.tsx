import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Gavel } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function CreateAuctionPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    auctionName: '',
    startDate: '',
    endDate: '',
    listingTitle: '',
    listingPrice: '',
    listingLocation: '',
    listingBedrooms: '',
    listingBathrooms: '',
    listingParkingSpaces: '',
    listingAmenities: '',
    listingDescription: '',
    listingImage: ''
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setImageFiles(prev => [...prev, ...files]);
      
      // Generate previews for new files
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = () => {
          setImagePreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in to create an auction');
      return;
    }

    // Validate dates
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const now = new Date();

    if (start <= now) {
      toast.error('Start date must be in the future');
      return;
    }

    if (end <= start) {
      toast.error('End date must be after start date');
      return;
    }

    setLoading(true);

    try {
      let imageUrls: string[] = [];
      
      // Add URL image if provided
      if (formData.listingImage) {
        imageUrls.push(formData.listingImage);
      }
      
      // Upload image files if selected
      if (imageFiles.length > 0) {
        for (const file of imageFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
          const filePath = `auction-images/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('auction-images')
            .upload(filePath, file);

          if (uploadError) {
            throw uploadError;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('auction-images')
            .getPublicUrl(filePath);

          imageUrls.push(publicUrl);
        }
      }

      const { error } = await supabase
        .from('auctions')
        .insert({
          creator_id: user.id,
          auction_name: formData.auctionName,
          auction_start_date: formData.startDate,
          auction_end_date: formData.endDate,
          listing_title: formData.listingTitle,
          listing_price: parseFloat(formData.listingPrice),
          listing_location: formData.listingLocation,
          listing_bedrooms: parseInt(formData.listingBedrooms),
          listing_bathrooms: parseInt(formData.listingBathrooms),
          listing_parking_spaces: parseInt(formData.listingParkingSpaces),
          listing_amenities: formData.listingAmenities,
          listing_description: formData.listingDescription,
          listing_images: imageUrls.length > 0 ? imageUrls : null,
          highest_bid: 0,
          auction_state: 'active'
        });

      if (error) {
        throw error;
      }

      toast.success('Auction created successfully!');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create auction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/')} className="flex items-center space-x-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Auctions</span>
          </Button>
          <div className="flex items-center space-x-2">
            <Gavel className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Create New Auction</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Property Auction Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Auction Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Auction Information</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="auctionName">Auction Name *</Label>
                  <Input
                    id="auctionName"
                    name="auctionName"
                    placeholder="Enter auction name"
                    value={formData.auctionName}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date & Time *</Label>
                    <Input
                      id="startDate"
                      name="startDate"
                      type="datetime-local"
                      value={formData.startDate}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date & Time *</Label>
                    <Input
                      id="endDate"
                      name="endDate"
                      type="datetime-local"
                      value={formData.endDate}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Property Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Property Information</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="listingTitle">Property Title *</Label>
                  <Input
                    id="listingTitle"
                    name="listingTitle"
                    placeholder="Enter property title"
                    value={formData.listingTitle}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="listingPrice">Starting Price (R) *</Label>
                    <Input
                      id="listingPrice"
                      name="listingPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.listingPrice}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="listingLocation">Location *</Label>
                    <Input
                      id="listingLocation"
                      name="listingLocation"
                      placeholder="Property location"
                      value={formData.listingLocation}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="listingBedrooms">Bedrooms *</Label>
                    <Input
                      id="listingBedrooms"
                      name="listingBedrooms"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.listingBedrooms}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="listingBathrooms">Bathrooms *</Label>
                    <Input
                      id="listingBathrooms"
                      name="listingBathrooms"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.listingBathrooms}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="listingParkingSpaces">Parking Spaces *</Label>
                    <Input
                      id="listingParkingSpaces"
                      name="listingParkingSpaces"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.listingParkingSpaces}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="listingAmenities">Amenities</Label>
                  <Input
                    id="listingAmenities"
                    name="listingAmenities"
                    placeholder="e.g., Pool, Garden, Security"
                    value={formData.listingAmenities}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="listingDescription">Description</Label>
                  <Textarea
                    id="listingDescription"
                    name="listingDescription"
                    placeholder="Describe the property..."
                    rows={4}
                    value={formData.listingDescription}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="listingImage">Image URL</Label>
                    <Input
                      id="listingImage"
                      name="listingImage"
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      value={formData.listingImage}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="imageFile">Upload Images</Label>
                    <Input
                      id="imageFile"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageChange}
                    />
                    {imagePreviews.length > 0 && (
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {imagePreviews.map((preview, index) => (
                          <div key={index} className="relative">
                            <img
                              src={preview}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-24 object-cover rounded border"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-destructive/90"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/')}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Creating...' : 'Create Auction'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}