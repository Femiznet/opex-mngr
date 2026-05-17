import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type SubmissionStatus = 'draft' | 'submitted' | 'verified' | 'failed' | 'invalid' | 'cancelled';

export type Submission = {
  id: string;
  ticket_id: string;
  status: SubmissionStatus;
  edited: boolean;
  total_price: number;
  created_at: string;
  updated_at: string;
  version_index: number;
  contact_email: string | null;
  is_custom_email: boolean;
  image_url: string | null;
  image_attached: boolean;
};

export type SubmissionItem = {
  id: string;
  submission_id: string;
  material_id: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_custom: boolean;
};

export type SubmissionVersion = {
  id: string;
  submission_id: string;
  snapshot: any;
  created_at: string;
};

export function useSubmissions() {
  return useQuery({
    queryKey: ['submissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data as Submission[];
    }
  });
}

export function useSubmission(ticketId: string) {
  return useQuery({
    queryKey: ['submissions', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('ticket_id', ticketId)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as Submission | null;
    },
    enabled: !!ticketId
  });
}

export function useSubmissionItems(submissionId?: string) {
  return useQuery({
    queryKey: ['submission_items', submissionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('submission_items')
        .select('*')
        .eq('submission_id', submissionId)
        .order('name');
      
      if (error) throw error;
      return data as SubmissionItem[];
    },
    enabled: !!submissionId
  });
}

export function useSubmissionVersions(submissionId?: string) {
  return useQuery({
    queryKey: ['submission_versions', submissionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('submission_versions')
        .select('*')
        .eq('submission_id', submissionId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as SubmissionVersion[];
    },
    enabled: !!submissionId
  });
}

export function useSaveSubmission() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      submission, items
    }: {
      submission: Partial<Submission> & { ticket_id: string },
      items: Omit<SubmissionItem, 'id' | 'submission_id'>[]
    }) => {
      // Upsert submission
      const { data: subData, error: subError } = await supabase
        .from('submissions')
        .upsert(submission, { onConflict: 'ticket_id' })
        .select()
        .single();
        
      if (subError) throw subError;
      
      const submissionId = subData.id;
      
      // Delete existing items
      await supabase.from('submission_items').delete().eq('submission_id', submissionId);
      
      // Insert new items
      if (items.length > 0) {
        const itemsToInsert = items.map(item => ({
          ...item,
          submission_id: submissionId
        }));
        
        const { error: itemsError } = await supabase.from('submission_items').insert(itemsToInsert);
        if (itemsError) throw itemsError;
      }
      
      // Save version
      const snapshot = {
        submission: subData,
        items
      };
      
      await supabase.from('submission_versions').insert({
        submission_id: submissionId,
        snapshot
      });
      
      return subData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      queryClient.invalidateQueries({ queryKey: ['submissions', data.ticket_id] });
      queryClient.invalidateQueries({ queryKey: ['submission_items', data.id] });
      queryClient.invalidateQueries({ queryKey: ['submission_versions', data.id] });
    }
  });
}