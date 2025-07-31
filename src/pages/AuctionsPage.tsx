import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gavel, Plus, MapPin, Bed, Bath, Car, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Auction {
  id: string;
  auction_name: string;
  auction_start_date: string;
  auction_end_date: string;
  listing_title: string;
  listing_description: string;
  listing_price: number;
  listing_location: string;
  listing_bedrooms: number;
  listing_bathrooms: number;
  listing_parking_spaces: number;
  listing_amenities: string;
  listing_images: string[];
  highest_bid: number;
  auction_state: string;
}

export default function AuctionsPage() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const { data: auctions, isLoading, error } = useQuery({
    queryKey: ['auctions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auctions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Auction[];
    }
  });

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
    } catch (error) {
      toast.error('Error signing out');
    }
  };

  const getStatusColor = (state: string, startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (state === 'cancelled') return 'destructive';
    if (now > end) return 'secondary';
    if (now < start) return 'outline';
    return 'default';
  };

  const getStatusText = (state: string, startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (state === 'cancelled') return 'Cancelled';
    if (now > end) return 'Ended';
    if (now < start) return 'Upcoming';
    return 'Active';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Gavel className="h-12 w-12 text-primary mx-auto mb-4 animate-bounce" />
          <p className="text-lg">Loading auctions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-destructive">Error loading auctions</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Gavel className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Property Auctions</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button onClick={() => navigate('/create')} className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Create Auction</span>
            </Button>
            <Button variant="outline" onClick={handleSignOut} className="flex items-center space-x-2">
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {!auctions || auctions.length === 0 ? (
          <div className="text-center py-12">
            <Gavel className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">No auctions yet</h2>
            <p className="text-muted-foreground mb-6">
              Be the first to create a property auction!
            </p>
            <Button onClick={() => navigate('/create')}>
              Create Your First Auction
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {auctions.map((auction) => (
              <Card key={auction.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                 <div onClick={() => navigate(`/auction/${auction.id}`)}>
                   {auction.listing_images && auction.listing_images.length > 0 && (
                     <div className="aspect-video overflow-hidden">
                       <img
                         src={auction.listing_images[0]}
                         alt={auction.listing_title}
                         className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                       />
                     </div>
                   )}
                  
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg line-clamp-2">
                        {auction.auction_name}
                      </CardTitle>
                      <Badge variant={getStatusColor(auction.auction_state, auction.auction_start_date, auction.auction_end_date)}>
                        {getStatusText(auction.auction_state, auction.auction_start_date, auction.auction_end_date)}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-primary">{auction.listing_title}</h3>
                      <p className="text-sm text-muted-foreground flex items-center mt-1">
                        <MapPin className="h-4 w-4 mr-1" />
                        {auction.listing_location}
                      </p>
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Bed className="h-4 w-4 mr-1" />
                        {auction.listing_bedrooms}
                      </div>
                      <div className="flex items-center">
                        <Bath className="h-4 w-4 mr-1" />
                        {auction.listing_bathrooms}
                      </div>
                      <div className="flex items-center">
                        <Car className="h-4 w-4 mr-1" />
                        {auction.listing_parking_spaces}
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t">
                      <div>
                        <p className="text-sm text-muted-foreground">Starting Price</p>
                        <p className="font-semibold">R{auction.listing_price.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Highest Bid</p>
                        <p className="font-semibold text-primary">
                          R{auction.highest_bid.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Ends {formatDistanceToNow(new Date(auction.auction_end_date), { addSuffix: true })}
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}