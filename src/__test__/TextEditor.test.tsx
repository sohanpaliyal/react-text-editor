import '@testing-library/jest-dom';
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import TextEditor from '../TextEditor';
import {
    $getSelection,
    $isRangeSelection,
    $createParagraphNode,
    $createTextNode,
    $getRoot,
    LexicalEditor,
    UNDO_COMMAND,
} from 'lexical';
import { FORMAT_TEXT_COMMAND, REDO_COMMAND } from 'lexical';
import { $generateHtmlFromNodes } from '@lexical/html';
import { ListNode, ListItemNode, INSERT_UNORDERED_LIST_COMMAND } from '@lexical/list';
import { CodeNode } from '@lexical/code';

// Mock Lexical utilities
jest.mock('lexical', () => {
    const original = jest.requireActual('lexical');
    return {
        ...original,
        $getSelection: jest.fn(),
        $isRangeSelection: jest.fn(),
        $createParagraphNode: jest.fn(),
        $createTextNode: jest.fn(),
        $getRoot: jest.fn(),
    };
});

jest.mock('@lexical/html', () => ({
    ...jest.requireActual('@lexical/html'),
    $generateHtmlFromNodes: jest.fn(),
}));

jest.mock('@lexical/list', () => ({
    ...jest.requireActual('@lexical/list'),
    $createListNode: jest.fn(),
    $createListItemNode: jest.fn(),
}));

jest.mock('@lexical/code', () => ({
    ...jest.requireActual('@lexical/code'),
    $createCodeNode: jest.fn(),
}));

describe('TextEditor', () => {
    let mockEditor: LexicalEditor;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Mock editor instance
        mockEditor = {
            update: jest.fn((callback) => callback()),
            dispatchCommand: jest.fn((command, payload) => true),
            getRoot: jest.fn().mockReturnValue({
                clear: jest.fn(),
                append: jest.fn(),
                getChildren: () => [{ getKey: () => 'mock-child-key' }],
            }),
            _updateDOM: jest.fn(),
        } as unknown as LexicalEditor;

        // Mock $getSelection
        ($getSelection as jest.Mock).mockReturnValue({
            isCollapsed: jest.fn().mockReturnValue(true),
            hasFormat: jest.fn((format: string) => format === 'bold'),
            format: jest.fn(),
            insertNodes: jest.fn(),
            getTextContent: jest.fn().mockReturnValue('Test'),
            getNodes: jest.fn().mockReturnValue([]),
        });

        // Mock $isRangeSelection
        ($isRangeSelection as unknown as jest.Mock).mockReturnValue(true);

        // Mock $createParagraphNode
        ($createParagraphNode as jest.Mock).mockReturnValue({
            append: jest.fn(),
            getKey: () => 'mock-paragraph-key',
            setFormat: jest.fn(),
        });

        // Mock $createTextNode
        ($createTextNode as jest.Mock).mockReturnValue({
            setFormat: jest.fn(),
            getTextContent: () => 'Test',
        });

        // Mock $getRoot
        ($getRoot as jest.Mock).mockReturnValue({
            clear: jest.fn(),
            append: jest.fn(),
            getChildren: () => [{ getKey: () => 'mock-child-key' }],
        });

        // Mock $generateHtmlFromNodes
        ($generateHtmlFromNodes as jest.Mock).mockImplementation(() => '<p>Test</p>');

        // Mock list nodes
        const mockListNode = {
            append: jest.fn(),
            getKey: () => 'mock-list-key',
            getTag: () => 'ul',
        };
        const mockListItemNode = {
            append: jest.fn(),
            getKey: () => 'mock-list-item-key',
        };
        (require('@lexical/list').$createListNode as jest.Mock).mockReturnValue(mockListNode);
        (require('@lexical/list').$createListItemNode as jest.Mock).mockReturnValue(mockListItemNode);

        // Mock code node
        (require('@lexical/code').$createCodeNode as jest.Mock).mockReturnValue({
            append: jest.fn(),
            getKey: () => 'mock-code-key',
            getTextContent: () => 'console.log("Hello");',
        });
    });

    test('renders editor and handles input', async () => {
        const onChange = jest.fn();
        const { container } = render(<TextEditor onChange={onChange} />);
        const editor = container.querySelector('[contenteditable]')!;

        ($getSelection as jest.Mock).mockReturnValue({
            isCollapsed: jest.fn().mockReturnValue(true),
            insertNodes: jest.fn(),
            getTextContent: () => 'Test',
        });

        fireEvent.input(editor, { target: { textContent: 'Test' } });

        await waitFor(() => {
            expect($getRoot).toHaveBeenCalled();
            expect(onChange).toHaveBeenCalledWith('<p>Test</p>');
        });
    });

    test('applies bold formatting', async () => {
        const onChange = jest.fn();
        const { getByText } = render(<TextEditor onChange={onChange} />);
        const boldButton = getByText('Bold');
        const editor = getByText('Type here...').parentElement!.querySelector('[contenteditable]')!;

        ($getSelection as jest.Mock).mockReturnValue({
            isCollapsed: jest.fn().mockReturnValue(true),
            hasFormat: jest.fn().mockReturnValue(true),
            format: jest.fn(),
            getTextContent: () => 'Test',
        });

        ($generateHtmlFromNodes as jest.Mock).mockReturnValue('<p><strong>Test</strong></p>');

        fireEvent.input(editor, { target: { textContent: 'Test' } });
        fireEvent.click(boldButton);

        await waitFor(() => {
            expect(mockEditor.dispatchCommand).toHaveBeenCalledWith(FORMAT_TEXT_COMMAND, 'bold');
            expect(onChange).toHaveBeenCalledWith('<p><strong>Test</strong></p>');
        });
    });

    test('handles undo and redo', async () => {
        const onChange = jest.fn();
        const { getByText, container } = render(<TextEditor onChange={onChange} />);
        const editor = container.querySelector('[contenteditable]')!;
        const undoButton = getByText('Undo');
        const redoButton = getByText('Redo');

        fireEvent.input(editor, { target: { textContent: 'First' } });
        ($generateHtmlFromNodes as jest.Mock).mockReturnValueOnce('<p>First</p>');
        fireEvent.input(editor, { target: { textContent: 'Second' } });
        ($generateHtmlFromNodes as jest.Mock).mockReturnValueOnce('<p>Second</p>');

        fireEvent.click(undoButton);
        ($generateHtmlFromNodes as jest.Mock).mockReturnValueOnce('<p>First</p>');

        await waitFor(() => {
            expect(mockEditor.dispatchCommand).toHaveBeenCalledWith(UNDO_COMMAND, undefined);
            expect(onChange).toHaveBeenCalledWith('<p>First</p>');
        });

        fireEvent.click(redoButton);
        ($generateHtmlFromNodes as jest.Mock).mockReturnValueOnce('<p>Second</p>');

        await waitFor(() => {
            expect(mockEditor.dispatchCommand).toHaveBeenCalledWith(REDO_COMMAND, undefined);
            expect(onChange).toHaveBeenCalledWith('<p>Second</p>');
        });
    });

    test('inserts bullet list', async () => {
        const onChange = jest.fn();
        const { getByText } = render(<TextEditor onChange={onChange} />);
        const bulletButton = getByText('Bullet List');
        const editor = getByText('Type here...').parentElement!.querySelector('[contenteditable]')!;

        ($getSelection as jest.Mock).mockReturnValue({
            isCollapsed: jest.fn().mockReturnValue(true),
            insertNodes: jest.fn(),
            getTextContent: () => 'Test',
        });

        ($generateHtmlFromNodes as jest.Mock).mockReturnValue('<ul><li>Test</li></ul>');

        fireEvent.input(editor, { target: { textContent: 'Test' } });
        fireEvent.click(bulletButton);

        await waitFor(() => {
            expect(mockEditor.dispatchCommand).toHaveBeenCalledWith(INSERT_UNORDERED_LIST_COMMAND, undefined);
            expect(onChange).toHaveBeenCalledWith('<ul><li>Test</li></ul>');
        });
    });

    test('handles markdown code block', async () => {
        const onChange = jest.fn();
        const { getByText } = render(<TextEditor onChange={onChange} />);
        const editor = getByText('Type here...').parentElement!.querySelector('[contenteditable]')!;

        ($getSelection as jest.Mock).mockReturnValue({
            isCollapsed: jest.fn().mockReturnValue(true),
            insertNodes: jest.fn(),
            getTextContent: () => 'console.log("Hello");',
        });

        ($generateHtmlFromNodes as jest.Mock).mockReturnValue('<pre><code class="editor-code">console.log("Hello");</code></pre>');

        fireEvent.input(editor, { target: { textContent: '```javascript\nconsole.log("Hello");\n```' } });

        await waitFor(() => {
            expect(onChange).toHaveBeenCalledWith('<pre><code class="editor-code">console.log("Hello");</code></pre>');
        });
    });

    test('renders error boundary on error', async () => {
        ($getRoot as jest.Mock).mockImplementationOnce(() => {
            throw new Error('Test error');
        });

        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => { });
        const { getByText } = render(<TextEditor />);

        await waitFor(() => {
            expect(getByText('Something went wrong in the editor. Please try again.')).toBeInTheDocument();
            expect(consoleError).toHaveBeenCalledWith(expect.any(Error));
        });

        consoleError.mockRestore();
    });

    test('renders placeholder when empty', async () => {
        const { getByText, queryByText } = render(<TextEditor placeholder="Type here..." />);
        expect(getByText('Type here...')).toBeInTheDocument();

        const editor = getByText('Type here...').parentElement!.querySelector('[contenteditable]')!;
        ($generateHtmlFromNodes as jest.Mock).mockReturnValue('<p>Test</p>');

        fireEvent.input(editor, { target: { textContent: 'Test' } });

        await waitFor(() => {
            expect(queryByText('Type here...')).not.toBeInTheDocument();
        });
    });
});