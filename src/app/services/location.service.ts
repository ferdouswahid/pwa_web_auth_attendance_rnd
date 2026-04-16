import { Injectable } from '@angular/core';

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
}

@Injectable({ providedIn: 'root' })
export class LocationService {
  getCurrentLocation(): Promise<Coordinates> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        pos =>
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }),
        err => {
          switch (err.code) {
            case err.PERMISSION_DENIED:
              reject(new Error('Location permission denied. Please enable it in browser settings.'));
              break;
            case err.POSITION_UNAVAILABLE:
              reject(new Error('Location unavailable. Please check your device settings.'));
              break;
            case err.TIMEOUT:
              reject(new Error('Location request timed out. Please try again.'));
              break;
            default:
              reject(new Error(err.message));
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
    });
  }

  watchPosition(
    onSuccess: (coords: Coordinates) => void,
    onError: (error: Error) => void,
  ): number {
    return navigator.geolocation.watchPosition(
      pos =>
        onSuccess({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      err => onError(new Error(err.message)),
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
  }

  clearWatch(watchId: number): void {
    navigator.geolocation.clearWatch(watchId);
  }
}
