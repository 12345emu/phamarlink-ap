# Google Maps API Setup for Better Location Accuracy

## Why Google Maps API?

The current GPS location might not be accurate enough for specific locations like International Maritime Hospital. Google Maps API provides more precise location data through:

1. **Better Geocoding** - More accurate address resolution
2. **Places API** - Specific business/hospital locations
3. **Reverse Geocoding** - Better coordinate-to-address conversion

## Setup Instructions

### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable billing (required for API usage)

### 2. Enable Required APIs
1. Go to "APIs & Services" > "Library"
2. Search for and enable these APIs:
   - **Geocoding API**
   - **Places API**
   - **Maps JavaScript API** (optional, for future use)

### 3. Create API Key
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy the generated API key

### 4. Restrict API Key (Recommended)
1. Click on the created API key
2. Under "Application restrictions", select "Android apps" or "iOS apps"
3. Add your app's package name and SHA-1 fingerprint
4. Under "API restrictions", select "Restrict key"
5. Select only the APIs you enabled (Geocoding, Places)

### 5. Update the Code
1. Open `app/hospital-registration.tsx`
2. Find the line: `const GOOGLE_MAPS_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY';`
3. Replace `'YOUR_GOOGLE_MAPS_API_KEY'` with your actual API key

## Example API Key Usage

```typescript
const GOOGLE_MAPS_API_KEY = 'AIzaSyB...'; // Your actual API key
```

## Cost Information

- **Geocoding API**: $5 per 1,000 requests
- **Places API**: $17 per 1,000 requests
- **Free tier**: $200 credit per month

For typical usage, this should be free or very low cost.

## Testing

After setup, the app will:
1. Try Google Maps API first for precise location
2. Fall back to Expo Location if Google Maps fails
3. Show location quality indicators
4. Provide manual entry option for exact coordinates

## International Maritime Hospital Coordinates

Approximate coordinates for International Maritime Hospital:
- **Latitude**: 5.6037
- **Longitude**: -0.0169
- **Address**: Tema, Ghana

You can manually enter these coordinates if GPS is not accurate enough.
