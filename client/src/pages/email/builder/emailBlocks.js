import { createElement } from 'react';
import { render } from '@react-email/render';
import { Body, Container, Head, Html, Section } from '@react-email/components';
import TextBlock from './emailComponents/TextBlock.jsx';
import ImageBlock from './emailComponents/ImageBlock.jsx';
import ButtonBlock from './emailComponents/ButtonBlock.jsx';
import DividerBlock from './emailComponents/DividerBlock.jsx';
import SpacerBlock from './emailComponents/SpacerBlock.jsx';
import ColumnsBlock from './emailComponents/ColumnsBlock.jsx';

const uid = () => `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const EMAIL_BLOCKS = [
  { type: 'text', label: 'Text', description: 'Heading or body copy' },
  { type: 'image', label: 'Image', description: 'Hosted image with alt text' },
  { type: 'button', label: 'Button', description: 'Call to action link' },
  { type: 'divider', label: 'Divider', description: 'Horizontal separator' },
  { type: 'spacer', label: 'Spacer', description: 'Vertical breathing room' },
  { type: 'columns', label: 'Columns', description: 'Two-column content row' },
];

export const createBlock = (type) => {
  const id = uid();
  const blocks = {
    text: { id, type, data: { content: '<h2>Heading</h2><p>Add your message here.</p>', align: 'left', color: '#1C2B2A' } },
    image: { id, type, data: { src: 'https://placehold.co/600x320/png', alt: 'Email image', href: '' } },
    button: { id, type, data: { label: 'Call to action', href: 'https://example.com', backgroundColor: '#0D9488', color: '#FFFFFF', align: 'center' } },
    divider: { id, type, data: { color: '#E2E8F0', width: 100 } },
    spacer: { id, type, data: { height: 32 } },
    columns: { id, type, data: { left: 'Column one', right: 'Column two', backgroundColor: '#F0FDFA' } },
  };
  return blocks[type];
};

export const createDocument = () => ({
  schemaVersion: 1,
  settings: { backgroundColor: '#FAFDFC', contentBackground: '#FFFFFF', width: 600 },
  blocks: [createBlock('text'), createBlock('button')],
});

const blockComponentMap = {
  text: TextBlock,
  image: ImageBlock,
  button: ButtonBlock,
  divider: DividerBlock,
  spacer: SpacerBlock,
  columns: ColumnsBlock,
};

function EmailDocument({ document }) {
  const { settings, blocks } = document;
  return createElement(Html, null,
    createElement(Head, null),
    createElement(Body, { style: { margin: 0, background: settings.backgroundColor } },
      createElement(Container, {
        style: {
          width: '100%',
          maxWidth: `${Number(settings.width) || 600}px`,
          background: settings.contentBackground,
        },
      },
        blocks.map((block) => {
          const Component = blockComponentMap[block.type];
          if (!Component) return null;
          return createElement(Section, { key: block.id, style: { padding: '16px 32px' } },
            createElement(Component, { data: block.data })
          );
        })
      )
    )
  );
}

export const compileEmailHtml = (document) => {
  const element = createElement(EmailDocument, { document });
  return render(element, { plainText: false });
};
