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
      checklists: {
        Row: {
          completed_at: string | null
          created_at: string
          floor_swept: boolean
          id: string
          machines_cleaned: boolean
          machines_disconnected: boolean
          settlement_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          floor_swept?: boolean
          id?: string
          machines_cleaned?: boolean
          machines_disconnected?: boolean
          settlement_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          floor_swept?: boolean
          id?: string
          machines_cleaned?: boolean
          machines_disconnected?: boolean
          settlement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklists_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "settlements"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_products: {
        Row: {
          config_id: string
          created_at: string
          id: string
          product_name: string
          quantity: number
          unit_price: number
        }
        Insert: {
          config_id: string
          created_at?: string
          id?: string
          product_name: string
          quantity?: number
          unit_price?: number
        }
        Update: {
          config_id?: string
          created_at?: string
          id?: string
          product_name?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "custom_products_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "daily_config"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_config: {
        Row: {
          base_money: number
          closing_hour: string | null
          config_date: string
          created_at: string
          created_by: string | null
          id: string
          initial_tokens: number
          opening_hour: string | null
          updated_at: string
        }
        Insert: {
          base_money?: number
          closing_hour?: string | null
          config_date: string
          created_at?: string
          created_by?: string | null
          id?: string
          initial_tokens?: number
          opening_hour?: string | null
          updated_at?: string
        }
        Update: {
          base_money?: number
          closing_hour?: string | null
          config_date?: string
          created_at?: string
          created_by?: string | null
          id?: string
          initial_tokens?: number
          opening_hour?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      settlement_products: {
        Row: {
          created_at: string
          final_quantity: number
          id: string
          initial_quantity: number
          product_name: string
          settlement_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          final_quantity?: number
          id?: string
          initial_quantity?: number
          product_name: string
          settlement_id: string
          unit_price?: number
        }
        Update: {
          created_at?: string
          final_quantity?: number
          id?: string
          initial_quantity?: number
          product_name?: string
          settlement_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "settlement_products_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "settlements"
            referencedColumns: ["id"]
          },
        ]
      }
      settlements: {
        Row: {
          arcade_coupons: number
          arcade_sales: number
          base_money: number
          closing_notes: string | null
          created_at: string
          final_tokens: number
          gross_total: number
          id: string
          initial_tokens: number
          nequi_deposits: number
          net_profit: number
          opening_notes: string | null
          settlement_date: string
          updated_at: string
          vr_coupons: number
          vr_sales: number
          vr_uses: number
          worker_id: string
        }
        Insert: {
          arcade_coupons?: number
          arcade_sales?: number
          base_money?: number
          closing_notes?: string | null
          created_at?: string
          final_tokens?: number
          gross_total?: number
          id?: string
          initial_tokens?: number
          nequi_deposits?: number
          net_profit?: number
          opening_notes?: string | null
          settlement_date: string
          updated_at?: string
          vr_coupons?: number
          vr_sales?: number
          vr_uses?: number
          worker_id: string
        }
        Update: {
          arcade_coupons?: number
          arcade_sales?: number
          base_money?: number
          closing_notes?: string | null
          created_at?: string
          final_tokens?: number
          gross_total?: number
          id?: string
          initial_tokens?: number
          nequi_deposits?: number
          net_profit?: number
          opening_notes?: string | null
          settlement_date?: string
          updated_at?: string
          vr_coupons?: number
          vr_sales?: number
          vr_uses?: number
          worker_id?: string
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
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      app_role: "admin" | "worker"
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
      app_role: ["admin", "worker"],
    },
  },
} as const
