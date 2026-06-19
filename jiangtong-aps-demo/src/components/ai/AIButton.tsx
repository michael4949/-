import { Sparkles, Loader2 } from 'lucide-react';

interface Props {
  label: string;
  onClick?: () => void;
  size?: 'sm' | 'md';
  loading?: boolean;
  icon?: 'sparkles' | 'none';
  disabled?: boolean;
}
// §11.3 紫色边框/字 → hover 填充紫色 → loading 旋转
export default function AIButton({ label, onClick, size='md', loading=false, icon='sparkles', disabled }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`btn btn-ai ${size === 'sm' ? 'btn-sm' : ''}`}
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : icon === 'sparkles' ? <Sparkles size={12} /> : null}
      {label}
    </button>
  );
}
