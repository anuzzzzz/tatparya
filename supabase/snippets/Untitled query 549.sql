SELECT p.name, p.images->0->>'originalUrl' as original_url, p.images->0->>'cardUrl' as card_url
FROM public.products p 
ORDER BY p.created_at DESC
LIMIT 4;