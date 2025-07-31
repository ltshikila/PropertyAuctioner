-- Update auctions table to support multiple images
ALTER TABLE public.auctions 
DROP COLUMN listing_image;

ALTER TABLE public.auctions 
ADD COLUMN listing_images TEXT[];

-- Add index for better performance on image queries
CREATE INDEX idx_auctions_listing_images ON public.auctions USING GIN(listing_images);