import { Button } from '@react-email/components';

export default function ButtonBlock({ data = {} }) {
  return (
    <Button
      href={data.href || 'https://example.com'}
      target="_blank"
      style={{
        display: 'inline-block',
        background: data.backgroundColor || '#0D9488',
        color: data.color || '#FFFFFF',
        padding: '12px 20px',
        borderRadius: '6px',
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        fontWeight: '700',
        textDecoration: 'none',
      }}
    >
      {data.label || 'Call to action'}
    </Button>
  );
}
