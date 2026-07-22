export interface AppUserMetadata {
  full_name?: string;
  name?: string;
  avatar_url?: string | null;
}

export interface AppUser {
  id: string;
  email: string;
  user_metadata: AppUserMetadata;
}

export interface AppSession {
  user: AppUser;
}
