/**
 * Expenses CRUD
 */
import { createClient } from '../client';
import type { Expense } from '@/types';

// ─── Row Types (Supabase snake_case) ─────────────────────────

export interface ExpenseRow {
  id: string;
  title: string;
  amount: number;
  category: string;
  payment_type: string;
  expense_date: string;
  next_renewal_date: string | null;
  status: string;
  cancel_reason: string | null;
  description: string | null;
  spender_name: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Mappers ─────────────────────────────────────────────────

export function expenseFromRow(row: ExpenseRow): Expense {
  return {
    id: row.id,
    title: row.title,
    amount: Number(row.amount),
    category: row.category as Expense['category'],
    paymentType: row.payment_type as Expense['paymentType'],
    expenseDate: row.expense_date,
    nextRenewalDate: row.next_renewal_date ?? undefined,
    status: row.status as Expense['status'],
    cancelReason: row.cancel_reason ?? undefined,
    description: row.description ?? undefined,
    spenderName: row.spender_name ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function expenseToInsert(expense: Omit<Expense, 'createdAt' | 'updatedAt'>) {
  return {
    id: expense.id,
    title: expense.title,
    amount: expense.amount,
    category: expense.category,
    payment_type: expense.paymentType,
    expense_date: expense.expenseDate,
    next_renewal_date: expense.nextRenewalDate ?? null,
    status: expense.status,
    cancel_reason: expense.cancelReason ?? null,
    description: expense.description ?? null,
    spender_name: expense.spenderName ?? null,
  };
}

export function expenseToUpdate(fields: Partial<Expense>) {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (fields.title !== undefined) row.title = fields.title;
  if (fields.amount !== undefined) row.amount = fields.amount;
  if (fields.category !== undefined) row.category = fields.category;
  if (fields.paymentType !== undefined) row.payment_type = fields.paymentType;
  if (fields.expenseDate !== undefined) row.expense_date = fields.expenseDate;
  if (fields.nextRenewalDate !== undefined) row.next_renewal_date = fields.nextRenewalDate ?? null;
  if (fields.status !== undefined) row.status = fields.status;
  if (fields.cancelReason !== undefined) row.cancel_reason = fields.cancelReason ?? null;
  if (fields.description !== undefined) row.description = fields.description ?? null;
  if (fields.spenderName !== undefined) row.spender_name = fields.spenderName ?? null;
  return row;
}

// ─── CRUD ────────────────────────────────────────────────────

export async function getExpenses(): Promise<Expense[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('expense_date', { ascending: false });
  if (error) { console.error('[DB] getExpenses:', error.message); return []; }
  if (!data) return [];
  return (data as ExpenseRow[]).map(expenseFromRow);
}

export async function insertExpense(expense: Omit<Expense, 'createdAt' | 'updatedAt'>): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('expenses')
    .insert(expenseToInsert(expense));
  if (error) console.error('[DB] insertExpense:', error.message);
  return !error;
}

export async function updateExpense(id: string, fields: Partial<Expense>): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('expenses')
    .update(expenseToUpdate(fields))
    .eq('id', id);
  if (error) console.error('[DB] updateExpense:', error.message);
  return !error;
}

export async function deleteExpense(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) console.error('[DB] deleteExpense:', error.message);
  return !error;
}
