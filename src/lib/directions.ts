// Cross-platform "open directions" link. Google Maps' universal directions URL
// hands off to the native Maps app on iOS/Android and the web app on desktop.
export function directionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
