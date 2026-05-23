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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      complaints: {
        Row: {
          category: string
          complaint_number: string
          created_at: string
          created_by: string | null
          description: string
          guest_feedback: string | null
          guest_id: string | null
          guest_stay_id: string | null
          id: string
          priority: Database["public"]["Enums"]["complaint_priority"]
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["complaint_status"]
          updated_at: string
        }
        Insert: {
          category: string
          complaint_number: string
          created_at?: string
          created_by?: string | null
          description: string
          guest_feedback?: string | null
          guest_id?: string | null
          guest_stay_id?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["complaint_priority"]
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
          updated_at?: string
        }
        Update: {
          category?: string
          complaint_number?: string
          created_at?: string
          created_by?: string | null
          description?: string
          guest_feedback?: string | null
          guest_id?: string | null
          guest_stay_id?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["complaint_priority"]
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaints_guest_stay_id_fkey"
            columns: ["guest_stay_id"]
            isOneToOne: false
            referencedRelation: "guest_stays"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_preferences: {
        Row: {
          allergies: string[] | null
          created_at: string
          dietary_restrictions: string[] | null
          favorite_categories: string[] | null
          id: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allergies?: string[] | null
          created_at?: string
          dietary_restrictions?: string[] | null
          favorite_categories?: string[] | null
          id?: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allergies?: string[] | null
          created_at?: string
          dietary_restrictions?: string[] | null
          favorite_categories?: string[] | null
          id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      guest_stays: {
        Row: {
          actual_check_in: string | null
          actual_check_out: string | null
          check_in_date: string
          check_out_date: string
          created_at: string
          created_by: string | null
          guest_email: string | null
          guest_id: string | null
          guest_name: string
          guest_phone: string | null
          id: string
          notes: string | null
          room_id: string
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          actual_check_in?: string | null
          actual_check_out?: string | null
          check_in_date: string
          check_out_date: string
          created_at?: string
          created_by?: string | null
          guest_email?: string | null
          guest_id?: string | null
          guest_name: string
          guest_phone?: string | null
          id?: string
          notes?: string | null
          room_id: string
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          actual_check_in?: string | null
          actual_check_out?: string | null
          check_in_date?: string
          check_out_date?: string
          created_at?: string
          created_by?: string | null
          guest_email?: string | null
          guest_id?: string | null
          guest_name?: string
          guest_phone?: string | null
          id?: string
          notes?: string | null
          room_id?: string
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_stays_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          cost_per_unit: number | null
          created_at: string
          current_stock: number
          expiry_date: string | null
          id: string
          is_perishable: boolean
          min_stock: number
          name: string
          supplier: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          cost_per_unit?: number | null
          created_at?: string
          current_stock?: number
          expiry_date?: string | null
          id?: string
          is_perishable?: boolean
          min_stock?: number
          name: string
          supplier?: string | null
          unit: string
          updated_at?: string
        }
        Update: {
          cost_per_unit?: number | null
          created_at?: string
          current_stock?: number
          expiry_date?: string | null
          id?: string
          is_perishable?: boolean
          min_stock?: number
          name?: string
          supplier?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      menu_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      menu_item_customizations: {
        Row: {
          created_at: string
          id: string
          is_available: boolean
          menu_item_id: string
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_available?: boolean
          menu_item_id: string
          name: string
          price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_available?: boolean
          menu_item_id?: string
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_customizations_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean
          name: string
          preparation_time: number
          price: number
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name: string
          preparation_time?: number
          price: number
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name?: string
          preparation_time?: number
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string
          notes: string | null
          order_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id: string
          notes?: string | null
          order_id: string
          quantity?: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string
          notes?: string | null
          order_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          assigned_waiter_id: string | null
          created_at: string
          created_by: string | null
          delivery_time: string | null
          feedback: string | null
          guest_id: string | null
          guest_stay_id: string | null
          id: string
          kitchen_notes: string | null
          order_number: string
          pickup_time: string | null
          rating: number | null
          room_id: string | null
          special_instructions: string | null
          status: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at: string
        }
        Insert: {
          assigned_waiter_id?: string | null
          created_at?: string
          created_by?: string | null
          delivery_time?: string | null
          feedback?: string | null
          guest_id?: string | null
          guest_stay_id?: string | null
          id?: string
          kitchen_notes?: string | null
          order_number: string
          pickup_time?: string | null
          rating?: number | null
          room_id?: string | null
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
        }
        Update: {
          assigned_waiter_id?: string | null
          created_at?: string
          created_by?: string | null
          delivery_time?: string | null
          feedback?: string | null
          guest_id?: string | null
          guest_stay_id?: string | null
          id?: string
          kitchen_notes?: string | null
          order_number?: string
          pickup_time?: string | null
          rating?: number | null
          room_id?: string | null
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_guest_stay_id_fkey"
            columns: ["guest_stay_id"]
            isOneToOne: false
            referencedRelation: "guest_stays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_settings: {
        Row: {
          created_at: string | null
          created_by: string | null
          gateway_name: string
          id: string
          is_active: boolean | null
          updated_at: string | null
          webhook_url: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          gateway_name: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          gateway_name?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          guest_stay_id: string | null
          id: string
          notes: string | null
          order_id: string | null
          payment_method: string
          payment_number: string
          processed_by: string | null
          status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          amount: number
          created_at?: string
          guest_stay_id?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          payment_method: string
          payment_number: string
          processed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          amount?: number
          created_at?: string
          guest_stay_id?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          payment_method?: string
          payment_number?: string
          processed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payments_guest_stay_id_fkey"
            columns: ["guest_stay_id"]
            isOneToOne: false
            referencedRelation: "guest_stays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recipes: {
        Row: {
          created_at: string
          id: string
          inventory_item_id: string
          menu_item_id: string
          quantity_required: number
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_item_id: string
          menu_item_id: string
          quantity_required: number
        }
        Update: {
          created_at?: string
          id?: string
          inventory_item_id?: string
          menu_item_id?: string
          quantity_required?: number
        }
        Relationships: [
          {
            foreignKeyName: "recipes_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          amenities: string[] | null
          capacity: number
          created_at: string
          floor: number
          id: string
          price_per_night: number
          room_number: string
          room_type: string
          status: Database["public"]["Enums"]["room_status"]
          updated_at: string
        }
        Insert: {
          amenities?: string[] | null
          capacity?: number
          created_at?: string
          floor: number
          id?: string
          price_per_night: number
          room_number: string
          room_type: string
          status?: Database["public"]["Enums"]["room_status"]
          updated_at?: string
        }
        Update: {
          amenities?: string[] | null
          capacity?: number
          created_at?: string
          floor?: number
          id?: string
          price_per_night?: number
          room_number?: string
          room_type?: string
          status?: Database["public"]["Enums"]["room_status"]
          updated_at?: string
        }
        Relationships: []
      }
      staff_shifts: {
        Row: {
          clock_in: string
          clock_out: string | null
          created_at: string
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          clock_in: string
          clock_out?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          user_id?: string
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
      waste_logs: {
        Row: {
          created_at: string
          id: string
          inventory_item_id: string
          logged_by: string | null
          quantity: number
          reason: string
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_item_id: string
          logged_by?: string | null
          quantity: number
          reason: string
        }
        Update: {
          created_at?: string
          id?: string
          inventory_item_id?: string
          logged_by?: string | null
          quantity?: number
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "waste_logs_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
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
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "food_manager"
        | "kitchen_manager"
        | "waiter"
        | "guest"
      complaint_priority: "low" | "medium" | "high" | "critical"
      complaint_status: "open" | "in_progress" | "resolved" | "closed"
      order_status:
        | "pending"
        | "confirmed"
        | "preparing"
        | "ready"
        | "picked_up"
        | "delivered"
        | "cancelled"
      payment_status: "pending" | "completed" | "failed" | "refunded"
      room_status: "available" | "occupied" | "maintenance" | "cleaning"
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
      app_role: [
        "super_admin",
        "admin",
        "food_manager",
        "kitchen_manager",
        "waiter",
        "guest",
      ],
      complaint_priority: ["low", "medium", "high", "critical"],
      complaint_status: ["open", "in_progress", "resolved", "closed"],
      order_status: [
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "picked_up",
        "delivered",
        "cancelled",
      ],
      payment_status: ["pending", "completed", "failed", "refunded"],
      room_status: ["available", "occupied", "maintenance", "cleaning"],
    },
  },
} as const
