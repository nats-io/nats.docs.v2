import React from 'react';

import styles from './PropertyMeta.module.css';

type Props = {
  version: string;
};

export default function Since({ version }: Props) {
  return (
    <div className={styles.meta} style={{ fontStyle: "italic" }}>
      Available since NATS Server <code>{version}</code>
    </div>
  );
}
