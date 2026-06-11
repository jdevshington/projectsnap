// features/apartments/types.ts

export type ApartmentRecord = {
  id: string;
  user_id: string;
  apartment_number: string;
  location: string;
  notes: string | null;
  created_at: string;
};
