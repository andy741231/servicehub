import { Column, Section, Text } from '@react-email/components';

export default function ColumnsBlock({ data = {} }) {
  const bg = data.backgroundColor || '#F0FDFA';
  return (
    <Section>
      <Column style={{ padding: '16px', background: bg, fontFamily: 'Arial, sans-serif', lineHeight: '1.5' }}>
        <Text>{data.left || 'Column one'}</Text>
      </Column>
      <Column style={{ width: '16px' }}>&nbsp;</Column>
      <Column style={{ padding: '16px', background: bg, fontFamily: 'Arial, sans-serif', lineHeight: '1.5' }}>
        <Text>{data.right || 'Column two'}</Text>
      </Column>
    </Section>
  );
}
