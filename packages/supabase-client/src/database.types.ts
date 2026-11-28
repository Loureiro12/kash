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
          household_id: string | null;
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
          household_id?: string | null;
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
          household_id?: string | null;
          id?: string;
          institution?: string;
          kind?: Database['public']['Enums']['account_kind'];
          name?: string;
          opening_balance?: number;
          position?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'accounts_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
      };
      ai_calls: {
        Row: {
          created_at: string;
          id: number;
          input_tokens: number;
          output_tokens: number;
          purpose: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: never;
          input_tokens?: number;
          output_tokens?: number;
          purpose?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: never;
          input_tokens?: number;
          output_tokens?: number;
          purpose?: string;
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
          household_id: string | null;
          id: string;
          name: string;
          paid_tx_id: string | null;
          paid_tx_linked: boolean;
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
          household_id?: string | null;
          id?: string;
          name: string;
          paid_tx_id?: string | null;
          paid_tx_linked?: boolean;
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
          household_id?: string | null;
          id?: string;
          name?: string;
          paid_tx_id?: string | null;
          paid_tx_linked?: boolean;
          source_id?: string | null;
          source_type?: Database['public']['Enums']['source_type'] | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'bills_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
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
          household_id: string | null;
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
          household_id?: string | null;
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
          household_id?: string | null;
          id?: string;
          last4?: string;
          name?: string;
          position?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'cards_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
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
      debts: {
        Row: {
          amount: number;
          created_at: string;
          date: string;
          description: string;
          due_date: string | null;
          id: string;
          kind: string;
          person: string;
          settled_at: string | null;
          settled_tx_id: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          amount: number;
          created_at?: string;
          date?: string;
          description?: string;
          due_date?: string | null;
          id?: string;
          kind?: string;
          person: string;
          settled_at?: string | null;
          settled_tx_id?: string | null;
          user_id?: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          date?: string;
          description?: string;
          due_date?: string | null;
          id?: string;
          kind?: string;
          person?: string;
          settled_at?: string | null;
          settled_tx_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'debts_settled_tx_id_fkey';
            columns: ['settled_tx_id'];
            isOneToOne: false;
            referencedRelation: 'transactions';
            referencedColumns: ['id'];
          },
        ];
      };
      goals: {
        Row: {
          account_id: string | null;
          color: string;
          created_at: string;
          deposit_day: number | null;
          household_id: string | null;
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
          household_id?: string | null;
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
          household_id?: string | null;
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
          {
            foreignKeyName: 'goals_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
      };
      household_invites: {
        Row: {
          code: string;
          created_at: string;
          created_by: string;
          expires_at: string;
          household_id: string;
          used_at: string | null;
          used_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          code: string;
          created_at?: string;
          created_by: string;
          expires_at?: string;
          household_id: string;
          used_at?: string | null;
          used_by?: string | null;
        };
        Update: {
          code?: string;
          created_at?: string;
          created_by?: string;
          expires_at?: string;
          household_id?: string;
          used_at?: string | null;
          used_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'household_invites_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
      };
      household_members: {
        Row: {
          household_id: string;
          joined_at: string;
          notify_scope: string;
          notify_values: boolean;
          role: string;
          share_personal: boolean;
          user_id: string;
          view_scope: string;
        };
        ComputedFields: never;
        Insert: {
          household_id: string;
          joined_at?: string;
          notify_scope?: string;
          notify_values?: boolean;
          role?: string;
          share_personal?: boolean;
          user_id: string;
          view_scope?: string;
        };
        Update: {
          household_id?: string;
          joined_at?: string;
          notify_scope?: string;
          notify_values?: boolean;
          role?: string;
          share_personal?: boolean;
          user_id?: string;
          view_scope?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'household_members_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
      };
      household_push_log: {
        Row: {
          sent_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          sent_at?: string;
          user_id: string;
        };
        Update: {
          sent_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      households: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          name: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      imports: {
        Row: {
          balance_adjustment: number;
          counterpart_adjustments: NonNullable<Json>;
          created_at: string;
          file_name: string;
          format: string;
          id: string;
          linked: NonNullable<Json>;
          matched_count: number;
          plan_count: number;
          skipped_count: number;
          source_id: string;
          source_type: Database['public']['Enums']['source_type'];
          statement_month: string | null;
          tx_count: number;
          undone_at: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          balance_adjustment?: number;
          counterpart_adjustments?: NonNullable<Json>;
          created_at?: string;
          file_name?: string;
          format: string;
          id?: string;
          linked?: NonNullable<Json>;
          matched_count?: number;
          plan_count?: number;
          skipped_count?: number;
          source_id: string;
          source_type: Database['public']['Enums']['source_type'];
          statement_month?: string | null;
          tx_count?: number;
          undone_at?: string | null;
          user_id?: string;
        };
        Update: {
          balance_adjustment?: number;
          counterpart_adjustments?: NonNullable<Json>;
          created_at?: string;
          file_name?: string;
          format?: string;
          id?: string;
          linked?: NonNullable<Json>;
          matched_count?: number;
          plan_count?: number;
          skipped_count?: number;
          source_id?: string;
          source_type?: Database['public']['Enums']['source_type'];
          statement_month?: string | null;
          tx_count?: number;
          undone_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      invoices: {
        Row: {
          card_id: string;
          created_at: string;
          household_id: string | null;
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
          household_id?: string | null;
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
          household_id?: string | null;
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
            foreignKeyName: 'invoices_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
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
      merchant_rules: {
        Row: {
          category: string | null;
          id: string;
          pattern: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          category?: string | null;
          id?: string;
          pattern: string;
          title: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          category?: string | null;
          id?: string;
          pattern?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      plans: {
        Row: {
          card_id: string;
          category: string;
          created_at: string;
          current: number;
          deleted_at: string | null;
          deleted_group: string | null;
          external_id: string | null;
          household_id: string | null;
          id: string;
          import_id: string | null;
          installments: number;
          original_title: string | null;
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
          external_id?: string | null;
          household_id?: string | null;
          id?: string;
          import_id?: string | null;
          installments: number;
          original_title?: string | null;
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
          external_id?: string | null;
          household_id?: string | null;
          id?: string;
          import_id?: string | null;
          installments?: number;
          original_title?: string | null;
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
          {
            foreignKeyName: 'plans_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'plans_import_id_fkey';
            columns: ['import_id'];
            isOneToOne: false;
            referencedRelation: 'imports';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          bill_reminder: boolean;
          biometrics: boolean;
          card_budget: number;
          checklist_hidden_at: string | null;
          created_at: string;
          currency: string;
          email_reminder: boolean;
          hide_values: boolean;
          id: string;
          last_rollover_month: string;
          monthly_budget: number;
          name: string;
          onboarding_done_at: string | null;
          phone: string;
          theme: string;
          travel_tag: string | null;
          travel_until: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          bill_reminder?: boolean;
          biometrics?: boolean;
          card_budget?: number;
          checklist_hidden_at?: string | null;
          created_at?: string;
          currency?: string;
          email_reminder?: boolean;
          hide_values?: boolean;
          id: string;
          last_rollover_month?: string;
          monthly_budget?: number;
          name?: string;
          onboarding_done_at?: string | null;
          phone?: string;
          theme?: string;
          travel_tag?: string | null;
          travel_until?: string | null;
          updated_at?: string;
        };
        Update: {
          bill_reminder?: boolean;
          biometrics?: boolean;
          card_budget?: number;
          checklist_hidden_at?: string | null;
          created_at?: string;
          currency?: string;
          email_reminder?: boolean;
          hide_values?: boolean;
          id?: string;
          last_rollover_month?: string;
          monthly_budget?: number;
          name?: string;
          onboarding_done_at?: string | null;
          phone?: string;
          theme?: string;
          travel_tag?: string | null;
          travel_until?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      push_tokens: {
        Row: {
          platform: string;
          token: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          platform: string;
          token: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          platform?: string;
          token?: string;
          updated_at?: string;
          user_id?: string;
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
          attachment_path: string | null;
          category: string;
          created_at: string;
          date: string;
          deleted_at: string | null;
          deleted_group: string | null;
          external_id: string | null;
          household_id: string | null;
          id: string;
          import_id: string | null;
          original_title: string | null;
          plan_id: string | null;
          source_id: string;
          source_type: Database['public']['Enums']['source_type'];
          tag: string | null;
          title: string;
          transfer_id: string | null;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          amount: number;
          attachment_path?: string | null;
          category: string;
          created_at?: string;
          date?: string;
          deleted_at?: string | null;
          deleted_group?: string | null;
          external_id?: string | null;
          household_id?: string | null;
          id?: string;
          import_id?: string | null;
          original_title?: string | null;
          plan_id?: string | null;
          source_id: string;
          source_type: Database['public']['Enums']['source_type'];
          tag?: string | null;
          title: string;
          transfer_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          amount?: number;
          attachment_path?: string | null;
          category?: string;
          created_at?: string;
          date?: string;
          deleted_at?: string | null;
          deleted_group?: string | null;
          external_id?: string | null;
          household_id?: string | null;
          id?: string;
          import_id?: string | null;
          original_title?: string | null;
          plan_id?: string | null;
          source_id?: string;
          source_type?: Database['public']['Enums']['source_type'];
          tag?: string | null;
          title?: string;
          transfer_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'transactions_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_import_id_fkey';
            columns: ['import_id'];
            isOneToOne: false;
            referencedRelation: 'imports';
            referencedColumns: ['id'];
          },
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
          household_id: string | null;
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
        Relationships: [
          {
            foreignKeyName: 'accounts_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
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
      accept_household_invite: { Args: { p_code: string }; Returns: string };
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
      cancel_household_invites: { Args: Record<PropertyKey, never>; Returns: undefined };
      create_household_invite: { Args: Record<PropertyKey, never>; Returns: Json };
      create_transfer: {
        Args: { p_amount: number; p_date?: string; p_from: string; p_title?: string; p_to: string };
        Returns: string;
      };
      delete_account: { Args: { p_account_id: string }; Returns: undefined };
      delete_card: { Args: { p_card_id: string }; Returns: undefined };
      delete_category: { Args: { p_id: string; p_move_to?: string }; Returns: undefined };
      dispatch_reminders: { Args: Record<PropertyKey, never>; Returns: number };
      ensure_rollover: { Args: Record<PropertyKey, never>; Returns: number };
      export_my_data: { Args: Record<PropertyKey, never>; Returns: Json };
      household_overview: { Args: Record<PropertyKey, never>; Returns: Json };
      household_push_text: {
        Args: {
          p_amount: number;
          p_category: string;
          p_name: string;
          p_show_values: boolean;
          p_title: string;
        };
        Returns: string;
      };
      import_account_statement: {
        Args: {
          p_account_id: string;
          p_file_name: string;
          p_format: string;
          p_items: Json;
          p_keep_balance?: boolean;
        };
        Returns: string;
      };
      import_card_statement: {
        Args: {
          p_card_id: string;
          p_file_name: string;
          p_format: string;
          p_items: Json;
          p_statement_month: string;
        };
        Returns: string;
      };
      kash_can_read: { Args: { p_household: string; p_owner: string }; Returns: boolean };
      kash_can_write: { Args: { p_household: string; p_owner: string }; Returns: boolean };
      kash_today: { Args: Record<PropertyKey, never>; Returns: string };
      leave_household: { Args: Record<PropertyKey, never>; Returns: undefined };
      leave_household_for: { Args: { p_user: string }; Returns: undefined };
      link_bill_payment: { Args: { p_bill_id: string; p_tx_id: string }; Returns: undefined };
      mark_reminder_sent: {
        Args: { p_day: string; p_items: number; p_user_id: string };
        Returns: undefined;
      };
      month_key: { Args: { d: string }; Returns: string };
      move_plan_to_card: { Args: { p_card_id: string; p_plan_id: string }; Returns: undefined };
      my_household: { Args: Record<PropertyKey, never>; Returns: string };
      pay_bill: { Args: { p_bill_id: string; p_date?: string }; Returns: string };
      pay_invoice: {
        Args: { p_account_id: string; p_date?: string; p_invoice_id: string };
        Returns: string;
      };
      record_goal_deposit: {
        Args: { p_account_id?: string; p_amount: number; p_date?: string; p_goal_id: string };
        Returns: undefined;
      };
      refresh_card_invoices: {
        Args: { p_card_id: string; p_months: string[] };
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
      reset_my_data: { Args: Record<PropertyKey, never>; Returns: undefined };
      rollover_all: { Args: Record<PropertyKey, never>; Returns: number };
      seed_default_categories: { Args: { p_uid: string }; Returns: undefined };
      settle_debt: {
        Args: { p_account_id?: string; p_date?: string; p_debt_id: string };
        Returns: string;
      };
      soft_delete_transaction: { Args: { p_scope?: string; p_tx_id: string }; Returns: string };
      undo_delete_transaction: { Args: { p_group: string }; Returns: number };
      undo_import: { Args: { p_import_id: string }; Returns: number };
      unpay_bill: { Args: { p_bill_id: string }; Returns: undefined };
      unsettle_debt: { Args: { p_debt_id: string }; Returns: undefined };
      update_category: {
        Args: { p_color: string; p_id: string; p_name: string };
        Returns: undefined;
      };
      update_household_settings: {
        Args: {
          p_name?: string;
          p_notify_scope?: string;
          p_notify_values?: boolean;
          p_share_personal?: boolean;
          p_view_scope?: string;
        };
        Returns: undefined;
      };
      update_transfer: {
        Args: {
          p_amount: number;
          p_date: string;
          p_from: string;
          p_title?: string;
          p_to: string;
          p_transfer_id: string;
        };
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
