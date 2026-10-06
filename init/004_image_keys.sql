-- Idempotent image key seed — run-safe on fresh or existing DB
INSERT INTO page_content (page, key, value) VALUES
  ('home', 'hero_image', '/images/LOGOSHOT.jpg'),
  ('vets2', 'logo_image', 'https://static.wixstatic.com/media/126043_9fd283f0957e4b8f9bb828024b776fdc~mv2.png/v1/fill/w_1024,h_525,al_c,q_90,enc_avif,quality_auto/126043_9fd283f0957e4b8f9bb828024b776fdc~mv2.png')
ON CONFLICT (page, key) DO UPDATE SET value = EXCLUDED.value;
