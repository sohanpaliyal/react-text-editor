import type { Meta, StoryObj } from '@storybook/react';
import TextEditor from '../TextEditor';

const meta: Meta<typeof TextEditor> = {
    title: 'TextEditor',
    component: TextEditor,
};

export default meta;
type Story = StoryObj<typeof TextEditor>;

export const Basic: Story = {
    args: {
        placeholder: 'Type here...',
    },
};

export const WithInitialContent: Story = {
    args: {
        value: '<p>Hello, <strong>world</strong>!</p><ul><li>Item 1</li><li>Item 2</li></ul><pre><code>console.log("Hello");</code></pre>',
        placeholder: 'Type here...',
    },
};

export const MarkdownShortcuts: Story = {
    args: {
        placeholder: 'Try markdown: # Heading, * List, ```code```',
    },
};