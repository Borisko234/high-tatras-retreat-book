export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      bookings: {
        Row: {
          adults_count: number
          check_in: string
          check_out: string
          children_count: number
          created_at: string
          deposit_amount: number | null
          guest_email: string
          guest_name: string
          guest_phone: string | null
          guests_count: number
          id: string
          message: string | null
          payment_status: string
          pets_count: number
          source: Database["public"]["Enums"]["booking_source"]
          status: Database["public"]["Enums"]["booking_status"]
          total_price: number | null
          updated_at: string
        }
        Insert: {
          adults_count?: number
          check_in: string
          check_out: string
          children_count?: number
          created_at?: string
          deposit_amount?: number | null
          guest_email: string
          guest_name: string
          guest_phone?: string | null
          guests_count: number
          id?: string
          message?: string | null
          payment_status?: string
          pets_count?: number
          source?: Database["public"]["Enums"]["booking_source"]
          status?: Database["public"]["Enums"]["booking_status"]
          total_price?: number | null
          updated_at?: string
        }
        Update: {
          adults_count?: number
          check_in?: string
          check_out?: string
          children_count?: number
          created_at?: string
          deposit_amount?: number | null
          guest_email?: string
          guest_name?: string
          guest_phone?: string | null
          guests_count?: number
          id?: string
          message?: string | null
          payment_status?: string
          pets_count?: number
          source?: Database["public"]["Enums"]["booking_source"]
          status?: Database["public"]["Enums"]["booking_status"]
          total_price?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          read: boolean
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          read?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          read?: boolean
        }
        Relationships: []
      }
      gallery_images: {
        Row: {
          active: boolean
          alt: string | null
          created_at: string
          id: string
          position: number
          storage_path: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          alt?: string | null
          created_at?: string
          id?: string
          position?: number
          storage_path: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          alt?: string | null
          created_at?: string
          id?: string
          position?: number
          storage_path?: string
          updated_at?: string
        }
        Relationships: []
      }
      ical_feeds: {
        Row: {
          color: string
          created_at: string
          enabled: boolean
          id: string
          label: string
          last_error: string | null
          last_synced_at: string | null
          updated_at: string
          url: string
        }
        Insert: {
          color?: string
          created_at?: string
          enabled?: boolean
          id?: string
          label: string
          last_error?: string | null
          last_synced_at?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          color?: string
          created_at?: string
          enabled?: boolean
          id?: string
          label?: string
          last_error?: string | null
          last_synced_at?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      imported_events: {
        Row: {
          created_at: string
          ends_on: string
          feed_id: string
          id: string
          starts_on: string
          summary: string | null
          uid: string
        }
        Insert: {
          created_at?: string
          ends_on: string
          feed_id: string
          id?: string
          starts_on: string
          summary?: string | null
          uid: string
        }
        Update: {
          created_at?: string
          ends_on?: string
          feed_id?: string
          id?: string
          starts_on?: string
          summary?: string | null
          uid?: string
        }
        Relationships: [
          {
            foreignKeyName: "imported_events_feed_id_fkey"
            columns: ["feed_id"]
            isOneToOne: false
            referencedRelation: "ical_feeds"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_blocks: {
        Row: {
          color: string
          created_at: string
          ends_on: string
          id: string
          reason: string | null
          starts_on: string
        }
        Insert: {
          color?: string
          created_at?: string
          ends_on: string
          id?: string
          reason?: string | null
          starts_on: string
        }
        Update: {
          color?: string
          created_at?: string
          ends_on?: string
          id?: string
          reason?: string | null
          starts_on?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      booking_source: "direct" | "manual"
      booking_status: "pending" | "confirmed" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
    : never = never,
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
    : never = never,
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
    : never = never,
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
    : never = never,
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
      app_role: ["admin", "user"],
      booking_source: ["direct", "manual"],
      booking_status: ["pending", "confirmed", "cancelled"],
    },
  },
} as const
