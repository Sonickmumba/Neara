import { useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  ArrowLeft,
  X,
  Image as ImageIcon,
  MapPin,
  DollarSign,
  Calendar,
  Sparkles,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../services/api';
import { addListing } from '../features/homeScreen/homeFeedSlice';

const CATEGORIES = [
  {
    value: 'skills',
    label: 'Skills',
    icon: '💡',
    examples: 'Teaching, tutoring, consulting',
  },
  {
    value: 'goods',
    label: 'Goods',
    icon: '📦',
    examples: 'Books, tools, furniture',
  },
  {
    value: 'services',
    label: 'Services',
    icon: '🛠️',
    examples: 'Repair, cleaning, moving',
  },
];

const TEMPLATES = {
  skills: {
    title: 'Guitar lessons for beginners',
    description:
      "I've been playing guitar for 10 years and love teaching! I can help you learn chords, techniques, and your favorite songs. Available weekends and evenings.",
  },
  goods: {
    title: 'Gently used furniture - Free',
    description:
      'Moving soon and have a couch, coffee table, and bookshelf to give away. All in great condition, just need to be picked up this weekend.',
  },
  services: {
    title: 'Help with moving and heavy lifting',
    description:
      'Looking for someone to help move furniture to a new apartment this Saturday. Should take about 2-3 hours. Happy to trade for your services or help in return!',
  },
};

export function CreateListing({ navigate }) {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    type: 'offer',
    category: 'skills',
    title: '',
    description: '',
    images: [],
    location: '',
    availability: '',
    duration: '',
    tradingFor: '',
  });

  const [showTemplates, setShowTemplates] = useState(true);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    const newErrors = {};
    if (!formData.type) newErrors.type = 'Please select offer or request';
    if (!formData.category) newErrors.category = 'Please select a category';
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim())
      newErrors.description = 'Description is required';
    if (formData.title.length < 5)
      newErrors.title = 'Title must be at least 5 characters';
    if (formData.description.length < 10)
      newErrors.description = 'Description must be at least 10 characters';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Please fix the errors in your listing');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare the payload for the API
      const payload = {
        type: formData.type,
        category: formData.category,
        title: formData.title.trim(),
        description: formData.description.trim(),
        // For now, include additional fields in description
        // TODO: Update backend to handle these fields separately
      };

      // Add location if provided
      if (formData.location.trim()) {
        payload.description += `\n\nLocation: ${formData.location.trim()}`;
      }
      if (formData.availability.trim()) {
        payload.description += `\n\nAvailability: ${formData.availability.trim()}`;
      }
      if (formData.tradingFor.trim()) {
        payload.description += `\n\nLooking for: ${formData.tradingFor.trim()}`;
      }

      // TODO: Handle image uploads - for now, use first image if available
      if (formData.images.length > 0) {
        // In a real implementation, upload images to server first
        // payload.image_url = uploadedImageUrl;
      }

      const response = await apiClient.post('/api/listings', payload);
      const newListing = response.data?.data;

      if (newListing) {
        dispatch(addListing(newListing));
      }
      
      toast.success('Listing created successfully!');

      // Clear draft
      localStorage.removeItem('listingDraft');

      // Navigate back to home feed
      navigate('/homeFeed');
    } catch (error) {
      console.error('Error creating listing:', error);
      const errorMessage =
        error.response?.data?.message || 'Failed to create listing';
      toast.error(errorMessage);

      // Handle validation errors from server
      if (error.response?.data?.errors) {
        const serverErrors = {};
        error.response.data.errors.forEach((err) => {
          serverErrors[err.field] = err.message;
        });
        setErrors(serverErrors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length + formData.images.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }

    // In a real app, upload to server here
    const imageUrls = files.map((file) => URL.createObjectURL(file));
    setFormData({ ...formData, images: [...formData.images, ...imageUrls] });
    toast.success(`${files.length} image(s) added`);
  };

  const removeImage = (index) => {
    const newImages = formData.images.filter((_, i) => i !== index);
    setFormData({ ...formData, images: newImages });
  };

  const applyTemplate = (template) => {
    setFormData({
      ...formData,
      title: template.title,
      description: template.description,
    });
    setShowTemplates(false);
    toast.success('Template applied!');
  };

  const saveDraft = () => {
    localStorage.setItem('listingDraft', JSON.stringify(formData));
    toast.success('Draft saved!');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/homeFeed')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2>Create Listing</h2>
          </div>
          <button
            onClick={saveDraft}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Save Draft
          </button>
        </div>
      </header>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Templates Suggestion */}
          {showTemplates && !formData.title && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4">
              <div className="flex items-start gap-3 mb-3">
                <Sparkles className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 mb-1">
                    Need help getting started?
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Try one of these templates:
                  </p>
                  <div className="space-y-2">
                    {Object.entries(TEMPLATES).map(([key, template]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => applyTemplate(template)}
                        className="w-full text-left px-3 py-2 bg-white border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors text-sm"
                      >
                        <span className="font-medium text-gray-900">
                          {template.title}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTemplates(false)}
                  className="p-1 hover:bg-purple-100 rounded-lg transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
          )}

          {/* Type Selection */}
          <div>
            <label className="block mb-3 font-medium text-gray-900">
              What would you like to do?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'offer' })}
                className={`p-6 rounded-xl border-2 transition-all ${
                  formData.type === 'offer'
                    ? 'border-green-500 bg-green-50 shadow-md'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
              >
                <div className="text-3xl mb-2">🤝</div>
                <div className="font-medium mb-1">Offer Something</div>
                <p className="text-sm text-gray-600">
                  Share skills, goods, or services
                </p>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'need' })}
                className={`p-6 rounded-xl border-2 transition-all ${
                  formData.type === 'need'
                    ? 'border-orange-500 bg-orange-50 shadow-md'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
              >
                <div className="text-3xl mb-2">🙋</div>
                <div className="font-medium mb-1">Ask for Help</div>
                <p className="text-sm text-gray-600">
                  Find what you're looking for
                </p>
              </button>
            </div>
            {errors.type && (
              <span className="text-sm text-red-500 mt-1 block">
                {errors.type}
              </span>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block mb-3 font-medium text-gray-900">
              Category
            </label>
            <div className="grid grid-cols-2 gap-3">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, category: cat.value })
                  }
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    formData.category === cat.value
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-gray-300 bg-white hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{cat.icon}</span>
                    <span className="font-medium">{cat.label}</span>
                  </div>
                  <p className="text-xs text-gray-600">{cat.examples}</p>
                </button>
              ))}
            </div>
            {errors.category && (
              <span className="text-sm text-red-500 mt-1 block">
                {errors.category}
              </span>
            )}
          </div>

          {/* Title */}
          <div>
            <label
              htmlFor="title"
              className="block mb-2 font-medium text-gray-900"
            >
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => {
                setFormData({ ...formData, title: e.target.value });
                setErrors({ ...errors, title: '' });
              }}
              placeholder="Give your listing a clear, descriptive title"
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              }`}
              maxLength={100}
            />
            <div className="flex justify-between mt-1">
              {errors.title && (
                <span className="text-sm text-red-500">{errors.title}</span>
              )}
              <span className="text-sm text-gray-500 ml-auto">
                {formData.title.length}/100
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block mb-2 font-medium text-gray-900"
            >
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => {
                setFormData({ ...formData, description: e.target.value });
                setErrors({ ...errors, description: '' });
              }}
              placeholder="Provide details about what you're offering or looking for..."
              rows={6}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
              maxLength={1000}
            />
            <div className="flex justify-between mt-1">
              {errors.description && (
                <span className="text-sm text-red-500">
                  {errors.description}
                </span>
              )}
              <span className="text-sm text-gray-500 ml-auto">
                {formData.description.length}/1000
              </span>
            </div>
          </div>

          {/* Images */}
          <div>
            <label className="block mb-2 font-medium text-gray-900">
              Photos (Optional)
            </label>
            <div className="space-y-3">
              {formData.images.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {formData.images.map((img, index) => (
                    <div key={index} className="relative aspect-square">
                      <img
                        src={img}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {formData.images.length < 5 && (
                <label className="block">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer">
                    <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-700 font-medium mb-1">Add photos</p>
                    <p className="text-sm text-gray-500">
                      Up to 5 images (JPG, PNG)
                    </p>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* Additional Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="location"
                className="block mb-2 font-medium text-gray-900"
              >
                <MapPin className="w-4 h-4 inline mr-1" />
                Location/Neighborhood
              </label>
              <input
                type="text"
                id="location"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                placeholder="Downtown, East Side, etc."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="availability"
                className="block mb-2 font-medium text-gray-900"
              >
                <Calendar className="w-4 h-4 inline mr-1" />
                Availability
              </label>
              <input
                type="text"
                id="availability"
                value={formData.availability}
                onChange={(e) =>
                  setFormData({ ...formData, availability: e.target.value })
                }
                placeholder="Weekends, Evenings, etc."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* What are you looking for in return */}
          <div>
            <label
              htmlFor="tradingFor"
              className="block mb-2 font-medium text-gray-900"
            >
              What are you looking for in return? (Optional)
            </label>
            <input
              type="text"
              id="tradingFor"
              value={formData.tradingFor}
              onChange={(e) =>
                setFormData({ ...formData, tradingFor: e.target.value })
              }
              placeholder="e.g., Help with gardening, Spanish lessons, or just pay it forward"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Submit Button */}
          <div className="sticky bottom-0 bg-gray-50 pt-4 pb-6 -mx-4 px-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white py-4 rounded-full font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating...
                </span>
              ) : (
                'Create Listing'
              )}
            </button>
            <p className="text-center text-sm text-gray-500 mt-3">
              Your listing will be visible to your neighborhood community
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
