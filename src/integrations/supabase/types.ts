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
      construction_projects: {
        Row: {
          client_id: string | null
          cover_image_url: string | null
          created_at: string
          current_stage: string | null
          description: string
          estimated_delivery_date: string | null
          id: string
          is_portfolio: boolean
          is_public: boolean
          location: string
          name: string
          progress: number
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          current_stage?: string | null
          description: string
          estimated_delivery_date?: string | null
          id?: string
          is_portfolio?: boolean
          is_public?: boolean
          location: string
          name: string
          progress?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          current_stage?: string | null
          description?: string
          estimated_delivery_date?: string | null
          id?: string
          is_portfolio?: boolean
          is_public?: boolean
          location?: string
          name?: string
          progress?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          position: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          full_name: string
          id?: string
          phone?: string | null
          position?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          position?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_categories_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "construction_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_items: {
        Row: {
          category_id: string
          created_at: string
          delivered_date: string | null
          expected_date: string | null
          id: string
          name: string
          project_id: string
          start_date: string | null
          status: Database["public"]["Enums"]["item_status"]
          subcategory_id: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          delivered_date?: string | null
          expected_date?: string | null
          id?: string
          name: string
          project_id: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["item_status"]
          subcategory_id: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          delivered_date?: string | null
          expected_date?: string | null
          id?: string
          name?: string
          project_id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["item_status"]
          subcategory_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "project_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "construction_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_items_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "project_subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      project_permissions: {
        Row: {
          can_create_report: boolean
          can_upload_photo: boolean
          can_view: boolean
          created_at: string
          id: string
          project_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_create_report?: boolean
          can_upload_photo?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          project_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_create_report?: boolean
          can_upload_photo?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          project_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_reports: {
        Row: {
          category_id: string | null
          created_at: string
          created_by: string
          description: string
          execution_status:
            | Database["public"]["Enums"]["report_execution_status"]
            | null
          id: string
          item_id: string | null
          project_id: string
          report_date: string
          stage: string | null
          subcategory_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          created_by: string
          description: string
          execution_status?:
            | Database["public"]["Enums"]["report_execution_status"]
            | null
          id?: string
          item_id?: string | null
          project_id: string
          report_date?: string
          stage?: string | null
          subcategory_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          created_by?: string
          description?: string
          execution_status?:
            | Database["public"]["Enums"]["report_execution_status"]
            | null
          id?: string
          item_id?: string | null
          project_id?: string
          report_date?: string
          stage?: string | null
          subcategory_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_reports_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "project_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_reports_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "project_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "construction_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_reports_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "project_subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      project_schedule: {
        Row: {
          category_id: string | null
          created_at: string
          id: string
          item_id: string | null
          planned_end_date: string
          planned_start_date: string
          progress: number
          project_id: string
          stage: string
          status: Database["public"]["Enums"]["schedule_status"]
          subcategory_id: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          id?: string
          item_id?: string | null
          planned_end_date: string
          planned_start_date: string
          progress?: number
          project_id: string
          stage: string
          status?: Database["public"]["Enums"]["schedule_status"]
          subcategory_id?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          id?: string
          item_id?: string | null
          planned_end_date?: string
          planned_start_date?: string
          progress?: number
          project_id?: string
          stage?: string
          status?: Database["public"]["Enums"]["schedule_status"]
          subcategory_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_schedule_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "project_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_schedule_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "project_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_schedule_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "construction_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_schedule_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "project_subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      project_subcategories: {
        Row: {
          category_id: string
          created_at: string
          id: string
          name: string
          project_id: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          name: string
          project_id: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          name?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "project_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_subcategories_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "construction_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      report_media: {
        Row: {
          captured_at: string | null
          category_id: string | null
          description: string | null
          file_url: string
          id: string
          item_id: string | null
          media_type: Database["public"]["Enums"]["media_type"]
          project_id: string
          report_id: string | null
          stage: string | null
          subcategory_id: string | null
          uploaded_at: string
        }
        Insert: {
          captured_at?: string | null
          category_id?: string | null
          description?: string | null
          file_url: string
          id?: string
          item_id?: string | null
          media_type: Database["public"]["Enums"]["media_type"]
          project_id: string
          report_id?: string | null
          stage?: string | null
          subcategory_id?: string | null
          uploaded_at?: string
        }
        Update: {
          captured_at?: string | null
          category_id?: string | null
          description?: string | null
          file_url?: string
          id?: string
          item_id?: string | null
          media_type?: Database["public"]["Enums"]["media_type"]
          project_id?: string
          report_id?: string | null
          stage?: string | null
          subcategory_id?: string | null
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_media_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "project_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_media_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "project_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_media_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "construction_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_media_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "project_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_media_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "project_subcategories"
            referencedColumns: ["id"]
          },
        ]
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
      has_project_permission: {
        Args: { _perm: string; _project_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      recalc_item_status: { Args: { _item_id: string }; Returns: undefined }
      recalc_project_progress: {
        Args: { _project_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "client"
      item_status: "pendente" | "em_andamento" | "finalizada"
      media_type: "photo" | "video"
      project_status: "planning" | "in_progress" | "completed"
      report_execution_status: "comecando" | "desenvolvendo" | "finalizando"
      schedule_status: "pending" | "in_progress" | "completed" | "delayed"
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
      app_role: ["admin", "client"],
      item_status: ["pendente", "em_andamento", "finalizada"],
      media_type: ["photo", "video"],
      project_status: ["planning", "in_progress", "completed"],
      report_execution_status: ["comecando", "desenvolvendo", "finalizando"],
      schedule_status: ["pending", "in_progress", "completed", "delayed"],
    },
  },
} as const
