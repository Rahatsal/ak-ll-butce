export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense'
}

export enum Category {
  FOOD = 'Gıda',
  TRANSPORT = 'Ulaşım',
  SHOPPING = 'Alışveriş',
  BILLS = 'Faturalar',
  ENTERTAINMENT = 'Eğlence',
  HEALTH = 'Sağlık',
  SALARY = 'Maaş',
  INVESTMENT = 'Yatırım',
  OTHER = 'Diğer'
}

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: Category | string;
  date: string; // ISO string
  type: TransactionType;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export interface GeminiReceiptResponse {
  amount: number;
  description: string;
  category: string;
  date?: string;
}
