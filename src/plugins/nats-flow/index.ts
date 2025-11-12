import type { Plugin } from '@docusaurus/types';
import path from 'path';

export default function natsFlowPlugin(): Plugin {
  return {
    name: 'nats-flow-plugin',

    getClientModules() {
      return [path.resolve(__dirname, './client-module.tsx')];
    },
  };
}
