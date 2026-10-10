export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      accounts: {
        Row: {
          color: string;
          created_at: string;
          id: string;
          institution: string;
          kind: Database['public']['Enums']['account_kind'];
          name: string;
          opening_balance: number;
          position: number;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          color?: string;
          created_at?: string;
          id?: string;
          institution?: string;
          kind?: Database['public']['Enums']['account_kind'];
          name: string;
          opening_balance?: number;
          position?: number;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          color?: string;
          created_at?: string;
          id?: string;
          institution?: string;
          kind?: Database['public']['Enums']['account_kind'];
          name?: string;
          opening_balance?: number;
          position?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      bills: {
        Row: {
          amount: number;
          category: string;
          created_at: string;
          due_day: number;
          id: string;
          name: string;
          paid_tx_id: string | null;
          source_id: string | null;
          source_type: Database['public']['Enums']['source_type'] | null;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          amount: number;
          category?: string;
          created_at?: string;
          due_day: number;
          id?: string;
          name: string;
          paid_tx_id?: string | null;
          source_id?: string | null;
          source_type?: Database['public']['Enums']['source_type'] | null;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          amount?: number;
          category?: string;
          created_at?: string;
          due_day?: number;
          id?: string;
          name?: string;
          paid_tx_id?: string | null;
          source_id?: string | null;
          source_type?: Database['public']['Enums']['source_type'] | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'bills_paid_tx_id_fkey';
            columns: ['paid_tx_id'];
            isOneToOne: false;
            referencedRelation: 'transactions';
            referencedColumns: ['id'];
          },
        ];
      };
      cards: {
        Row: {
          closing_day: number;
          color: string | null;
          created_at: string;
          credit_limit: number;
          due_day: number;
          gradient: Database['public']['Enums']['card_gradient'];
          id: string;
          last4: string;
          name: string;
          position: number;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          closing_day: number;
          color?: string | null;
          created_at?: string;
          credit_limit: number;
          due_day: number;
          gradient?: Database['public']['Enums']['card_gradient'];
          id?: string;
          last4: string;
          name: string;
          position?: number;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          closing_day?: number;
          color?: string | null;
          created_at?: string;
          credit_limit?: number;
          due_day?: number;
          gradient?: Database['public']['Enums']['card_gradient'];
          id?: string;
          last4?: string;
          name?: string;
          position?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          color: string;
          created_at: string;
          id: string;
          name: string;
          position: number;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          color: string;
          created_at?: string;
          id?: string;
          name: string;
          position?: number;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          color?: string;
          created_at?: string;
          id?: string;
          name?: string;
          position?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      goals: {
        Row: {
          account_id: string | null;
          color: string;
          created_at: string;
          deposit_day: number | null;
          id: string;
          last_deposit_date: string | null;
          monthly: number;
          name: string;
          saved: number;
          target: number;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          account_id?: string | null;
          color?: string;
          created_at?: string;
          deposit_day?: number | null;
          id?: string;
          last_deposit_date?: string | null;
          monthly?: number;
          name: string;
          saved?: number;
          target: number;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          account_id?: string | null;
          color?: string;
          created_at?: string;
          deposit_day?: number | null;
          id?: string;
          last_deposit_date?: string | null;
          monthly?: number;
          name?: string;
          saved?: number;
          target?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'goals_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'account_balances';
            referencedColumns: ['account_id'];
          },
          {
            foreignKeyName: 'goals_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'goals_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'accounts_with_balance';
            referencedColumns: ['id'];
          },
        ];
      };
      invoices: {
        Row: {
          card_id: string;
          created_at: string;
          id: string;
          month: string;
          paid_at: string | null;
          paid_tx_id: string | null;
          total: number;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          card_id: string;
          created_at?: string;
          id?: string;
          month: string;
          paid_at?: string | null;
          paid_tx_id?: string | null;
          total: number;
          user_id?: string;
        };
        Update: {
          card_id?: string;
          created_at?: string;
          id?: string;
          month?: string;
          paid_at?: string | null;
          paid_tx_id?: string | null;
          total?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'invoices_card_id_fkey';
            columns: ['card_id'];
            isOneToOne: false;
            referencedRelation: 'card_usage';
            referencedColumns: ['card_id'];
          },
          {
            foreignKeyName: 'invoices_card_id_fkey';
            columns: ['card_id'];
            isOneToOne: false;
            referencedRelation: 'cards';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'invoices_paid_tx_fk';
            columns: ['paid_tx_id'];
            isOneToOne: false;
            referencedRelation: 'transactions';
            referencedColumns: ['id'];
          },
        ];
      };
      plans: {
        Row: {
          card_id: string;
          category: string;
          created_at: string;
          current: number;
          deleted_at: string | null;
          deleted_group: string | null;
          id: string;
          installments: number;
          per_installment: number;
          title: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          card_id: string;
          category: string;
          created_at?: string;
          current?: number;
          deleted_at?: string | null;
          deleted_group?: string | null;
          id?: string;
          installments: number;
          per_installment: number;
          title: string;
          user_id?: string;
        };
        Update: {
          card_id?: string;
          category?: string;
          created_at?: string;
          current?: number;
          deleted_at?: string | null;
          deleted_group?: string | null;
          id?: string;
          installments?: number;
          per_installment?: number;
          title?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'plans_card_id_fkey';
            columns: ['card_id'];
            isOneToOne: false;
            referencedRelation: 'card_usage';
            referencedColumns: ['card_id'];
          },
          {
            foreignKeyName: 'plans_card_id_fkey';
            columns: ['card_id'];
            isOneToOne: false;
            referencedRelation: 'cards';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          bill_reminder: boolean;
          biometrics: boolean;
          created_at: string;
          currency: string;
          email_reminder: boolean;
          hide_values: boolean;
          id: string;
          last_rollover_month: string;
          monthly_budget: number;
          name: string;
          phone: string;
          theme: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          bill_reminder?: boolean;
          biometrics?: boolean;
          created_at?: string;
          currency?: string;
          email_reminder?: boolean;
          hide_values?: boolean;
          id: string;
          last_rollover_month?: string;
          monthly_budget?: number;
          name?: string;
          phone?: string;
          theme?: string;
          updated_at?: string;
        };
        Update: {
          bill_reminder?: boolean;
          biometrics?: boolean;
          created_at?: string;
          currency?: string;
          email_reminder?: boolean;
          hide_values?: boolean;
          id?: string;
          last_rollover_month?: string;
          monthly_budget?: number;
          name?: string;
          phone?: string;
          theme?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reminder_emails: {
        Row: {
          day: string;
          items: number;
          sent_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          day: string;
          items: number;
          sent_at?: string;
          user_id: string;
        };
        Update: {
          day?: string;
          items?: number;
          sent_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          amount: number;
          category: string;
          created_at: string;
          date: string;
          deleted_at: string | null;
          deleted_group: string | null;
          id: string;
          plan_id: string | null;
          source_id: string;
          source_type: Database['public']['Enums']['source_type'];
          title: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          amount: number;
          category: string;
          created_at?: string;
          date?: string;
          deleted_at?: string | null;
          deleted_group?: string | null;
          id?: string;
          plan_id?: string | null;
          source_id: string;
          source_type: Database['public']['Enums']['source_type'];
          title: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          amount?: number;
          category?: string;
          created_at?: string;
          date?: string;
          deleted_at?: string | null;
          deleted_group?: string | null;
          id?: string;
          plan_id?: string | null;
          source_id?: string;
          source_type?: Database['public']['Enums']['source_type'];
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'transactions_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      account_balances: {
        Row: {
          account_id: string | null;
          balance: number | null;
          user_id: string | null;
        };
        ComputedFields: never;
        Relationships: [];
      };
      accounts_with_balance: {
        Row: {
          balance: number | null;
          color: string | null;
          created_at: string | null;
          id: string | null;
          institution: string | null;
          kind: Database['public']['Enums']['account_kind'] | null;
          name: string | null;
          opening_balance: number | null;
          position: number | null;
          updated_at: string | null;
          user_id: string | null;
        };
        ComputedFields: never;
        Relationships: [];
      };
      card_usage: {
        Row: {
          card_id: string | null;
          used: number | null;
          user_id: string | null;
        };
        ComputedFields: never;
        Relationships: [];
      };
    };
    Functions: {
      add_installment_purchase: {
        Args: {
          p_card_id: string;
          p_category: unknown;
          p_current?: number;
          p_date?: string;
          p_installments: number;
          p_title: string;
          p_total: number;
        };
        Returns: string;
      };
      delete_account: { Args: { p_account_id: string }; Returns: undefined };
      delete_card: { Args: { p_card_id: string }; Returns: undefined };
      delete_category: { Args: { p_id: string; p_move_to?: string }; Returns: undefined };
      dispatch_reminders: { Args: Record<PropertyKey, never>; Returns: number };
      ensure_rollover: { Args: Record<PropertyKey, never>; Returns: number };
      export_my_data: { Args: Record<PropertyKey, never>; Returns: Json };
      kash_today: { Args: Record<PropertyKey, never>; Returns: string };
      mark_reminder_sent: {
        Args: { p_day: string; p_items: number; p_user_id: string };
        Returns: undefined;
      };
      month_key: { Args: { d: string }; Returns: string };
      move_plan_to_card: { Args: { p_card_id: string; p_plan_id: string }; Returns: undefined };
      pay_bill: { Args: { p_bill_id: string; p_date?: string }; Returns: string };
      pay_invoice: {
        Args: { p_account_id: string; p_date?: string; p_invoice_id: string };
        Returns: string;
      };
      record_goal_deposit: {
        Args: { p_account_id?: string; p_amount: number; p_date?: string; p_goal_id: string };
        Returns: undefined;
      };
      reminder_digest: {
        Args: { p_day?: string };
        Returns: {
          email: string;
          items: Json;
          name: string;
          user_id: string;
        }[];
      };
      rollover_all: { Args: Record<PropertyKey, never>; Returns: number };
      seed_default_categories: { Args: { p_uid: string }; Returns: undefined };
      soft_delete_transaction: { Args: { p_scope?: string; p_tx_id: string }; Returns: string };
      undo_delete_transaction: { Args: { p_group: string }; Returns: number };
      unpay_bill: { Args: { p_bill_id: string }; Returns: undefined };
      update_category: {
        Args: { p_color: string; p_id: string; p_name: string };
        Returns: undefined;
      };
    };
    Enums: {
      account_kind: 'corrente' | 'poupanca' | 'carteira' | 'investimento';
      card_gradient: 'green' | 'graphite' | 'blue' | 'purple';
      source_type: 'account' | 'card';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_kind: ['corrente', 'poupanca', 'carteira', 'investimento'],
      card_gradient: ['green', 'graphite', 'blue', 'purple'],
      source_type: ['account', 'card'],
    },
  },
} as const;
