import { useCallback, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link2,
  Unlink,
  RemoveFormatting,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
} from 'lucide-react';

const FONT_CLASSES = {
  sans: 'font-sans',
  serif: 'font-serif',
  'serif-italic': 'font-serif-italic',
};

// Font options matching landing2 styles: DM Sans (sans) + Libre Baskerville (serif variants)
const FONT_OPTIONS = [
  { value: '', label: 'DM Sans' },
  { value: "'Libre Baskerville', Georgia, serif", label: 'Libre Baskerville' },
  { value: "'Libre Baskerville', Georgia, serif", label: 'Libre Baskerville Bold', style: { fontWeight: '700' } },
  { value: "'Libre Baskerville', Georgia, serif", label: 'Libre Baskerville Italic', style: { fontStyle: 'italic' } },
];

const ICON_SIZE = 'w-4 h-4';

const Separator = () => (
  <div className="w-px h-6 bg-border mx-1.5 shrink-0" />
);

const ToolbarButton = ({ active, onClick, title, children }) => (
  <button
    type="button"
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    title={title}
    aria-label={title}
    aria-pressed={active}
    className={`flex items-center justify-center w-8 h-8 rounded-md transition-all duration-150 shrink-0 ${
      active
        ? 'bg-primary/15 text-primary'
        : 'text-muted hover:bg-surface-tertiary hover:text-text-base'
    }`}
  >
    {children}
  </button>
);

export default function TiptapEditor({
  value = '',
  onChange,
  placeholder = 'Start writing…',
  minHeight = 180,
  font = 'sans',
}) {
  const lastValueRef = useRef(value);
  const handleUpdate = useCallback(
    ({ editor }) => {
      const html = editor.getHTML();
      lastValueRef.current = html;
      if (onChange) onChange(html);
    },
    [onChange],
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: false,
        underline: false,
      }),
      Underline,
      TextStyle,
      FontFamily.configure({ types: ['textStyle', 'heading', 'paragraph'] }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-primary underline' } }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: handleUpdate,
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none ${FONT_CLASSES[font] || FONT_CLASSES.sans}`,
        style: `min-height: ${minHeight}px`,
      },
    },
  });

  // Sync external value changes to editor, but only when editor is NOT focused.
  // This prevents the cursor from being ejected when the parent re-renders
  // with the updated HTML from onChange.
  useEffect(() => {
    if (!editor) return;
    if (document.activeElement === editor.view.dom) return;
    if (value === lastValueRef.current) return;
    lastValueRef.current = value;
    const currentHTML = editor.getHTML();
    if (value !== currentHTML) {
      editor.commands.setContent(value, false);
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="web-rich-text-editor rounded-base border border-border bg-background overflow-hidden">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }) {
  if (!editor) return null;

  return (
    <div role="toolbar" aria-label="Text formatting" className="flex flex-wrap items-center gap-1 border-b border-border px-2 py-1.5 bg-surface">
      {/* Font family dropdown */}
      <select
        value={(() => {
          const ff = editor.getAttributes('textStyle').fontFamily || '';
          const italic = editor.isActive('italic');
          const bold = editor.isActive('bold');
          if (!ff) return '';
          if (italic) return "italic";
          if (bold) return "bold";
          return "serif";
        })()}
        onChange={(e) => {
          const val = e.target.value;
          if (val === '') {
            editor.chain().focus().unsetFontFamily().run();
          } else if (val === 'serif') {
            editor.chain().focus().setFontFamily("'Libre Baskerville', Georgia, serif").unsetItalic().unsetBold().run();
          } else if (val === 'bold') {
            editor.chain().focus().setFontFamily("'Libre Baskerville', Georgia, serif").setBold().unsetItalic().run();
          } else if (val === 'italic') {
            editor.chain().focus().setFontFamily("'Libre Baskerville', Georgia, serif").setItalic().unsetBold().run();
          }
        }}
        title="Font family"
        aria-label="Font family"
        className="h-8 px-2 text-sm rounded-md border border-border bg-surface text-text-base focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer shrink-0"
      >
        {FONT_OPTIONS.map((opt) => (
          <option key={opt.label} value={opt.value === '' ? '' : opt.label.includes('Bold') ? 'bold' : opt.label.includes('Italic') ? 'italic' : 'serif'} style={opt.style}>{opt.label}</option>
        ))}
      </select>

      <Separator />

      {/* Block type group */}
      <ToolbarButton
        active={editor.isActive('heading', { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        title="Heading 1"
      >
        <Heading1 className={ICON_SIZE} />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Heading 2"
      >
        <Heading2 className={ICON_SIZE} />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        title="Heading 3"
      >
        <Heading3 className={ICON_SIZE} />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('paragraph')}
        onClick={() => editor.chain().focus().setParagraph().run()}
        title="Paragraph"
      >
        <Pilcrow className={ICON_SIZE} />
      </ToolbarButton>

      <Separator />

      {/* Inline formatting group */}
      <ToolbarButton
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold"
      >
        <Bold className={ICON_SIZE} />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic"
      >
        <Italic className={ICON_SIZE} />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="Underline"
      >
        <UnderlineIcon className={ICON_SIZE} />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Strikethrough"
      >
        <Strikethrough className={ICON_SIZE} />
      </ToolbarButton>

      <Separator />

      {/* List group */}
      <ToolbarButton
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Bullet list"
      >
        <List className={ICON_SIZE} />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Numbered list"
      >
        <ListOrdered className={ICON_SIZE} />
      </ToolbarButton>

      <Separator />

      {/* Alignment group */}
      <ToolbarButton
        active={editor.isActive({ textAlign: 'left' })}
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        title="Align left"
      >
        <AlignLeft className={ICON_SIZE} />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive({ textAlign: 'center' })}
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        title="Align center"
      >
        <AlignCenter className={ICON_SIZE} />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive({ textAlign: 'right' })}
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        title="Align right"
      >
        <AlignRight className={ICON_SIZE} />
      </ToolbarButton>

      <Separator />

      {/* Link group */}
      <ToolbarButton
        active={editor.isActive('link')}
        onClick={() => {
          if (editor.isActive('link')) {
            editor.chain().focus().unsetLink().run();
          } else {
            const url = window.prompt('Enter URL:');
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }
        }}
        title={editor.isActive('link') ? 'Remove link' : 'Insert link'}
      >
        {editor.isActive('link') ? <Unlink className={ICON_SIZE} /> : <Link2 className={ICON_SIZE} />}
      </ToolbarButton>

      <Separator />

      {/* Clear formatting */}
      <ToolbarButton
        active={false}
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        title="Clear formatting"
      >
        <RemoveFormatting className={ICON_SIZE} />
      </ToolbarButton>
    </div>
  );
}
