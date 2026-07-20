import { Img, Link } from '@react-email/components';

export default function ImageBlock({ data = {} }) {
  const img = (
    <Img
      src={data.src || 'https://placehold.co/600x320/png'}
      alt={data.alt || 'Email image'}
      width="536"
      style={{ display: 'block', width: '100%', height: 'auto', border: '0' }}
    />
  );
  if (data.href) {
    return (
      <Link href={data.href} target="_blank">
        {img}
      </Link>
    );
  }
  return img;
}
