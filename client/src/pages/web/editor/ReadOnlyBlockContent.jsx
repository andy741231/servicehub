import React from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import BlockContent from './BlockContent';
import { resolveUrl } from './editorUtils';

const renderHtml = (value) => {
  const source = value || '';
  const html = /<(?:p|span|strong|em|h[1-6]|ul|ol|blockquote|a)(?:\s|>)/i.test(source)
    ? source
    : marked.parse(source);
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p','br','strong','em','a','ul','ol','li','blockquote','code','pre','h1','h2','h3','h4','h5','h6','hr','img','span'],
    ALLOWED_ATTR: ['href','title','target','rel','src','alt','class'],
  });
};

const StaticText = ({ content, className, tag: Tag = 'div', multiline }) => {
  const html = renderHtml(content);
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />;
};

const StaticImage = ({ src, alt, className, placeholder }) => {
  if (!src) {
    return <div className={`${className || ''} bg-surface-raised flex items-center justify-center text-muted text-sm`} style={{ minHeight: 100 }}>{placeholder || ''}</div>;
  }
  return <img src={resolveUrl(src)} alt={alt || ''} className={className} />;
};

const StaticButton = ({ text, href, className }) => {
  if (!text) return null;
  if (href) {
    return <a href={href} className={className}>{text}</a>;
  }
  return <span className={className}>{text}</span>;
};

export default function ReadOnlyBlockContent({ block }) {
  return (
    <BlockContent
      block={block}
      EditableText={StaticText}
      EditableImage={StaticImage}
      EditableButton={StaticButton}
      onUpdateContent={() => {}}
      onUpdateBlock={() => {}}
      onAddNestedBlock={() => {}}
    />
  );
}
