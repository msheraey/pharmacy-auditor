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
      action_items: {
        Row: {
          assignee_staff_id: string | null
          branch_id: string
          checklist_point_id: string | null
          closed_at: string | null
          closed_in_visit_id: string | null
          created_at: string
          created_by: string | null
          description: string
          due_date: string | null
          id: string
          status: Database["public"]["Enums"]["action_item_status"]
          visit_id: string | null
        }
        Insert: {
          assignee_staff_id?: string | null
          branch_id: string
          checklist_point_id?: string | null
          closed_at?: string | null
          closed_in_visit_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          due_date?: string | null
          id?: string
          status?: Database["public"]["Enums"]["action_item_status"]
          visit_id?: string | null
        }
        Update: {
          assignee_staff_id?: string | null
          branch_id?: string
          checklist_point_id?: string | null
          closed_at?: string | null
          closed_in_visit_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          due_date?: string | null
          id?: string
          status?: Database["public"]["Enums"]["action_item_status"]
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "action_items_assignee_staff_id_fkey"
            columns: ["assignee_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_checklist_point_id_fkey"
            columns: ["checklist_point_id"]
            isOneToOne: false
            referencedRelation: "checklist_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_closed_in_visit_id_fkey"
            columns: ["closed_in_visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_audit_responses: {
        Row: {
          auditor_user_id: string
          checklist_point_id: string
          comment: string | null
          created_at: string
          id: string
          is_na: boolean
          photo_url: string | null
          score: number | null
          updated_at: string
          visit_id: string
        }
        Insert: {
          auditor_user_id: string
          checklist_point_id: string
          comment?: string | null
          created_at?: string
          id?: string
          is_na?: boolean
          photo_url?: string | null
          score?: number | null
          updated_at?: string
          visit_id: string
        }
        Update: {
          auditor_user_id?: string
          checklist_point_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          is_na?: boolean
          photo_url?: string | null
          score?: number | null
          updated_at?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_audit_responses_checklist_point_id_fkey"
            columns: ["checklist_point_id"]
            isOneToOne: false
            referencedRelation: "checklist_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_audit_responses_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          active: boolean
          branch_profile: Database["public"]["Enums"]["branch_profile"]
          cluster_id: string | null
          created_at: string
          emirate: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          branch_profile?: Database["public"]["Enums"]["branch_profile"]
          cluster_id?: string | null
          created_at?: string
          emirate: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          branch_profile?: Database["public"]["Enums"]["branch_profile"]
          cluster_id?: string | null
          created_at?: string
          emirate?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_points: {
        Row: {
          active: boolean
          created_at: string
          id: string
          knockout: boolean
          measure_text: string | null
          point_text: string
          section_id: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          knockout?: boolean
          measure_text?: string | null
          point_text: string
          section_id: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          knockout?: boolean
          measure_text?: string | null
          point_text?: string
          section_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "checklist_points_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "checklist_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_sections: {
        Row: {
          active: boolean
          applies_to_role: Database["public"]["Enums"]["staff_role"] | null
          code: string
          created_at: string
          delivery_only: boolean
          id: string
          name: string
          scope: Database["public"]["Enums"]["checklist_scope"]
          sort_order: number
          weight: number
        }
        Insert: {
          active?: boolean
          applies_to_role?: Database["public"]["Enums"]["staff_role"] | null
          code: string
          created_at?: string
          delivery_only?: boolean
          id?: string
          name: string
          scope: Database["public"]["Enums"]["checklist_scope"]
          sort_order?: number
          weight?: number
        }
        Update: {
          active?: boolean
          applies_to_role?: Database["public"]["Enums"]["staff_role"] | null
          code?: string
          created_at?: string
          delivery_only?: boolean
          id?: string
          name?: string
          scope?: Database["public"]["Enums"]["checklist_scope"]
          sort_order?: number
          weight?: number
        }
        Relationships: []
      }
      clusters: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      staff: {
        Row: {
          active: boolean
          branch_id: string | null
          created_at: string
          dha_license_status: string | null
          full_name: string
          id: string
          role: Database["public"]["Enums"]["staff_role"]
          staff_code: string
        }
        Insert: {
          active?: boolean
          branch_id?: string | null
          created_at?: string
          dha_license_status?: string | null
          full_name: string
          id?: string
          role: Database["public"]["Enums"]["staff_role"]
          staff_code: string
        }
        Update: {
          active?: boolean
          branch_id?: string | null
          created_at?: string
          dha_license_status?: string | null
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["staff_role"]
          staff_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_audit_responses: {
        Row: {
          auditor_user_id: string
          checklist_point_id: string
          comment: string | null
          created_at: string
          id: string
          is_na: boolean
          photo_url: string | null
          score: number | null
          staff_id: string
          updated_at: string
          visit_id: string
        }
        Insert: {
          auditor_user_id: string
          checklist_point_id: string
          comment?: string | null
          created_at?: string
          id?: string
          is_na?: boolean
          photo_url?: string | null
          score?: number | null
          staff_id: string
          updated_at?: string
          visit_id: string
        }
        Update: {
          auditor_user_id?: string
          checklist_point_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          is_na?: boolean
          photo_url?: string | null
          score?: number | null
          staff_id?: string
          updated_at?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_audit_responses_checklist_point_id_fkey"
            columns: ["checklist_point_id"]
            isOneToOne: false
            referencedRelation: "checklist_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_audit_responses_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_audit_responses_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_scores: {
        Row: {
          clinical_knowledge_score: number | null
          last_updated: string
          operations_score: number | null
          overall_score: number | null
          sales_customer_score: number | null
          staff_id: string
          total_audits_count: number
        }
        Insert: {
          clinical_knowledge_score?: number | null
          last_updated?: string
          operations_score?: number | null
          overall_score?: number | null
          sales_customer_score?: number | null
          staff_id: string
          total_audits_count?: number
        }
        Update: {
          clinical_knowledge_score?: number | null
          last_updated?: string
          operations_score?: number | null
          overall_score?: number | null
          sales_customer_score?: number | null
          staff_id?: string
          total_audits_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "staff_scores_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: true
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          cluster_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          cluster_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          cluster_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          auditor_user_id: string
          branch_id: string
          branch_score_pct: number | null
          completed_at: string | null
          created_at: string
          id: string
          overall_notes: string | null
          people_index_pct: number | null
          red_flagged: boolean
          revisit_band: Database["public"]["Enums"]["revisit_band"] | null
          status: Database["public"]["Enums"]["visit_status"]
          visit_date: string
          visit_time: string
          weighted_score_pct: number | null
        }
        Insert: {
          auditor_user_id: string
          branch_id: string
          branch_score_pct?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          overall_notes?: string | null
          people_index_pct?: number | null
          red_flagged?: boolean
          revisit_band?: Database["public"]["Enums"]["revisit_band"] | null
          status?: Database["public"]["Enums"]["visit_status"]
          visit_date?: string
          visit_time?: string
          weighted_score_pct?: number | null
        }
        Update: {
          auditor_user_id?: string
          branch_id?: string
          branch_score_pct?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          overall_notes?: string | null
          people_index_pct?: number | null
          red_flagged?: boolean
          revisit_band?: Database["public"]["Enums"]["revisit_band"] | null
          status?: Database["public"]["Enums"]["visit_status"]
          visit_date?: string
          visit_time?: string
          weighted_score_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "visits_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_visit: {
        Args: { _auditor: string; _branch_id: string }
        Returns: boolean
      }
      can_read_all: { Args: never; Returns: boolean }
      current_user_cluster: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_overdue_action_items: { Args: never; Returns: undefined }
      recompute_staff_scores_for_visit: {
        Args: { _visit_id: string }
        Returns: undefined
      }
    }
    Enums: {
      action_item_status: "open" | "done" | "overdue"
      app_role: "super_admin" | "cluster_manager" | "viewer"
      branch_profile: "Retail" | "Delivery" | "Mixed" | "24-Hour"
      checklist_scope: "branch" | "staff"
      revisit_band: "routine" | "action_plan" | "focused_30d" | "urgent_7d"
      staff_role:
        | "Pharmacist"
        | "Salesperson"
        | "Preparation"
        | "Branch Manager"
      visit_status: "in_progress" | "completed"
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
      action_item_status: ["open", "done", "overdue"],
      app_role: ["super_admin", "cluster_manager", "viewer"],
      branch_profile: ["Retail", "Delivery", "Mixed", "24-Hour"],
      checklist_scope: ["branch", "staff"],
      revisit_band: ["routine", "action_plan", "focused_30d", "urgent_7d"],
      staff_role: [
        "Pharmacist",
        "Salesperson",
        "Preparation",
        "Branch Manager",
      ],
      visit_status: ["in_progress", "completed"],
    },
  },
} as const
