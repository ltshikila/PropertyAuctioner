-- Create users table for authentication (extends Supabase auth)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create auctions table
CREATE TABLE public.auctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  auction_name TEXT NOT NULL,
  auction_start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  auction_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  listing_title TEXT NOT NULL,
  listing_description TEXT,
  listing_price NUMERIC(12,2) NOT NULL,
  listing_location TEXT NOT NULL,
  listing_bedrooms INTEGER NOT NULL,
  listing_bathrooms INTEGER NOT NULL,
  listing_parking_spaces INTEGER NOT NULL,
  listing_amenities TEXT,
  listing_image TEXT,
  highest_bid NUMERIC(12,2) DEFAULT 0,
  auction_state TEXT DEFAULT 'active' CHECK (auction_state IN ('active', 'ended', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bids table
CREATE TABLE public.bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bid_amount NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for auctions
CREATE POLICY "Anyone can view auctions" ON public.auctions FOR SELECT USING (true);
CREATE POLICY "Users can create auctions" ON public.auctions FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Users can update their own auctions" ON public.auctions FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Users can delete their own auctions" ON public.auctions FOR DELETE USING (auth.uid() = creator_id);

-- Create RLS policies for bids
CREATE POLICY "Anyone can view bids" ON public.bids FOR SELECT USING (true);
CREATE POLICY "Authenticated users can place bids" ON public.bids FOR INSERT WITH CHECK (auth.uid() = bidder_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_auctions_updated_at
  BEFORE UPDATE ON public.auctions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, full_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update highest bid
CREATE OR REPLACE FUNCTION public.update_highest_bid()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.auctions 
  SET highest_bid = NEW.bid_amount 
  WHERE id = NEW.auction_id 
  AND NEW.bid_amount > highest_bid;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update highest bid when new bid is placed
CREATE TRIGGER on_new_bid
  AFTER INSERT ON public.bids
  FOR EACH ROW EXECUTE FUNCTION public.update_highest_bid();