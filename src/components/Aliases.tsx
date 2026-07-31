import React from 'react';

import styles from './PropertyMeta.module.css';

type Props = {
  aliases: string;
};

export default function Aliases({ aliases }: Props) {
  return (
    <div className={styles.meta} style={{ fontStyle: "italic" }}>
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
