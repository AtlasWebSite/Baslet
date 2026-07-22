import { CreditCard } from 'lucide-react';
import { Button } from '../ui/Button';

export function BillingButton({ loading, disabled, onClick, children = 'Assinar agora' }: { loading: boolean; disabled?: boolean; onClick: () => void; children?: string }) {
  return <Button className="billing-button" icon={<CreditCard size={19}/>} loading={loading} disabled={disabled} onClick={onClick}>{children}</Button>;
}
