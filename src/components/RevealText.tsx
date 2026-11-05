type HeadingTag = 'h1' | 'h2' | 'h3' | 'p' | 'span';

interface RevealTextProps {
  as?: HeadingTag;
  className?: string;
  id?: string;
  text: string;
}

export default function RevealText({ as: Tag = 'h2', className = '', id, text }: RevealTextProps) {
  let characterIndex = 0;
  const words = text.split(/(\s+)/).map((part, wordIndex) => {
    if (/^\s+$/.test(part)) return part;

    return (
      <span className="wedding-reveal-word" key={`${part}-${wordIndex}`}>
        {Array.from(part).map((character) => (
          <span
            className="wedding-reveal-letter"
            key={`${character}-${characterIndex}`}
            style={{ animationDelay: `${characterIndex++ * 14}ms` }}
          >
            {character}
          </span>
        ))}
      </span>
    );
  });

  return (
    <Tag id={id} className={className} data-reveal data-reveal-letters aria-label={text}>
      <span aria-hidden="true">{words}</span>
    </Tag>
  );
}
