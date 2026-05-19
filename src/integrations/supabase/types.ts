export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }

  public: {
    Tables: {
      categories: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }

      materials: {
        Row: {
          category_id: number
          id: number
          name: string
          price: number
          qty_available: number
        }
        Insert: {
          category_id: number
          id?: number
          name: string
          price?: number
          qty_available?: number
        }
        Update: {
          category_id?: number
          id?: number
          name?: string
          price?: number
          qty_available?: number
        }
        Relationships: [
          {
            foreignKeyName: "materials_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }

      tickets: {
        Row: {
          id: number
          ticket_id: string
          ticket_owner: string
          subject: string
          description: string | null
          created_time: string
          closed_time: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          address: string | null
          location: string | null
          request_coverage: string | null
          request_category: string | null
        }
        Insert: {
          id?: number
          ticket_id: string
          ticket_owner: string
          subject: string
          description?: string | null
          created_time?: string
          closed_time?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          address?: string | null
          location?: string | null
          request_coverage?: string | null
          request_category?: string | null
        }
        Update: {
          id?: number
          ticket_id?: string
          ticket_owner?: string
          subject?: string
          description?: string | null
          created_time?: string
          closed_time?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          address?: string | null
          location?: string | null
          request_coverage?: string | null
          request_category?: string | null
        }
        Relationships: []
      }

      submissions: {
        Row: {
          id: number
          ticket_id: string
          status: Database["public"]["Enums"]["submission_status"]
          edited: boolean
          total_price: number
          created_at: string
          updated_at: string
          version_index: number
          contact_email: string | null
          is_custom_email: boolean
          image_url: string | null
          image_attached: boolean
        }
        Insert: {
          id?: number
          ticket_id: string
          status?: Database["public"]["Enums"]["submission_status"]
          edited?: boolean
          total_price?: number
          created_at?: string
          updated_at?: string
          version_index?: number
          contact_email?: string | null
          is_custom_email?: boolean
          image_url?: string | null
          image_attached?: boolean
        }
        Update: {
          id?: number
          ticket_id?: string
          status?: Database["public"]["Enums"]["submission_status"]
          edited?: boolean
          total_price?: number
          created_at?: string
          updated_at?: string
          version_index?: number
          contact_email?: string | null
          is_custom_email?: boolean
          image_url?: string | null
          image_attached?: boolean
        }
        Relationships: []
      }

      submission_items: {
        Row: {
          id: number
          submission_id: number
          material_id: number | null
          name: string
          quantity: number
          unit_price: number
          total_price: number
          is_custom: boolean
        }
        Insert: {
          id?: number
          submission_id: number
          material_id?: number | null
          name: string
          quantity: number
          unit_price: number
          total_price: number
          is_custom?: boolean
        }
        Update: {
          id?: number
          submission_id?: number
          material_id?: number | null
          name?: string
          quantity?: number
          unit_price?: number
          total_price?: number
          is_custom?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "submission_items_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          }
        ]
      }

      submission_versions: {
        Row: {
          id: number
          submission_id: number
          snapshot: Json
          created_at: string
        }
        Insert: {
          id?: number
          submission_id: number
          snapshot: Json
          created_at?: string
        }
        Update: {
          id?: number
          submission_id?: number
          snapshot?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_versions_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          }
        ]
      }
    }

    Views: {}

    Functions: {}

    Enums: {
      submission_status:
        | "draft"
        | "submitted"
        | "verified"
        | "failed"
        | "invalid"
        | "cancelled"
      ticket_status: "open" | "closed"
    }

    CompositeTypes: {}
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
      DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
      DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  public: {
    Enums: {
      submission_status: [
        "draft",
        "submitted",
        "verified",
        "failed",
        "invalid",
        "cancelled"
      ],
      ticket_status: ["open", "closed"]
    }
  }
} as const