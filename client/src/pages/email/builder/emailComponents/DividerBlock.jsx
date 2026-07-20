import { Hr } from '@react-email/components';

export default function DividerBlock({ data = {} }) {
  return (
    <Hr
      style={{
        height: '1px',
        background: data.color || '#E2E8F0',
        width: `${Number(data.width) || 100}%`,
        border: '0',
      }}
    />
  );
}
