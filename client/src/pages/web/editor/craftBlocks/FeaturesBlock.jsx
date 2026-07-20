import { useNode } from '@craftjs/core';
import BlockContent from '../BlockContent';
import { makeDefaultBlockContent } from '../editorUtils';
import EditableText from './EditableText';

export default function FeaturesBlock({ content, blockType, id, order }) {
  const {
    connectors: { connect, drag },
    actions: { setProp },
    selected,
    hovered,
  } = useNode((node) => ({
    selected: node.events.selected,
    hovered: node.events.hovered,
  }));

  const block = {
    id,
    type: blockType || 'features',
    content: content || {},
    order,
  };

  return (
    <div
      ref={(ref) => connect(drag(ref))}
      className={`relative outline-none ${selected ? 'ring-2 ring-primary' : hovered ? 'ring-1 ring-primary/40' : ''}`}
    >
      <BlockContent
        block={block}
        EditableText={EditableText}
        EditableButton={({ text, href, onChange, className }) => (
          <button type="button" className={className} onClick={() => onChange?.({ text, href })}>
            {text || 'Button'}
          </button>
        )}
        EditableImage={({ src, onChange, className, style }) => (
          <img src={src || ''} alt="" className={className} style={style} onClick={() => onChange?.(src)} />
        )}
        onUpdateContent={(updates) =>
          setProp((props) => {
            props.content = { ...(props.content || {}), ...updates };
          })
        }
        onUpdateBlock={(updates) =>
          setProp((props) => {
            Object.assign(props, updates);
          })
        }
      />
    </div>
  );
}

FeaturesBlock.craft = {
  displayName: 'FeaturesBlock',
  props: {
    content: makeDefaultBlockContent('features'),
    blockType: 'features',
    id: '',
    order: 0,
  },
  rules: {
    canDrag: () => true,
  },
};