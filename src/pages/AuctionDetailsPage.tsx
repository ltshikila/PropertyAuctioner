import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Gavel, MapPin, Bed, Bath, Car, User, Clock } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';

interface Auction {
  id: string;
  creator_id: string;
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

interface Bid {
  id: string;
  bid_amount: number;
  created_at: string;
  profiles: {
    username: string;
    full_name: string;
  };
}

export default function AuctionDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [bidAmount, setBidAmount] = useState('');
  const [bidDialogOpen, setBidDialogOpen] = useState(false);

  const { data: auction, isLoading: auctionLoading } = useQuery({
    queryKey: ['auction', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auctions')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Auction;
    },
    enabled: !!id
  });

  const { data: bids, isLoading: bidsLoading } = useQuery({
    queryKey: ['bids', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bids')
        .select(`
          id,
          bid_amount,
          created_at,
          profiles:bidder_id(username, full_name)
        `)
        .eq('auction_id', id)
        .order('bid_amount', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as Bid[];
    },
    enabled: !!id
  });

  const placeBidMutation = useMutation({
    mutationFn: async (amount: number) => {
      if (!user) throw new Error('Must be logged in');
      
      const { error } = await supabase
        .from('bids')
        .insert({
          auction_id: id!,
          bidder_id: user.id,
          bid_amount: amount
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Bid placed successfully!');
      setBidAmount('');
      setBidDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['auction', id] });
      queryClient.invalidateQueries({ queryKey: ['bids', id] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to place bid');
    }
  });

  const handlePlaceBid = async () => {
    const amount = parseFloat(bidAmount);
    
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid bid amount');
      return;
    }

    if (auction && amount <= auction.highest_bid) {
      toast.error('Bid must be higher than current highest bid');
      return;
    }

    placeBidMutation.mutate(amount);
  };

  const isAuctionActive = (auction: Auction) => {
    const now = new Date();
    const start = new Date(auction.auction_start_date);
    const end = new Date(auction.auction_end_date);
    
    return auction.auction_state === 'active' && now >= start && now <= end;
  };

  const getStatusColor = (auction: Auction) => {
    const now = new Date();
    const start = new Date(auction.auction_start_date);
    const end = new Date(auction.auction_end_date);
    
    if (auction.auction_state === 'cancelled') return 'destructive';
    if (now > end) return 'secondary';
    if (now < start) return 'outline';
    return 'default';
  };

  const getStatusText = (auction: Auction) => {
    const now = new Date();
    const start = new Date(auction.auction_start_date);
    const end = new Date(auction.auction_end_date);
    
    if (auction.auction_state === 'cancelled') return 'Cancelled';
    if (now > end) return 'Ended';
    if (now < start) return 'Upcoming';
    return 'Active';
  };

  if (auctionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Gavel className="h-12 w-12 text-primary mx-auto mb-4 animate-bounce" />
          <p className="text-lg">Loading auction details...</p>
        </div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-destructive">Auction not found</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            Back to Auctions
          </Button>
        </div>
      </div>
    );
  }

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
            <h1 className="text-xl font-bold">{auction.auction_name}</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Property Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-0">
                {auction.listing_images && auction.listing_images.length > 0 && (
                  <div className="aspect-video overflow-hidden rounded-t-lg">
                    <Carousel className="w-full">
                      <CarouselContent>
                        {auction.listing_images.map((image, index) => (
                          <CarouselItem key={index}>
                            <img
                              src={image}
                              alt={`${auction.listing_title} - Image ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                      {auction.listing_images.length > 1 && (
                        <>
                          <CarouselPrevious className="left-4" />
                          <CarouselNext className="right-4" />
                        </>
                      )}
                    </Carousel>
                  </div>
                )}
                
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">{auction.listing_title}</h2>
                      <p className="text-muted-foreground flex items-center mt-1">
                        <MapPin className="h-4 w-4 mr-1" />
                        {auction.listing_location}
                      </p>
                    </div>
                    <Badge variant={getStatusColor(auction)}>
                      {getStatusText(auction)}
                    </Badge>
                  </div>

                  <div className="flex items-center space-x-6 text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Bed className="h-4 w-4" />
                      <span>{auction.listing_bedrooms} bedrooms</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Bath className="h-4 w-4" />
                      <span>{auction.listing_bathrooms} bathrooms</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Car className="h-4 w-4" />
                      <span>{auction.listing_parking_spaces} parking</span>
                    </div>
                  </div>

                  {auction.listing_amenities && (
                    <div>
                      <h3 className="font-semibold mb-2">Amenities</h3>
                      <p className="text-muted-foreground">{auction.listing_amenities}</p>
                    </div>
                  )}

                  {auction.listing_description && (
                    <div>
                      <h3 className="font-semibold mb-2">Description</h3>
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {auction.listing_description}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-sm text-muted-foreground">Auction Start</p>
                      <p className="font-medium flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {format(new Date(auction.auction_start_date), 'PPP p')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Auction End</p>
                      <p className="font-medium flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {format(new Date(auction.auction_end_date), 'PPP p')}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bidding Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Current Bid Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Starting Price</p>
                  <p className="text-lg font-semibold">
                    R{auction.listing_price.toLocaleString()}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Current Highest Bid</p>
                  <p className="text-2xl font-bold text-primary">
                    R{auction.highest_bid.toLocaleString()}
                  </p>
                </div>

                {isAuctionActive(auction) && user && user.id !== auction.creator_id && (
                  <Dialog open={bidDialogOpen} onOpenChange={setBidDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full" size="lg">
                        <Gavel className="h-4 w-4 mr-2" />
                        Place Bid
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Place Your Bid</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="bidAmount">Bid Amount (R)</Label>
                          <Input
                            id="bidAmount"
                            type="number"
                            min={auction.highest_bid + 1}
                            step="0.01"
                            placeholder={`Minimum: R${(auction.highest_bid + 1).toLocaleString()}`}
                            value={bidAmount}
                            onChange={(e) => setBidAmount(e.target.value)}
                          />
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="outline" onClick={() => setBidDialogOpen(false)} className="flex-1">
                            Cancel
                          </Button>
                          <Button 
                            onClick={handlePlaceBid} 
                            disabled={placeBidMutation.isPending}
                            className="flex-1"
                          >
                            {placeBidMutation.isPending ? 'Placing...' : 'Place Bid'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}

                {user && user.id === auction.creator_id && (
                  <div className="text-center py-4 text-muted-foreground">
                    You are the creator of this auction
                  </div>
                )}

                {!isAuctionActive(auction) && (
                  <div className="text-center py-4 text-muted-foreground">
                    This auction is no longer active
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Bids */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Bids</CardTitle>
              </CardHeader>
              <CardContent>
                {bidsLoading ? (
                  <p className="text-muted-foreground">Loading bids...</p>
                ) : !bids || bids.length === 0 ? (
                  <p className="text-muted-foreground">No bids yet</p>
                ) : (
                  <div className="space-y-3">
                    {bids.map((bid) => (
                      <div key={bid.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">
                              {bid.profiles?.full_name || bid.profiles?.username || 'Anonymous'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(bid.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        <p className="font-semibold">
                          R{bid.bid_amount.toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}