import type { Preview } from '@storybook/nextjs-vite';

import { barlow, barlowCondensed } from '../src/styles/fuentes.generated';
import '../src/app/globals.css';

const preview: Preview = {
  decorators: [
    (Story) => (
      <div className={`${barlow.variable} ${barlowCondensed.variable} bg-background p-4 font-sans`}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    a11y: { test: 'error' },
    layout: 'fullscreen',
  },
};

export default preview;
