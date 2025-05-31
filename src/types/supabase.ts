export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          first_name: string
          last_name: string
          avatar?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Insert: {
          id?: string
          email: string
          first_name: string
          last_name: string
          avatar?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          first_name?: string
          last_name?: string
          avatar?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      },
      accounts: {
        Row: {
          id: string
          name: string
          type: 'checking' | 'savings' | 'credit card' | 'other'
          bank_name: string | null
          last4: string | null
          balance: number
          is_primary: boolean
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: 'checking' | 'savings' | 'credit card' | 'other'
          bank_name?: string | null
          last4?: string | null
          balance?: number
          is_primary?: boolean
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: 'checking' | 'savings' | 'credit card' | 'other'
          bank_name?: string | null
          last4?: string | null
          balance?: number
          is_primary?: boolean
          user_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      },
      transactions: {
        Row: {
          id: number,
          date: string,
          description: string,
          amount: number,
          type: TransactionType,
          detailed_type: 'income' | 'variable-expense' | 'fixed-expense' | 'subscription' | 'debt-payment' | 'goal-contribution' | null,
          category_id: number | null,
          account_id: string,
          to_account_id: string | null,
          source_id: string | null,
          source: string | null,
          notes: string | null,
          user_id: string,
          created_at: string,
          updated_at: string
        },
        Insert: {
          id?: number,
          date: string,
          description: string,
          amount: number,
          type: TransactionType,
          detailed_type?: 'income' | 'variable-expense' | 'fixed-expense' | 'subscription' | 'debt-payment' | 'goal-contribution' | null,
          category_id?: number | null,
          account_id: string,
          to_account_id?: string | null,
          source_id?: string | null,
          source?: string | null,
          notes?: string | null,
          user_id: string,
          created_at?: string,
          updated_at?: string
        },
        Update: {
          id?: number,
          date?: string,
          description?: string,
          amount?: number,
          type?: TransactionType,
          detailed_type?: 'income' | 'variable-expense' | 'fixed-expense' | 'subscription' | 'debt-payment' | 'goal-contribution' | null,
          category_id?: number | null,
          account_id?: string,
          to_account_id?: string | null,
          source_id?: string | null,
          source?: string | null,
          notes?: string | null,
          user_id?: string,
          created_at?: string,
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey",
            columns: ["user_id"],
            referencedRelation: "users",
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey",
            columns: ["category_id"],
            referencedRelation: "categories",
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_account_id_fkey",
            columns: ["account_id"],
            referencedRelation: "accounts",
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_to_account_id_fkey",
            columns: ["to_account_id"],
            referencedRelation: "accounts",
            referencedColumns: ["id"]
          }
        ]
      },
      transaction_tags: {
        Row: {
          transaction_id: number,
          tag: string
        },
        Insert: {
          transaction_id: number,
          tag: string
        },
        Update: {
          transaction_id?: number,
          tag?: string
        },
        Relationships: [
          {
            foreignKeyName: "transaction_tags_transaction_id_fkey",
            columns: ["transaction_id"],
            referencedRelation: "transactions",
            referencedColumns: ["id"]
          }
        ]
      },
      debt_accounts: {
        Row: {
          id: string
          name: string
          type: 'credit-card' | 'student-loan' | 'personal-loan' | 'mortgage' | 'auto-loan' | 'other'
          balance: number
          apr: number
          minimum_payment: number
          payment_day_of_month: number
          payment_frequency: 'monthly' | 'bi-weekly' | 'weekly' | 'annually' | 'other'
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: 'credit-card' | 'student-loan' | 'personal-loan' | 'mortgage' | 'auto-loan' | 'other'
          balance?: number
          apr: number
          minimum_payment: number
          payment_day_of_month: number
          payment_frequency: 'monthly' | 'bi-weekly' | 'weekly' | 'annually' | 'other'
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: 'credit-card' | 'student-loan' | 'personal-loan' | 'mortgage' | 'auto-loan' | 'other'
          balance?: number
          apr?: number
          minimum_payment?: number
          payment_day_of_month?: number
          payment_frequency?: 'monthly' | 'bi-weekly' | 'weekly' | 'annually' | 'other'
          user_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_accounts_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      debt_plans: {
        Row: {
          id: string
          strategy: 'snowball' | 'avalanche' | null
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          strategy?: 'snowball' | 'avalanche' | null
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          strategy?: 'snowball' | 'avalanche' | null
          user_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_plans_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      recurring_items: {
        Row: {
          id: string
          name: string
          type: 'income' | 'subscription' | 'fixed-expense'
          amount: number
          frequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'semi-monthly' | 'quarterly' | 'yearly'
          start_date: string | null
          last_renewal_date: string | null
          semi_monthly_first_pay_date: string | null
          semi_monthly_second_pay_date: string | null
          end_date: string | null
          notes: string | null
          category_id: string | null
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: 'income' | 'subscription' | 'fixed-expense'
          amount: number
          frequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'semi-monthly' | 'quarterly' | 'yearly'
          start_date?: string | null
          last_renewal_date?: string | null
          semi_monthly_first_pay_date?: string | null
          semi_monthly_second_pay_date?: string | null
          end_date?: string | null
          notes?: string | null
          category_id?: string | null
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: 'income' | 'subscription' | 'fixed-expense'
          amount?: number
          frequency?: 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'semi-monthly' | 'quarterly' | 'yearly'
          start_date?: string | null
          last_renewal_date?: string | null
          semi_monthly_first_pay_date?: string | null
          semi_monthly_second_pay_date?: string | null
          end_date?: string | null
          notes?: string | null
          category_id?: string | null
          user_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_items_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      budget_categories: {
        Row: {
          id: string
          name: string
          budgeted_amount: number
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          budgeted_amount?: number
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          budgeted_amount?: number
          user_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_categories_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      financial_goals: {
        Row: {
          id: string
          name: string
          target_amount: number
          current_amount: number
          target_date: string
          icon: 'default' | 'home' | 'car' | 'plane' | 'briefcase' | 'graduation-cap' | 'gift' | 'piggy-bank' | 'trending-up' | 'shield-check'
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          target_amount: number
          current_amount?: number
          target_date: string
          icon?: 'default' | 'home' | 'car' | 'plane' | 'briefcase' | 'graduation-cap' | 'gift' | 'piggy-bank' | 'trending-up' | 'shield-check'
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          target_amount?: number
          current_amount?: number
          target_date?: string
          icon?: 'default' | 'home' | 'car' | 'plane' | 'briefcase' | 'graduation-cap' | 'gift' | 'piggy-bank' | 'trending-up' | 'shield-check'
          user_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_goals_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }

      investment_accounts: {
        Row: {
          id: string,
          name: string,
          type: 'brokerage' | 'ira' | '401k' | 'crypto' | 'other',
          institution: string | null,
          current_value: number,
          user_id: string,
          created_at: string,
          updated_at: string
        },
        Insert: {
          id?: string,
          name: string,
          type: 'brokerage' | 'ira' | '401k' | 'crypto' | 'other',
          institution?: string | null,
          current_value?: number,
          user_id: string,
          created_at?: string,
          updated_at?: string
        },
        Update: {
          id?: string,
          name?: string,
          type?: 'brokerage' | 'ira' | '401k' | 'crypto' | 'other',
          institution?: string | null,
          current_value?: number,
          user_id?: string,
          created_at?: string,
          updated_at?: string
        },
        Relationships: [
          {
            foreignKeyName: "investment_accounts_user_id_fkey",
            columns: ["user_id"],
            referencedRelation: "users",
            referencedColumns: ["id"]
          }
        ]
      },
      holdings: {
        Row: {
          id: string,
          symbol: string,
          name: string,
          value: number,
          shares: number,
          price: number,
          change_percent: number | null,
          logo_url: string | null,
          user_id: string,
          account_id: string | null,
          created_at: string,
          updated_at: string
        },
        Insert: {
          id?: string,
          symbol: string,
          name: string,
          value: number,
          shares: number,
          price: number,
          change_percent?: number | null,
          logo_url?: string | null,
          user_id: string,
          account_id?: string | null,
          created_at?: string,
          updated_at?: string
        },
        Update: {
          id?: string,
          symbol?: string,
          name?: string,
          value?: number,
          shares?: number,
          price?: number,
          change_percent?: number | null,
          logo_url?: string | null,
          user_id?: string,
          account_id?: string | null,
          created_at?: string,
          updated_at?: string
        },
        Relationships: [
          {
            foreignKeyName: "holdings_user_id_fkey",
            columns: ["user_id"],
            referencedRelation: "users",
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holdings_account_id_fkey",
            columns: ["account_id"],
            referencedRelation: "investment_accounts",
            referencedColumns: ["id"]
          }
        ]
      },
    savings_transactions: {
      Row: {
        id: string,
        date: string,
        goal_id: string,
        amount: number,
        method: 'Auto-Save' | 'Manual',
        status: 'Pending' | 'Completed' | 'Failed',
        user_id: string,
        created_at: string,
        updated_at: string
      },
      Insert: {
        id?: string,
        date: string,
        goal_id: string,
        amount: number,
        method: 'Auto-Save' | 'Manual',
        status: 'Pending' | 'Completed' | 'Failed',
        user_id: string,
        created_at?: string,
        updated_at?: string
      },
      Update: {
        id?: string,
        date?: string,
        goal_id?: string,
        amount?: number,
        method?: 'Auto-Save' | 'Manual',
        status?: 'Pending' | 'Completed' | 'Failed',
        user_id?: string,
        created_at?: string,
        updated_at?: string
      },
      Relationships: [
        {
          foreignKeyName: "savings_transactions_user_id_fkey",
          columns: ["user_id"],
          referencedRelation: "users",
          referencedColumns: ["id"]
        },
        {
          foreignKeyName: "savings_transactions_goal_id_fkey",
          columns: ["goal_id"],
          referencedRelation: "financial_goals",
          referencedColumns: ["id"]
        }
      ]
    },
    user_preferences: {
      Row: {
        id: string,
        user_id: string,
        currency: string,
        date_format: string,
        theme: 'light' | 'dark' | 'system',
        hide_balances: boolean,
        email_notifications: boolean,
        browser_notifications: boolean,
        mobile_notifications: boolean,
        setup_progress: Json,
        created_at: string,
        updated_at: string
      },
      Insert: {
        id?: string,
        user_id: string,
        currency?: string,
        date_format?: string,
        theme?: 'light' | 'dark' | 'system',
        hide_balances?: boolean,
        email_notifications?: boolean,
        browser_notifications?: boolean,
        mobile_notifications?: boolean,
        setup_progress?: Json,
        created_at?: string,
        updated_at?: string
      },
      Update: {
        id?: string,
        user_id?: string,
        currency?: string,
        date_format?: string,
        theme?: 'light' | 'dark' | 'system',
        hide_balances?: boolean,
        email_notifications?: boolean,
        browser_notifications?: boolean,
        mobile_notifications?: boolean,
        setup_progress?: Json,
        created_at?: string,
        updated_at?: string
      },
      Relationships: [
        {
          foreignKeyName: "user_preferences_user_id_fkey",
          columns: ["user_id"],
          referencedRelation: "users",
          referencedColumns: ["id"]
        }
      ]
    }
  },
  Views: {
    [_ in never]: never
  },
  Functions: {
    [_ in never]: never
  },
  Enums: {
    [_ in never]: never
  }
}
}
