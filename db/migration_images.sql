-- Migration to support multiple images per listing
-- Change image_url TEXT to image_urls JSON

ALTER TABLE listings ADD COLUMN image_urls JSON DEFAULT '[]'::json;
UPDATE listings SET image_urls = CASE WHEN image_url IS NOT NULL AND image_url != '' THEN json_build_array(image_url) ELSE '[]'::json END;
ALTER TABLE listings DROP COLUMN image_url;