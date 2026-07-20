import DOMPurify from 'dompurify';
import { Text } from '@react-email/components';

export default function TextBlock({ data = {} }) {
  const content = DOMPurify.sanitize(data.content || '', {
    ALLOWED_TAGS: ['a', 'b', 'br', 'em', 'h1', 'h2', 'h3', 'li', 'ol', 'p', 'span', 'strong', 'ul'],
    ALLOWED_ATTR: ['href', 'style'],
  });
  return (
    <Text
      style={{
        color: data.color || '#1C2B2A',
        textAlign: data.align || 'left',
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        lineHeight: '1.5',
      }}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
