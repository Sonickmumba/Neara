const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer for memory storage (required for Cloudinary)
const storage = multer.memoryStorage();

// File filter to only allow images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Create multer upload middleware
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per image
    files: 5, // Maximum 5 images
  },
  fileFilter: fileFilter,
});

// Upload single image to Cloudinary
// Pass options.transformation to override the default listing transformation.
const uploadToCloudinary = (
  buffer,
  folder = 'neara-listings',
  options = {}
) => {
  return new Promise((resolve, reject) => {
    const defaultTransformation = [
      { width: 1200, height: 1200, crop: 'limit' },
      { quality: 'auto' },
      { fetch_format: 'auto' },
    ];

    const uploadOptions = {
      folder,
      resource_type: 'image',
      ...options,
      transformation: options.transformation || defaultTransformation,
    };

    const stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            url: result.secure_url,
            public_id: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes,
          });
        }
      }
    );

    stream.end(buffer);
  });
};

// Upload multiple images to Cloudinary
const uploadMultipleToCloudinary = async (files, folder = 'neara-listings') => {
  const uploadPromises = files.map((file) =>
    uploadToCloudinary(file.buffer, folder)
  );
  return Promise.all(uploadPromises);
};

// Delete image from Cloudinary
const deleteFromCloudinary = (publicId) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
};

module.exports = {
  upload,
  uploadToCloudinary,
  uploadMultipleToCloudinary,
  deleteFromCloudinary,
};
