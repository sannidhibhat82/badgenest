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
      api_keys: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          permissions: Json
          revoked: boolean
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          permissions?: Json
          revoked?: boolean
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          permissions?: Json
          revoked?: boolean
        }
        Relationships: []
      }
      assertions: {
        Row: {
          badge_class_id: string
          created_at: string
          evidence_url: string | null
          expires_at: string | null
          id: string
          issued_at: string
          recipient_id: string
          revocation_reason: string | null
          revoked: boolean
          signature: string | null
          snapshot_json: Json | null
          updated_at: string
        }
        Insert: {
          badge_class_id: string
          created_at?: string
          evidence_url?: string | null
          expires_at?: string | null
          id?: string
          issued_at?: string
          recipient_id: string
          revocation_reason?: string | null
          revoked?: boolean
          signature?: string | null
          snapshot_json?: Json | null
          updated_at?: string
        }
        Update: {
          badge_class_id?: string
          created_at?: string
          evidence_url?: string | null
          expires_at?: string | null
          id?: string
          issued_at?: string
          recipient_id?: string
          revocation_reason?: string | null
          revoked?: boolean
          signature?: string | null
          snapshot_json?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assertions_badge_class_id_fkey"
            columns: ["badge_class_id"]
            isOneToOne: false
            referencedRelation: "badge_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      badge_categories: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      badge_class_categories: {
        Row: {
          badge_class_id: string
          category_id: string
          id: string
        }
        Insert: {
          badge_class_id: string
          category_id: string
          id?: string
        }
        Update: {
          badge_class_id?: string
          category_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "badge_class_categories_badge_class_id_fkey"
            columns: ["badge_class_id"]
            isOneToOne: false
            referencedRelation: "badge_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "badge_class_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "badge_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      badge_classes: {
        Row: {
          created_at: string
          criteria: string | null
          description: string | null
          expiry_days: number | null
          id: string
          image_url: string | null
          issuer_id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          criteria?: string | null
          description?: string | null
          expiry_days?: number | null
          id?: string
          image_url?: string | null
          issuer_id: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          criteria?: string | null
          description?: string | null
          expiry_days?: number | null
          id?: string
          image_url?: string | null
          issuer_id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "badge_classes_issuer_id_fkey"
            columns: ["issuer_id"]
            isOneToOne: false
            referencedRelation: "issuers"
            referencedColumns: ["id"]
          },
        ]
      }
      badge_invites: {
        Row: {
          badge_class_id: string
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          email: string
          evidence_url: string | null
          id: string
          invite_token: string
          invited_by: string
          status: string
        }
        Insert: {
          badge_class_id: string
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          email: string
          evidence_url?: string | null
          id?: string
          invite_token?: string
          invited_by: string
          status?: string
        }
        Update: {
          badge_class_id?: string
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          email?: string
          evidence_url?: string | null
          id?: string
          invite_token?: string
          invited_by?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "badge_invites_badge_class_id_fkey"
            columns: ["badge_class_id"]
            isOneToOne: false
            referencedRelation: "badge_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      badge_views: {
        Row: {
          assertion_id: string
          id: string
          viewed_at: string
          viewer_hash: string | null
        }
        Insert: {
          assertion_id: string
          id?: string
          viewed_at?: string
          viewer_hash?: string | null
        }
        Update: {
          assertion_id?: string
          id?: string
          viewed_at?: string
          viewer_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "badge_views_assertion_id_fkey"
            columns: ["assertion_id"]
            isOneToOne: false
            referencedRelation: "assertions"
            referencedColumns: ["id"]
          },
        ]
      }
      issuers: {
        Row: {
          created_at: string
          description: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_tags: {
        Row: {
          created_at: string
          id: string
          profile_user_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_user_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_user_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_tags_profile_user_id_fkey"
            columns: ["profile_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "profile_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhooks: {
        Row: {
          active: boolean
          created_at: string
          created_by: string
          events: string[]
          failure_count: number
          id: string
          last_triggered_at: string | null
          secret: string
          updated_at: string
          url: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by: string
          events?: string[]
          failure_count?: number
          id?: string
          last_triggered_at?: string | null
          secret: string
          updated_at?: string
          url: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string
          events?: string[]
          failure_count?: number
          id?: string
          last_triggered_at?: string | null
          secret?: string
          updated_at?: string
          url?: string
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
      app_role: "admin" | "learner"
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
      app_role: ["admin", "learner"],
    },
  },
} as const
