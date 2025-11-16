import React, { useRef, forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import { TRANSFORMERS } from '@lexical/markdown';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListNode, ListItemNode, INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from '@lexical/list';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { CodeNode, CodeHighlightNode } from '@lexical/code';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { $getRoot, $insertNodes, $getSelection, $isRangeSelection } from 'lexical';
import { FORMAT_TEXT_COMMAND, UNDO_COMMAND, REDO_COMMAND, CAN_UNDO_COMMAND, CAN_REDO_COMMAND, SELECTION_CHANGE_COMMAND } from 'lexical';
import { mergeRegister } from '@lexical/utils';
import './styles.css';

export interface TextEditorProps {
    value?: string;
    onChange?: (html: string) => void;
    placeholder?: string;
}

export interface TextEditorRef {
    focus: () => void;
    blur: () => void;
    getHTML: () => string;
}

const theme = {
    text: {
        bold: 'bold',
        italic: 'italic',
        underline: 'underline',
    },
    list: {
        ul: 'editor-ul',
        ol: 'editor-ol',
        listitem: 'editor-listitem',
    },
    code: 'editor-code',
    codeHighlight: {
        atrule: 'editor-tokenAttr',
        attr: 'editor-tokenAttr',
        boolean: 'editor-tokenProperty',
        builtin: 'editor-tokenSelector',
        cdata: 'editor-tokenComment',
        comment: 'editor-tokenComment',
        constant: 'editor-tokenProperty',
        deleted: 'editor-tokenProperty',
        doctype: 'editor-tokenComment',
        entity: 'editor-tokenOperator',
        function: 'editor-tokenFunction',
        important: 'editor-tokenVariable',
        keyword: 'editor-tokenSelector',
        namespace: 'editor-tokenVariable',
        number: 'editor-tokenProperty',
        operator: 'editor-tokenOperator',
        prolog: 'editor-tokenComment',
        property: 'editor-tokenProperty',
        punctuation: 'editor-tokenPunctuation',
        regex: 'editor-tokenVariable',
        selector: 'editor-tokenSelector',
        string: 'editor-tokenSelector',
        symbol: 'editor-tokenProperty',
        tag: 'editor-tokenProperty',
        url: 'editor-tokenOperator',
        variable: 'editor-tokenVariable',
    },
};

const initialConfig = {
    namespace: 'TextEditor',
    theme,
    onError: (error: Error) => console.error(error),
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, AutoLinkNode, LinkNode, CodeNode, CodeHighlightNode],
};

const EditorContent = forwardRef<TextEditorRef, TextEditorProps>(({ value = '', onChange, placeholder = 'Type here...' }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [editor] = useLexicalComposerContext();
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [isUnderline, setIsUnderline] = useState(false);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    useEffect(() => {
        editor.update(() => {
            const root = $getRoot();
            root.clear();
            const parser = new DOMParser();
            const dom = parser.parseFromString(value || '<p></p>', 'text/html');
            const nodes = $generateNodesFromDOM(editor, dom);
            $insertNodes(nodes);
        });
    }, [editor, value]);

    const handleChange = () => {
        editor.update(() => {
            const html = $generateHtmlFromNodes(editor);
            if (onChange) onChange(html);
        });
    };

    useEffect(() => {
        return mergeRegister(
            editor.registerCommand(
                SELECTION_CHANGE_COMMAND,
                () => {
                    const selection = $getSelection();
                    if ($isRangeSelection(selection)) {
                        setIsBold(selection.hasFormat('bold'));
                        setIsItalic(selection.hasFormat('italic'));
                        setIsUnderline(selection.hasFormat('underline'));
                    }
                    return false;
                },
                1
            ),
            editor.registerCommand(
                CAN_UNDO_COMMAND,
                (payload: boolean) => {
                    setCanUndo(payload);
                    return false;
                },
                1
            ),
            editor.registerCommand(
                CAN_REDO_COMMAND,
                (payload: boolean) => {
                    setCanRedo(payload);
                    return false;
                },
                1
            )
        );
    }, [editor]);

    useImperativeHandle(ref, () => ({
        focus: () => editorRef.current?.focus(),
        blur: () => editorRef.current?.blur(),
        getHTML: () => $generateHtmlFromNodes(editor),
    }));

    return (
        <div className="custom-editor">
            <div className="editor-toolbar">
                <button
                    onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
                    className={`editor-btn ${isBold ? 'active' : ''}`}
                >
                    B
                </button>
                <button
                    onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
                    className={`editor-btn ${isItalic ? 'active' : ''}`}
                >
                    I
                </button>
                <button
                    onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}
                    className={`editor-btn ${isUnderline ? 'active' : ''}`}
                >
                    U
                </button>
                <button
                    onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}
                    className="editor-btn"
                >
                    • List
                </button>
                <button
                    onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}
                    className="editor-btn"
                >
                    1. List
                </button>
                <button
                    disabled={!canUndo}
                    onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
                    className="editor-btn"
                >
                    ⎌ Undo
                </button>
                <button
                    disabled={!canRedo}
                    onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
                    className="editor-btn"
                >
                    ↻ Redo
                </button>
            </div>
            <RichTextPlugin
                contentEditable={<ContentEditable ref={editorRef} className="editor-content" />}
                placeholder={<div className="editor-placeholder">{placeholder}</div>}
                ErrorBoundary={LexicalErrorBoundary}
            />
            <HistoryPlugin />
            <ListPlugin />
            <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
            <OnChangePlugin onChange={handleChange} />
        </div>
    );
});

const TextEditor = forwardRef<TextEditorRef, TextEditorProps>((props, ref) => {
    return (
        <LexicalComposer initialConfig={initialConfig}>
            <EditorContent {...props} ref={ref} />
        </LexicalComposer>
    );
});

export default TextEditor;

function OnChangePlugin({ onChange }: { onChange: () => void }) {
    const [editor] = useLexicalComposerContext();
    useEffect(() => {
        return editor.registerUpdateListener(({ editorState }) => {
            editorState.read(onChange);
        });
    }, [editor, onChange]);
    return null;
}