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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      cards: {
        Row: {
          body: string
          category: string
          created_at: string
          due_at: string | null
          google_event_id: string | null
          group_id: string | null
          id: string
          image_url: string | null
          routed_type: string | null
          source: string
          status: string
          summary: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string
          category?: string
          created_at?: string
          due_at?: string | null
          google_event_id?: string | null
          group_id?: string | null
          id?: string
          image_url?: string | null
          routed_type?: string | null
          source?: string
          status?: string
          summary?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          due_at?: string | null
          google_event_id?: string | null
          group_id?: string | null
          id?: string
          image_url?: string | null
          routed_type?: string | null
          source?: string
          status?: string
          summary?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_brief_dismissals: {
        Row: {
          created_at: string
          dismissed_date: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dismissed_date?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dismissed_date?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_brief_settings: {
        Row: {
          calendars: string[]
          created_at: string
          delivery_time: string
          enabled: boolean
          id: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          calendars?: string[]
          created_at?: string
          delivery_time?: string
          enabled?: boolean
          id?: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          calendars?: string[]
          created_at?: string
          delivery_time?: string
          enabled?: boolean
          id?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      device_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      household_invites: {
        Row: {
          created_at: string
          expires_at: string
          household_id: string
          id: string
          token: string
          used_by: string[]
        }
        Insert: {
          created_at?: string
          expires_at?: string
          household_id: string
          id?: string
          token?: string
          used_by?: string[]
        }
        Update: {
          created_at?: string
          expires_at?: string
          household_id?: string
          id?: string
          token?: string
          used_by?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "household_invites_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          household_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          household_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          household_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          id: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
        }
        Relationships: []
      }
      people: {
        Row: {
          created_at: string
          draft_message: string
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          draft_message?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          draft_message?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birthdays_enabled: boolean | null
          created_at: string
          display_name: string | null
          email: string | null
          google_access_token: string | null
          google_refresh_token: string | null
          google_token_expires_at: string | null
          id: string
          onboarding_completed: boolean | null
          selected_calendars: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          birthdays_enabled?: boolean | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          google_access_token?: string | null
          google_refresh_token?: string | null
          google_token_expires_at?: string | null
          id?: string
          onboarding_completed?: boolean | null
          selected_calendars?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          birthdays_enabled?: boolean | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          google_access_token?: string | null
          google_refresh_token?: string | null
          google_token_expires_at?: string | null
          id?: string
          onboarding_completed?: boolean | null
          selected_calendars?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reflection_summaries: {
        Row: {
          created_at: string
          dismissed: boolean
          id: string
          period_start: string
          period_type: string
          recurring_patterns: string
          texture: string
          unresolved_threads: string
          user_id: string
          what_created_it: string
          what_this_reveals: string
        }
        Insert: {
          created_at?: string
          dismissed?: boolean
          id?: string
          period_start: string
          period_type?: string
          recurring_patterns?: string
          texture?: string
          unresolved_threads?: string
          user_id: string
          what_created_it?: string
          what_this_reveals?: string
        }
        Update: {
          created_at?: string
          dismissed?: boolean
          id?: string
          period_start?: string
          period_type?: string
          recurring_patterns?: string
          texture?: string
          unresolved_threads?: string
          user_id?: string
          what_created_it?: string
          what_this_reveals?: string
        }
        Relationships: []
      }
      reflections: {
        Row: {
          created_at: string
          energy_drainers: string[]
          energy_givers: string[]
          id: string
          raw_transcript: string
          reflection_date: string
          summary: string
          texture: string
          texture_why: string
          unresolved_threads: string[]
          user_id: string
          what_this_reveals: string
        }
        Insert: {
          created_at?: string
          energy_drainers?: string[]
          energy_givers?: string[]
          id?: string
          raw_transcript?: string
          reflection_date?: string
          summary?: string
          texture?: string
          texture_why?: string
          unresolved_threads?: string[]
          user_id: string
          what_this_reveals?: string
        }
        Update: {
          created_at?: string
          energy_drainers?: string[]
          energy_givers?: string[]
          id?: string
          raw_transcript?: string
          reflection_date?: string
          summary?: string
          texture?: string
          texture_why?: string
          unresolved_threads?: string[]
          user_id?: string
          what_this_reveals?: string
        }
        Relationships: []
      }
      weekly_syntheses: {
        Row: {
          created_at: string
          dismissed: boolean
          domains: Json
          id: string
          narrative: string
          stale_items: Json
          total_cards_analyzed: number
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          dismissed?: boolean
          domains?: Json
          id?: string
          narrative?: string
          stale_items?: Json
          total_cards_analyzed?: number
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          dismissed?: boolean
          domains?: Json
          id?: string
          narrative?: string
          stale_items?: Json
          total_cards_analyzed?: number
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_household_member: {
        Args: { _owner_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
