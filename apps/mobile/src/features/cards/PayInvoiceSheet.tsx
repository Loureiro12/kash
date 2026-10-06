import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { BottomSheet, Button, Chip, Text } from '@/design-system';
import { formatBRL, invoiceView } from '@kash/domain';
import { useKashStore } from '@/store';

/** Sheet — Pagar fatura: valor fechado, escolha da conta que paga. */
export function PayInvoiceSheet() {
  const visible = useKashStore((s) => s.ui.sheet === 'payInvoice');
  const nonce = useKashStore((s) => s.ui.sheetNonce);
  const invoiceId = useKashStore((s) => s.ui.payInvoiceId);
  const closeSheet = useKashStore((s) => s.closeSheet);
  return <PayInvoiceForm key={`${nonce}-${invoiceId ?? ''}`} visible={visible} invoiceId={invoiceId} onClose={closeSheet} />;
}

function PayInvoiceForm({ visible, invoiceId, onClose }: { visible: boolean; invoiceId: string | null; onClose: () => void }) {
  const invoice = useKashStore((s) => (invoiceId ? (s.invoices.find((i) => i.id === invoiceId) ?? null) : null));
  const cards = useKashStore((s) => s.cards);
  const accounts = useKashStore((s) => s.accounts);
  const payInvoice = useKashStore((s) => s.payInvoice);
  const showToast = useKashStore((s) => s.showToast);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const view = invoice ? invoiceView(invoice, cards) : null;
  const account = accounts.find((a) => a.id === accountId);
  const insufficient = !!view && !!account && account.balance < view.total;
  const canPay = !!view && !!account && !invoice?.paid;

  const onPay = () => {
    if (!view || !canPay) return;
    payInvoice(view.id, accountId);
    showToast(`Fatura de ${view.monthName} paga: ${formatBRL(view.total)}`);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Pagar fatura"
      testID="sheet-pay-invoice"
      gap={16}
      footer={<Button label={view ? `Pagar ${formatBRL(view.total)}` : 'Pagar'} onPress={onPay} disabled={!canPay} testID="pay-invoice-save" haptic="medium" />}
    >
      {view ? (
        <>
          <View style={{ alignItems: 'center', gap: 4, paddingVertical: 6 }}>
            <Text variant="meta" color="muted" testID="pay-invoice-title">
              {view.cardName} · fatura de {view.monthName} · vence {view.dueLabel}
            </Text>
            <Text variant="amountSheet" testID="pay-invoice-amount">
              {formatBRL(view.total)}
            </Text>
          </View>
          <Text variant="metaMedium" color="muted">
            Pagar com
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
            {accounts.map((a) => (
              <Chip key={a.id} label={`${a.name} · ${formatBRL(a.balance)}`} tone="soft" shape="rounded" height={34} selected={accountId === a.id} onPress={() => setAccountId(a.id)} testID={`pay-invoice-account-${a.id}`} />
            ))}
          </ScrollView>
          {insufficient ? (
            <Text variant="meta" color="neg" testID="pay-invoice-warning">
              Essa conta fica negativa depois do pagamento. Dá pra pagar mesmo assim.
            </Text>
          ) : (
            <Text variant="meta" color="muted">
              O pagamento sai do saldo da conta e não entra como gasto no relatório (os gastos já foram contados quando lançados no cartão).
            </Text>
          )}
        </>
      ) : null}
    </BottomSheet>
  );
}
