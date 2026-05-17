import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type Category = {
  id: string;
  name: string;
};

export type Material = {
  id: string;
  category_id: string | null;
  name: string;
  price: number;
  qty_available: number;
};

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Category[];
    }
  });
}

export function useMaterials() {
  return useQuery({
    queryKey: ['materials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Material[];
    }
  });
}