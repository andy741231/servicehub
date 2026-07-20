import { Text } from '@react-email/components';

export default function SpacerBlock({ data = {} }) {
  const height = Math.max(8, Math.min(160, Number(data.height) || 32));
  return (
    <Text style={{ fontSize: '1px', lineHeight: '1px', margin: '0' }}>
      &nbsp;
    </Text>
  );
}
