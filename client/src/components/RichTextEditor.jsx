import { useMemo } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const Font = Quill.import('formats/font');
Font.whitelist = ['sans', 'serif', 'serif-italic'];
Quill.register(Font, true);

const FORMATS = ['font', 'header', 'bold', 'italic', 'underline', 'strike', 'list', 'bullet', 'align', 'link', 'clean'];

const FONT_OPTIONS = [
  { value: 'sans', label: 'Sans' },
  { value: 'serif', label: 'Serif' },
  { value: 'serif-italic', label: 'Serif italic' },
];

export default function RichTextEditor({ value = '', onChange, placeholder = 'Start writing…', minHeight = 180 }) {
  const modules = useMemo(() => ({
    toolbar: [
      [{ font: FONT_OPTIONS.map(option => option.value) }],
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }, { align: [] }],
      ['link'],
      ['clean'],
    ],
  }), []);

  return (
    <div
      className="web-rich-text-editor bg-background [&_.ql-toolbar]:border-border [&_.ql-toolbar]:rounded-t-base [&_.ql-container]:border-border [&_.ql-container]:rounded-b-base [&_.ql-editor]:text-body"
      style={{ '--rich-text-min-height': `${minHeight}px` }}
    >
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        modules={modules}
        formats={FORMATS}
      />
    </div>
  );
}
