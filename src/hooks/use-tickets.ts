import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type Ticket = {
  id: string;
  ticket_id: string;
  ticket_owner: string;
  subject: string;
  description: string | null;
  created_time: string;
  closed_time: string | null;
  status: 'open' | 'closed';
  address: string | null;
  location: string | null;
  request_coverage: string | null;
  request_category: string | null;
};

export function useTickets() {
  return useQuery({
    queryKey: ['tickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_time', { ascending: false });
      
      if (error) throw error;
      return data as Ticket[];
    }
  });
}

export function useTicket(ticketId: string) {
  return useQuery({
    queryKey: ['tickets', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('ticket_id', ticketId)
        .single();
      
      if (error) throw error;
      return data as Ticket;
    },
    enabled: !!ticketId
  });
}