// features/apartments/types.ts

export type ApartmentRecord = {
  id: string;
  user_id: string;
  apartment_number: string;
  location: string;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
};

export type Photo = {
  id: string;
  user_id: string;
  apartment_id: string;
  storage_path: string;
  public_url: string;
  created_at: string;
};

export type ApartmentRecordWithPhotos = ApartmentRecord & {
  photos: Photo[];
};
