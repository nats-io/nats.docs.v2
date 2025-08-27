import React from 'react';

type Props = {
  aliases: string;
};

export default function Aliases({ aliases }: Props) {
  return (
    <div style={{ fontStyle: "italic" }}>
      Aliases:{" "}
      {aliases
        .split(",")
        .map((t, i) => {
          const trimmed = t.trim();
          return (
            <React.Fragment key={i}>
              {i > 0 && ", "}
              <code>{trimmed}</code>
            </React.Fragment>
          );
        })}
    </div>
  );
}
