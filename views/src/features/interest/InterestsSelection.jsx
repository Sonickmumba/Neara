// import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

import {
  toggleCategory,
  setSelectedCategories,
  clearSelectedCategories,
} from './interestsSelectionSlice';

export function InterestsSelectionScreen() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { categories, selectedCategoryIds } = useSelector(
    (state) => state.interests
  );

  const handleContinue = () => {
    if (selectedCategoryIds.length > 0) {
      navigate('/loginSignup');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between bg-white border-b border-gray-200">
        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-sm font-medium text-gray-600">
          {selectedCategoryIds.length} selected
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              What interests you?
            </h1>
            <p className="text-lg text-gray-600">
              Choose categories to personalize your feed
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Select at least 3 to continue
            </p>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {categories.map((category) => {
              const isSelected = selectedCategoryIds.includes(category.id);

              return (
                <button
                  key={category.id}
                //   onClick={() => toggleCategory(category.id)}
                onClick={() => dispatch(toggleCategory(category.id))}
                  className={`relative p-6 rounded-2xl border-2 transition-all text-left ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 shadow-lg scale-105'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                  }`}
                >
                  {/* Selection Indicator */}
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}

                  {/* Icon */}
                  <div className="text-4xl mb-3">{category.icon}</div>

                  {/* Name */}
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {category.name}
                  </h3>

                  {/* Examples */}
                  <p className="text-sm text-gray-600">{category.examples}</p>
                </button>
              );
            })}
          </div>

          {/* Quick Select */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
            <h3 className="font-semibold text-gray-900 mb-4">Quick Select</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() =>
                  dispatch(setSelectedCategories(['skills', 'goods', 'services']))
                }
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium hover:bg-blue-200 transition-colors"
              >
                Popular Picks
              </button>
              <button
                onClick={() =>
                  dispatch(setSelectedCategories(['food', 'home', 'creative']))
                }
                className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium hover:bg-green-200 transition-colors"
              >
                Home & Creative
              </button>
              <button
                onClick={() =>
                  dispatch(setSelectedCategories(['tech', 'services', 'transport']))
                }
                className="px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium hover:bg-purple-200 transition-colors"
              >
                Tech & Services
              </button>
              <button
                onClick={() =>
                  dispatch(setSelectedCategories(categories.map((c) => c.id)))
                }
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Select All
              </button>
              <button
                onClick={() => dispatch(clearSelectedCategories())}

                className="px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-medium hover:bg-red-200 transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer with CTA */}
      <div className="bg-white border-t border-gray-200 px-6 py-6">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={handleContinue}
            disabled={selectedCategoryIds.length < 3}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-full font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
          >
            <span>
              Continue
              {selectedCategoryIds.length >= 3 &&
                ` with ${selectedCategoryIds.length} categories`}
            </span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          {selectedCategoryIds.length < 3 && (
            <p className="text-center text-sm text-red-600 mt-3">
              Please select at least 3 categories to continue
            </p>
          )}

          {/* Progress */}
          <div className="flex items-center justify-center gap-2 mt-6">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
            <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
          </div>
          <p className="text-center text-xs text-gray-500 mt-2">Step 3 of 5</p>
        </div>
      </div>
    </div>
  );
}
