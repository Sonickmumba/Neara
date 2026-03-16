const express = require('express');
const {
  upload,
  uploadMultipleToCloudinary,
  deleteFromCloudinary,
} = require('../utils/imageService');
const ensureAuth = require('../middleware/auth');

const router = express.Router();

// POST /api/images/upload - Upload multiple images (protected)
router.post(
  '/upload',
  ensureAuth,
  upload.array('images', 5),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No images provided',
        });
      }

      // Upload images to Cloudinary
      const uploadedImages = await uploadMultipleToCloudinary(
        req.files,
        'neara-listings'
      );

      res.json({
        success: true,
        message: `${uploadedImages.length} image(s) uploaded successfully`,
        data: uploadedImages,
      });
    } catch (error) {
      console.error('Image upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload images',
        error:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// DELETE /api/images/:publicId - Delete image from Cloudinary (protected)
router.delete('/:publicId', ensureAuth, async (req, res) => {
  try {
    const { publicId } = req.params;

    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'Public ID is required',
      });
    }

    await deleteFromCloudinary(publicId);

    res.json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error) {
    console.error('Image delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete image',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

module.exports = router;
