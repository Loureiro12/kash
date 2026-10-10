import type { CategoryDef } from '../types';
import { DEFAULT_CATEGORIES } from '../categories';
import { addDays, monthKey, toISODate } from '../dates';
import type { Account, Bill, Card, Goal, Invoice, Plan, Settings, Tx, User } from '../types';

/** Dados de demonstração (fase visual). Datas relativas ao dia atual. */
export function seedData(today: Date) {
  // nunca cai no mês anterior: perto da virada, os lançamentos se acumulam no dia 1º
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const d = (daysAgo: number) => {
    const date = addDays(today, -daysAgo);
    return toISODate(date < firstOfMonth ? firstOfMonth : date);
  };

  const user: User = { name: 'Lara Mendes', email: 'lara.mendes@email.com', phone: '(11) 98765-4321' };

  const settings: Settings = { theme: 'dark', hideValues: false, billReminder: true, emailReminder: false, monthlyBudget: 1800, biometrics: false, currency: 'BRL' };

  const accounts: Account[] = [
    { id: 'acc1', name: 'Conta corrente', kind: 'Conta corrente · Banco digital', balance: 2340.5, color: '#C6F432' },
    { id: 'acc2', name: 'Poupança', kind: 'Poupança · Rende 100% CDI', balance: 1800, color: '#6BC5FF' },
    { id: 'acc3', name: 'Carteira', kind: 'Carteira · Dinheiro em espécie', balance: 85, color: '#FFB86B' },
  ];

  const cards: Card[] = [
    { id: 'card1', name: 'Cartão principal', last4: '4821', limit: 2500, closingDay: 28, dueDay: 5, gradientId: 'green' },
    { id: 'card2', name: 'Cartão universitário', last4: '1107', limit: 800, closingDay: 2, dueDay: 10, gradientId: 'graphite' },
  ];

  const plans: Plan[] = [
    { id: 'plan1', title: 'Celular novo', category: 'Outros', cardId: 'card1', installments: 12, current: 5, perInstallment: 199.9 },
    { id: 'plan2', title: 'Tênis de corrida', category: 'Lazer', cardId: 'card2', installments: 6, current: 3, perInstallment: 89.9 },
  ];

  const txs: Tx[] = [
    { id: 'tx1', title: 'Almoço no RU', category: 'Comida', amount: -14.5, date: d(0), sourceId: 'acc1' },
    { id: 'tx11', title: 'Celular novo (5/12)', category: 'Outros', amount: -199.9, date: d(0), sourceId: 'card1', planId: 'plan1' },
    { id: 'tx12', title: 'Tênis de corrida (3/6)', category: 'Lazer', amount: -89.9, date: d(1), sourceId: 'card2', planId: 'plan2' },
    { id: 'tx2', title: 'Uber pra facul', category: 'Transporte', amount: -18.9, date: d(0), sourceId: 'card1' },
    { id: 'tx3', title: 'Streaming de música', category: 'Assinaturas', amount: -21.9, date: d(1), sourceId: 'card2' },
    { id: 'tx4', title: 'Mesada', category: 'Entrada', amount: 600, date: d(1), sourceId: 'acc1' },
    { id: 'tx5', title: 'Mercado da esquina', category: 'Mercado', amount: -86.3, date: d(3), sourceId: 'card1' },
    { id: 'tx6', title: 'Cinema com amigos', category: 'Lazer', amount: -42, date: d(4), sourceId: 'card1' },
    { id: 'tx7', title: 'Freela de design', category: 'Entrada', amount: 850, date: d(4), sourceId: 'acc1' },
    { id: 'tx8', title: 'Pizza sexta', category: 'Comida', amount: -58, date: d(6), sourceId: 'card1' },
    { id: 'tx9', title: 'Recarga do bilhete', category: 'Transporte', amount: -60, date: d(7), sourceId: 'acc1' },
    { id: 'tx10', title: 'Jogo na promoção', category: 'Lazer', amount: -79.9, date: d(8), sourceId: 'card2' },
  ];

  const bills: Bill[] = [
    { id: 'bill1', name: 'Aluguel da república', amount: 650, dueDay: 5, paid: true, category: 'Outros', sourceId: 'acc1' },
    { id: 'bill2', name: 'Internet', amount: 99.9, dueDay: 10, paid: false, category: 'Assinaturas', sourceId: 'card1' },
    { id: 'bill3', name: 'Streaming de vídeo', amount: 34.9, dueDay: 12, paid: false, category: 'Assinaturas', sourceId: 'card2' },
    { id: 'bill4', name: 'Academia', amount: 89.9, dueDay: 15, paid: false, category: 'Lazer', sourceId: 'acc1' },
    { id: 'bill5', name: 'Plano do celular', amount: 49.9, dueDay: 20, paid: false, category: 'Assinaturas', sourceId: 'card1' },
  ];

  const goals: Goal[] = [
    { id: 'goal1', name: 'Viagem pra praia', target: 3000, saved: 1240, color: '#6BC5FF', monthly: 300, accountId: 'acc2', depositDay: 10 },
    { id: 'goal2', name: 'Fone novo', target: 900, saved: 620, color: '#D98BFF', monthly: 150, accountId: 'acc1', depositDay: 20 },
    // dia 1: sempre "pendente" ao abrir o app até registrar o depósito do mês
    { id: 'goal3', name: 'Reserva de emergência', target: 5000, saved: 2100, color: '#C6F432', monthly: 250, accountId: 'acc2', depositDay: 1 },
  ];

  // fatura do mês passado do cartão principal, fechada e ainda não paga
  const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const invoices: Invoice[] = [{ id: 'inv1', cardId: 'card1', month: monthKey(prev), total: 1240.3, paid: false }];

  const categories: CategoryDef[] = DEFAULT_CATEGORIES.map((c, i) => ({ id: `cat${i + 1}`, name: c.name, color: c.color }));
  return { user, settings, categories, accounts, cards, plans, txs, bills, goals, invoices, lastRolloverMonth: monthKey(today) };
}
