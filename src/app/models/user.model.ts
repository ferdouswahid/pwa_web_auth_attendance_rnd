export interface User {
  id?: number;
  username: string;
  passwordHash: string;
  credentialId?: string;
  zoneIds?: number[];
}
