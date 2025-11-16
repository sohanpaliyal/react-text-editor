import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock CSS import first
jest.mock('../styles.css', () => ({}));

// Define mock objects first
const mockRoot = {
  clear: jest.fn(),
};

const mockSelection = {
  hasFormat: jest.fn((format: string) => false),
};

const mockEditor: any = {
  update: jest.fn((callback) => callback()),
  registerCommand: jest.fn(() => () => {}),
  registerUpdateListener: jest.fn(() => () => {}),
  dispatchCommand: jest.fn(),
};

// Mock all Lexical dependencies before any imports
jest.mock('@lexical/react/LexicalComposer', () => ({
  LexicalComposer: ({ children, initialConfig }: any) => (
    <div data-testid="lexical-composer" data-config={JSON.stringify(initialConfig)}>
      {children}
    </div>
  ),
}));

jest.mock('@lexical/react/LexicalRichTextPlugin', () => ({
  RichTextPlugin: ({ contentEditable, placeholder, ErrorBoundary }: any) => (
    <div data-testid="rich-text-plugin">
      <div data-testid="error-boundary">
        {contentEditable}
        {placeholder}
      </div>
    </div>
  ),
}));

jest.mock('@lexical/react/LexicalContentEditable', () => ({
  ContentEditable: React.forwardRef<HTMLDivElement, any>(({ className }, ref) => (
    <div
      ref={ref}
      className={className}
      data-testid="content-editable"
      contentEditable
      suppressContentEditableWarning
    />
  )),
}));

jest.mock('@lexical/react/LexicalHistoryPlugin', () => ({
  HistoryPlugin: () => <div data-testid="history-plugin" />,
}));

jest.mock('@lexical/react/LexicalListPlugin', () => ({
  ListPlugin: () => <div data-testid="list-plugin" />,
}));

jest.mock('@lexical/react/LexicalMarkdownShortcutPlugin', () => ({
  MarkdownShortcutPlugin: ({ transformers }: any) => (
    <div data-testid="markdown-plugin" data-transformers={transformers?.length} />
  ),
}));

jest.mock('@lexical/react/LexicalErrorBoundary', () => ({
  __esModule: true,
  default: ({ children }: any) => <div data-testid="error-boundary">{children}</div>,
}));

jest.mock('@lexical/markdown', () => ({
  TRANSFORMERS: [],
}));

jest.mock('@lexical/rich-text', () => ({
  HeadingNode: class HeadingNode {},
  QuoteNode: class QuoteNode {},
}));

jest.mock('@lexical/list', () => ({
  ListNode: class ListNode {},
  ListItemNode: class ListItemNode {},
  INSERT_ORDERED_LIST_COMMAND: 'INSERT_ORDERED_LIST_COMMAND',
  INSERT_UNORDERED_LIST_COMMAND: 'INSERT_UNORDERED_LIST_COMMAND',
}));

jest.mock('@lexical/link', () => ({
  AutoLinkNode: class AutoLinkNode {},
  LinkNode: class LinkNode {},
}));

jest.mock('@lexical/code', () => ({
  CodeNode: class CodeNode {},
  CodeHighlightNode: class CodeHighlightNode {},
}));

jest.mock('@lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: () => [mockEditor],
}));

jest.mock('lexical', () => ({
  $getRoot: jest.fn(() => mockRoot),
  $insertNodes: jest.fn(),
  $getSelection: jest.fn(() => mockSelection),
  $isRangeSelection: jest.fn(() => true),
  FORMAT_TEXT_COMMAND: 'FORMAT_TEXT_COMMAND',
  UNDO_COMMAND: 'UNDO_COMMAND',
  REDO_COMMAND: 'REDO_COMMAND',
  CAN_UNDO_COMMAND: 'CAN_UNDO_COMMAND',
  CAN_REDO_COMMAND: 'CAN_REDO_COMMAND',
  SELECTION_CHANGE_COMMAND: 'SELECTION_CHANGE_COMMAND',
}));

jest.mock('@lexical/html', () => ({
  $generateHtmlFromNodes: jest.fn(() => '<p>test content</p>'),
  $generateNodesFromDOM: jest.fn(() => []),
}));

jest.mock('@lexical/utils', () => ({
  mergeRegister: jest.fn((...args) => () => {}),
}));

// Now import the component after all mocks are set up
import TextEditor, { TextEditorRef } from '../TextEditor';

describe('TextEditor', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
    // Reset mock implementations
    mockSelection.hasFormat.mockImplementation((format: string) => false);
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<TextEditor />);
      expect(screen.getByTestId('lexical-composer')).toBeInTheDocument();
    });

    it('renders with default placeholder', () => {
      render(<TextEditor />);
      expect(screen.getByText('Type here...')).toBeInTheDocument();
    });

    it('renders with custom placeholder', () => {
      const customPlaceholder = 'Enter your text here';
      render(<TextEditor placeholder={customPlaceholder} />);
      expect(screen.getByText(customPlaceholder)).toBeInTheDocument();
    });

    it('renders all toolbar buttons', () => {
      render(<TextEditor />);
      
      expect(screen.getByRole('button', { name: 'B' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'I' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'U' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '• List' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '1. List' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '⎌ Undo' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '↻ Redo' })).toBeInTheDocument();
    });
  });

  describe('Props and Initial State', () => {
    it('accepts initial value prop', () => {
      const initialValue = '<p>Initial content</p>';
      render(<TextEditor value={initialValue} />);
      
      expect(mockEditor.update).toHaveBeenCalled();
    });

    it('calls onChange when content changes', async () => {
      const mockOnChange = jest.fn();
      render(<TextEditor onChange={mockOnChange} />);
      
      // Simulate the onChange plugin triggering
      const updateListener = mockEditor.registerUpdateListener.mock.calls[0][0];
      act(() => {
        updateListener({ editorState: { read: (fn: any) => fn() } });
      });
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });
  });

  describe('Toolbar Functionality', () => {
    it('dispatches bold command when bold button is clicked', async () => {
      render(<TextEditor />);
      
      const boldButton = screen.getByRole('button', { name: 'B' });
      await user.click(boldButton);
      
      expect(mockEditor.dispatchCommand).toHaveBeenCalledWith('FORMAT_TEXT_COMMAND', 'bold');
    });

    it('dispatches italic command when italic button is clicked', async () => {
      render(<TextEditor />);
      
      const italicButton = screen.getByRole('button', { name: 'I' });
      await user.click(italicButton);
      
      expect(mockEditor.dispatchCommand).toHaveBeenCalledWith('FORMAT_TEXT_COMMAND', 'italic');
    });

    it('dispatches underline command when underline button is clicked', async () => {
      render(<TextEditor />);
      
      const underlineButton = screen.getByRole('button', { name: 'U' });
      await user.click(underlineButton);
      
      expect(mockEditor.dispatchCommand).toHaveBeenCalledWith('FORMAT_TEXT_COMMAND', 'underline');
    });

    it('dispatches unordered list command when bullet list button is clicked', async () => {
      render(<TextEditor />);
      
      const listButton = screen.getByRole('button', { name: '• List' });
      await user.click(listButton);
      
      expect(mockEditor.dispatchCommand).toHaveBeenCalledWith('INSERT_UNORDERED_LIST_COMMAND', undefined);
    });

    it('dispatches ordered list command when numbered list button is clicked', async () => {
      render(<TextEditor />);
      
      const listButton = screen.getByRole('button', { name: '1. List' });
      await user.click(listButton);
      
      expect(mockEditor.dispatchCommand).toHaveBeenCalledWith('INSERT_ORDERED_LIST_COMMAND', undefined);
    });

    it('dispatches undo command when undo button is clicked and undo is available', async () => {
      render(<TextEditor />);
      
      // First enable undo
      const canUndoCallback = mockEditor.registerCommand.mock.calls.find(
        (call: any) => call[0] === 'CAN_UNDO_COMMAND'
      )?.[1];
      
      if (canUndoCallback) {
        act(() => {
          canUndoCallback(true);
        });
      }

      await waitFor(() => {
        const undoButton = screen.getByRole('button', { name: '⎌ Undo' });
        expect(undoButton).not.toBeDisabled();
      });

      const undoButton = screen.getByRole('button', { name: '⎌ Undo' });
      await user.click(undoButton);
      
      expect(mockEditor.dispatchCommand).toHaveBeenCalledWith('UNDO_COMMAND', undefined);
    });

    it('dispatches redo command when redo button is clicked and redo is available', async () => {
      render(<TextEditor />);
      
      // First enable redo
      const canRedoCallback = mockEditor.registerCommand.mock.calls.find(
        (call: any) => call[0] === 'CAN_REDO_COMMAND'
      )?.[1];
      
      if (canRedoCallback) {
        act(() => {
          canRedoCallback(true);
        });
      }

      await waitFor(() => {
        const redoButton = screen.getByRole('button', { name: '↻ Redo' });
        expect(redoButton).not.toBeDisabled();
      });

      const redoButton = screen.getByRole('button', { name: '↻ Redo' });
      await user.click(redoButton);
      
      expect(mockEditor.dispatchCommand).toHaveBeenCalledWith('REDO_COMMAND', undefined);
    });
  });

  describe('Button States', () => {
    it('initially shows no active formatting buttons', () => {
      render(<TextEditor />);
      
      expect(screen.getByRole('button', { name: 'B' })).not.toHaveClass('active');
      expect(screen.getByRole('button', { name: 'I' })).not.toHaveClass('active');
      expect(screen.getByRole('button', { name: 'U' })).not.toHaveClass('active');
    });

    it('shows undo and redo buttons as disabled initially', () => {
      render(<TextEditor />);
      
      expect(screen.getByRole('button', { name: '⎌ Undo' })).toBeDisabled();
      expect(screen.getByRole('button', { name: '↻ Redo' })).toBeDisabled();
    });

    it('updates button states when selection changes', async () => {
      render(<TextEditor />);
      
      // Mock selection with bold formatting
      mockSelection.hasFormat.mockImplementation((format) => format === 'bold');
      
      // Trigger selection change with act wrapper
      const selectionCallback = mockEditor.registerCommand.mock.calls.find(
        (call: any) => call[0] === 'SELECTION_CHANGE_COMMAND'
      )?.[1];
      
      if (selectionCallback) {
        act(() => {
          selectionCallback();
        });
      }
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'B' })).toHaveClass('active');
      });
      
      expect(screen.getByRole('button', { name: 'I' })).not.toHaveClass('active');
    });

    it('enables undo button when undo becomes available', async () => {
      render(<TextEditor />);
      
      const canUndoCallback = mockEditor.registerCommand.mock.calls.find(
        (call: any) => call[0] === 'CAN_UNDO_COMMAND'
      )?.[1];
      
      if (canUndoCallback) {
        act(() => {
          canUndoCallback(true);
        });
      }

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '⎌ Undo' })).not.toBeDisabled();
      });
    });

    it('enables redo button when redo becomes available', async () => {
      render(<TextEditor />);
      
      const canRedoCallback = mockEditor.registerCommand.mock.calls.find(
        (call: any) => call[0] === 'CAN_REDO_COMMAND'
      )?.[1];
      
      if (canRedoCallback) {
        act(() => {
          canRedoCallback(true);
        });
      }

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '↻ Redo' })).not.toBeDisabled();
      });
    });
  });

  describe('Imperative API', () => {
    it('exposes focus method through ref', () => {
      const ref = React.createRef<TextEditorRef>();
      render(<TextEditor ref={ref} />);
      
      expect(ref.current?.focus).toBeDefined();
      expect(typeof ref.current?.focus).toBe('function');
    });

    it('exposes blur method through ref', () => {
      const ref = React.createRef<TextEditorRef>();
      render(<TextEditor ref={ref} />);
      
      expect(ref.current?.blur).toBeDefined();
      expect(typeof ref.current?.blur).toBe('function');
    });

    it('exposes getHTML method through ref', () => {
      const ref = React.createRef<TextEditorRef>();
      render(<TextEditor ref={ref} />);
      
      expect(ref.current?.getHTML).toBeDefined();
      expect(typeof ref.current?.getHTML).toBe('function');
    });

    it('getHTML returns HTML content', () => {
      const ref = React.createRef<TextEditorRef>();
      render(<TextEditor ref={ref} />);
      
      const html = ref.current?.getHTML();
      expect(html).toBe('<p>test content</p>');
    });
  });

  describe('Plugins', () => {
    it('renders history plugin', () => {
      render(<TextEditor />);
      expect(screen.getByTestId('history-plugin')).toBeInTheDocument();
    });

    it('renders list plugin', () => {
      render(<TextEditor />);
      expect(screen.getByTestId('list-plugin')).toBeInTheDocument();
    });

    it('renders markdown plugin', () => {
      render(<TextEditor />);
      expect(screen.getByTestId('markdown-plugin')).toBeInTheDocument();
    });

    it('registers update listener for onChange', () => {
      const mockOnChange = jest.fn();
      render(<TextEditor onChange={mockOnChange} />);
      
      expect(mockEditor.registerUpdateListener).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('renders error boundary', () => {
      render(<TextEditor />);
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    });

    it('handles empty initial value gracefully', () => {
      expect(() => {
        render(<TextEditor value="" />);
      }).not.toThrow();
    });

    it('handles undefined initial value gracefully', () => {
      expect(() => {
        render(<TextEditor value={undefined} />);
      }).not.toThrow();
    });
  });

  describe('CSS Classes', () => {
    it('applies correct CSS classes to editor elements', () => {
      render(<TextEditor />);
      
      expect(screen.getByTestId('content-editable')).toHaveClass('editor-content');
    });

    it('applies editor-btn class to all toolbar buttons', () => {
      render(<TextEditor />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveClass('editor-btn');
      });
    });
  });

  describe('Integration', () => {
    it('works with all props together', () => {
      const mockOnChange = jest.fn();
      const ref = React.createRef<TextEditorRef>();
      
      render(
        <TextEditor
          value="<p>Initial content</p>"
          onChange={mockOnChange}
          placeholder="Custom placeholder"
          ref={ref}
        />
      );
      
      expect(screen.getByText('Custom placeholder')).toBeInTheDocument();
      expect(mockEditor.update).toHaveBeenCalled();
      expect(ref.current).toBeTruthy();
    });

    it('handles value updates', () => {
      const { rerender } = render(<TextEditor value="<p>Initial</p>" />);
      
      expect(mockEditor.update).toHaveBeenCalled();
      
      rerender(<TextEditor value="<p>Updated</p>" />);
      
      expect(mockEditor.update).toHaveBeenCalledTimes(2);
    });
  });
});