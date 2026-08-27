// src/utils/geocoding.ts

/**
 * Converts a street address string into GPS coordinates (latitude & longitude)
 * using OpenStreetMap Nominatim.
 */
export async function geocodeAddress(addressString: string): Promise<{ latitude: number; longitude: number } | null> {
  if (!addressString || !addressString.trim()) return null;

  try {
    const encodedAddress = encodeURIComponent(addressString);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`
    );
    const data = await response.json();

    if (data && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
      };
    }
    return null;
  } catch (error) {
    console.error('Failed to geocode address:', error);
    return null;
  }
}