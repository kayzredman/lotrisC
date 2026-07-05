import { apiFetch } from './lotris-api';

export interface DeviceTokenDto {
  id: string;
  platform: string;
  deviceLabel: string | null;
  createdAt: string;
  updatedAt: string;
}

export function registerDevice(
  token: string,
  accessToken: string,
  deviceLabel?: string,
) {
  return apiFetch<DeviceTokenDto>('/api/v1/devices/register', {
    method: 'POST',
    token: accessToken,
    body: {
      platform: 'expo',
      token,
      deviceLabel,
    },
  });
}

export function revokeDevice(deviceId: string, accessToken: string) {
  return apiFetch<void>(`/api/v1/devices/${deviceId}`, {
    method: 'DELETE',
    token: accessToken,
  });
}

export function listDevices(accessToken: string) {
  return apiFetch<DeviceTokenDto[]>('/api/v1/devices', { token: accessToken });
}
