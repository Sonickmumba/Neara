// import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  ArrowLeft,
  MapPin,
  Navigation,
  Shield,
  Users,
  Check,
} from 'lucide-react';

import {
  requestLocationPermission,
  skipLocationPermission,
} from './locationPermissionSlice';

const BENEFITS = [
  {
    icon: Users,
    title: 'Find Nearby Neighbors',
    description: 'Discover and trade with people in your immediate area',
  },
  {
    icon: MapPin,
    title: 'See Local Listings',
    description: 'View opportunities closest to you on the map',
  },
  {
    icon: Shield,
    title: 'Stay Safe',
    description: 'Meet in your neighborhood with verified local members',
  },
];

export function LocationPermission() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isGranting, permissionGranted } = useSelector(
    (state) => state.locationPermission
  );

  const handleAllowLocation = async () => {
    const result = await dispatch(requestLocationPermission());

    if (requestLocationPermission.fulfilled.match(result)) {
      setTimeout(() => {
        navigate('/interests-selection');
      }, 1000);
    }
  };

  const handleSkip = () => {
    dispatch(skipLocationPermission());
    navigate('/interests-selection');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-white rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Icon */}
        <div className="mb-8 relative">
          <div className="w-32 h-32 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg">
              <MapPin className="w-12 h-12 text-blue-600" />
            </div>
          </div>
          <div className="absolute bottom-0 right-0 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
            <Navigation className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-3 text-center">
          Enable Location Access
        </h1>
        <p className="text-lg text-gray-600 mb-12 text-center max-w-md">
          Help us connect you with neighbors and opportunities nearby
        </p>

        {/* Benefits */}
        <div className="w-full max-w-md space-y-4 mb-12">
          {BENEFITS.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-2xl p-5 border border-gray-200 hover:border-blue-300 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {benefit.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Privacy Note */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-8 max-w-md w-full">
          <div className="flex gap-3">
            <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-green-900 mb-1">
                Your privacy matters
              </h4>
              <p className="text-sm text-green-700">
                We only use your location to show you relevant local content.
                You can change this anytime in settings.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="w-full max-w-md space-y-3">
          <button
            onClick={handleAllowLocation}
            disabled={isGranting || permissionGranted}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-full font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {permissionGranted ? (
              <>
                <Check className="w-5 h-5" />
                <span>Location Enabled</span>
              </>
            ) : isGranting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Requesting Permission...</span>
              </>
            ) : (
              <>
                <Navigation className="w-5 h-5" />
                <span>Enable Location</span>
              </>
            )}
          </button>

          <button
            onClick={handleSkip}
            className="w-full bg-white border-2 border-gray-300 text-gray-700 py-4 rounded-full font-semibold hover:bg-gray-50 transition-colors"
          >
            Skip for Now
          </button>
        </div>

        <p className="mt-4 text-sm text-gray-500 text-center max-w-md">
          You can manually enter your neighborhood in the next step
        </p>
      </div>

      {/* Progress */}
      <div className="px-6 py-6">
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
          <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
          <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
          <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
        </div>
        <p className="text-center text-xs text-gray-500 mt-2">Step 2 of 5</p>
      </div>
    </div>
  );
}
