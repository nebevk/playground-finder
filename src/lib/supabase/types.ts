export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      favorites: {
        Row: {
          created_at: string
          playground_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          playground_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          playground_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_playground_id_fkey"
            columns: ["playground_id"]
            isOneToOne: false
            referencedRelation: "playgrounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_playground_id_fkey"
            columns: ["playground_id"]
            isOneToOne: false
            referencedRelation: "playgrounds_geo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          created_at: string
          flagged: boolean
          id: string
          playground_id: string
          storage_path: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          flagged?: boolean
          id?: string
          playground_id: string
          storage_path: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          flagged?: boolean
          id?: string
          playground_id?: string
          storage_path?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photos_playground_id_fkey"
            columns: ["playground_id"]
            isOneToOne: false
            referencedRelation: "playgrounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_playground_id_fkey"
            columns: ["playground_id"]
            isOneToOne: false
            referencedRelation: "playgrounds_geo"
            referencedColumns: ["id"]
          },
        ]
      }
      playgrounds: {
        Row: {
          created_at: string
          description: string | null
          equipment: Json
          flagged: boolean
          has_parking: boolean
          has_shade: boolean
          has_toilets: boolean
          has_water: boolean
          id: string
          is_fenced: boolean
          location: unknown
          name: string
          surface_type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          equipment?: Json
          flagged?: boolean
          has_parking?: boolean
          has_shade?: boolean
          has_toilets?: boolean
          has_water?: boolean
          id?: string
          is_fenced?: boolean
          location: unknown
          name: string
          surface_type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          equipment?: Json
          flagged?: boolean
          has_parking?: boolean
          has_shade?: boolean
          has_toilets?: boolean
          has_water?: boolean
          id?: string
          is_fenced?: boolean
          location?: unknown
          name?: string
          surface_type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          username?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          flagged: boolean
          helpful_count: number
          id: string
          playground_id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          flagged?: boolean
          helpful_count?: number
          id?: string
          playground_id: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          flagged?: boolean
          helpful_count?: number
          id?: string
          playground_id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_playground_id_fkey"
            columns: ["playground_id"]
            isOneToOne: false
            referencedRelation: "playgrounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_playground_id_fkey"
            columns: ["playground_id"]
            isOneToOne: false
            referencedRelation: "playgrounds_geo"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      playgrounds_geo: {
        Row: {
          created_at: string | null
          description: string | null
          equipment: Json | null
          flagged: boolean | null
          has_parking: boolean | null
          has_shade: boolean | null
          has_toilets: boolean | null
          has_water: boolean | null
          id: string | null
          is_fenced: boolean | null
          lat: number | null
          lng: number | null
          name: string | null
          surface_type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          equipment?: Json | null
          flagged?: boolean | null
          has_parking?: boolean | null
          has_shade?: boolean | null
          has_toilets?: boolean | null
          has_water?: boolean | null
          id?: string | null
          is_fenced?: boolean | null
          lat?: never
          lng?: never
          name?: string | null
          surface_type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          equipment?: Json | null
          flagged?: boolean | null
          has_parking?: boolean | null
          has_shade?: boolean | null
          has_toilets?: boolean | null
          has_water?: boolean | null
          id?: string | null
          is_fenced?: boolean | null
          lat?: never
          lng?: never
          name?: string | null
          surface_type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

