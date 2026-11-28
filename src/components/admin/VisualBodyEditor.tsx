"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

/** Imperative surface the Studio uses to drop an uploaded image into the body. */
export type VisualBodyEditorHandle = {
  /** Insert an HTML snippet at the caret (or at the end when unfocused). */
  insertHtml: (snippet: string) => void;
  /** Move focus into the editor. */
  focus: () => void;
};

/**
 * Visual (WYSIWYG) body editor for the Studio editorial desk.
 *
 * Editors write the article as it will appear — headings, bold, quotes, lists,
 * links and images — instead of hand-writing HTML. The component keeps the
 * canonical `bodyHtml` string as its value, so everything downstream (the
 * sanitizer, the article renderer, the social card) is unchanged: this is a
 * different way to produce the same sanitized HTML, not a new storage format.
 *
 * Implementation notes:
 * - `contentEditable` is used directly rather than pulling in an editor
 *   dependency, so the Studio keeps its existing bundle and CSP posture.
 * - The DOM is only written from `value` when the incoming value differs from
 *   what the editor itself last emitted. Without that guard every keystroke
 *   would reset the caret to the start of the document.
 * - Paste is intercepted and reduced to plain text so pasting from Word or a
 *   web page cannot smuggle in styles, classes or scripts. Images are added
 *   through the toolbar, which uploads to the media library first.
 */

type Props = {
  value: string;
  onChange: (html: string) => void;
  onRequestImage: () => void;
  onRequestLibrary: () => void;
  placeholder?: string;
};

const TOOLBAR_BUTTON =
  "border border-neutral-700 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-200 transition hover:border-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40";

/** Commands the browser executes natively against the current selection. */
const INLINE_COMMANDS: Array<{ label: string; command: string; arg?: string; title: string }> = [
  { label: "B", command: "bold", title: "Bold (Ctrl/Cmd+B)" },
  { label: "I", command: "italic", title: "Italic (Ctrl/Cmd+I)" },
  { label: "U", command: "underline", title: "Underline (Ctrl/Cmd+U)" },
];

const BLOCK_COMMANDS: Array<{ label: string; command: string; arg?: string; title: string }> = [
  { label: "H2", command: "formatBlock", arg: "h2", title: "Section heading" },
  { label: "H3", command: "formatBlock", arg: "h3", title: "Sub-heading" },
  { label: "¶", command: "formatBlock", arg: "p", title: "Body paragraph" },
  { label: "❝", command: "formatBlock", arg: "blockquote", title: "Pull quote" },
  { label: "• List", command: "insertUnorderedList", title: "Bulleted list" },
  { label: "1. List", command: "insertOrderedList", title: "Numbered list" },
];

export default forwardRef<VisualBodyEditorHandle, Props>(function VisualBodyEditor({ value, onChange, onRequestImage, onRequestLibrary, placeholder }, ref) {
  const editorRef = useRef<HTMLDivElement>(null);
  // The last HTML this editor emitted. Used to tell "the user typed" apart from
  // "the parent loaded a different article", so we never clobber the caret.
  const lastEmitted = useRef<string>("");
  const [focused, setFocused] = useState(false);
  const [isEmpty, setIsEmpty] = useState(!value || value === "<p></p>");

  // Load external changes (opening another article, a save round-trip) into the
  // DOM, but leave the DOM alone while the user is the source of the change.
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (value === lastEmitted.current) return;
    if (el.innerHTML !== value) el.innerHTML = value || "";
    lastEmitted.current = value;
    setIsEmpty(!value || value === "<p></p>");
  }, [value]);

  const emit = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const html = el.innerHTML;
    lastEmitted.current = html;
    setIsEmpty(!el.textContent?.trim() && !el.querySelector("img,iframe,figure"));
    onChange(html);
  }, [onChange]);

  const run = useCallback(
    (command: string, arg?: string) => {
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      // `styleWithCSS` off keeps the output semantic (<b>/<i>/<h2>) rather than
      // inline styles, which the sanitizer would strip.
      try {
        document.execCommand("styleWithCSS", false, "false");
      } catch {
        /* not supported everywhere; the default is already semantic */
      }
      document.execCommand(command, false, arg);
      emit();
    },
    [emit],
  );

  const addLink = useCallback(() => {
    const url = window.prompt("Link URL (https://…)");
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      window.alert("Links must start with http:// or https://");
      return;
    }
    run("createLink", url);
  }, [run]);

  // Paste as plain text: prevents foreign markup, inline styles and scripts
  // from entering the body, which is what the sanitizer would otherwise have to
  // strip after the fact.
  const handlePaste = useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>) => {
      event.preventDefault();
      const text = event.clipboardData.getData("text/plain");
      if (!text) return;
      document.execCommand("insertText", false, text);
      emit();
    },
    [emit],
  );

  // Insert an uploaded image (or any snippet) at the caret. Falls back to
  // appending when the editor has never been focused, so a toolbar upload
  // always lands somewhere sensible.
  useImperativeHandle(
    ref,
    () => ({
      insertHtml: (snippet: string) => {
        const el = editorRef.current;
        if (!el) return;
        el.focus();
        const selection = window.getSelection();
        const hasCaret = selection && selection.rangeCount > 0 && el.contains(selection.anchorNode);
        if (!hasCaret) {
          const range = document.createRange();
          range.selectNodeContents(el);
          range.collapse(false);
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
        document.execCommand("insertHTML", false, snippet);
        emit();
      },
      focus: () => editorRef.current?.focus(),
    }),
    [emit],
  );

  return (
    <div className="border border-neutral-800">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-neutral-800 bg-neutral-900 px-2 py-2">
        {INLINE_COMMANDS.map((item) => (
          <button key={item.label} type="button" title={item.title} className={TOOLBAR_BUTTON} onMouseDown={(e) => e.preventDefault()} onClick={() => run(item.command, item.arg)}>
            {item.label}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-neutral-700" aria-hidden />
        {BLOCK_COMMANDS.map((item) => (
          <button key={item.label} type="button" title={item.title} className={TOOLBAR_BUTTON} onMouseDown={(e) => e.preventDefault()} onClick={() => run(item.command, item.arg)}>
            {item.label}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-neutral-700" aria-hidden />
        <button type="button" title="Insert a link" className={TOOLBAR_BUTTON} onMouseDown={(e) => e.preventDefault()} onClick={addLink}>
          Link
        </button>
        <button type="button" title="Upload an image into the article" className={TOOLBAR_BUTTON} onMouseDown={(e) => e.preventDefault()} onClick={onRequestImage}>
          + Image
        </button>
        <button type="button" title="Insert an image already in the media library" className={TOOLBAR_BUTTON} onMouseDown={(e) => e.preventDefault()} onClick={onRequestLibrary}>
          Library
        </button>
        <span className="mx-1 h-5 w-px bg-neutral-700" aria-hidden />
        <button type="button" title="Remove formatting from the selection" className={TOOLBAR_BUTTON} onMouseDown={(e) => e.preventDefault()} onClick={() => run("removeFormat")}>
          Clear
        </button>
        <span className="ml-auto font-mono text-[9px] uppercase tracking-widest text-neutral-500">Visual editor</span>
      </div>

      <div className="relative">
        {isEmpty && !focused && (
          <p className="pointer-events-none absolute left-4 top-4 font-mono text-xs uppercase tracking-widest text-neutral-600">
            {placeholder || "Write the article…"}
          </p>
        )}
        <div
          ref={editorRef}
          role="textbox"
          aria-multiline="true"
          aria-label="Article body"
          tabIndex={0}
          contentEditable
          suppressContentEditableWarning
          onInput={emit}
          onBlur={() => {
            setFocused(false);
            emit();
          }}
          onFocus={() => setFocused(true)}
          onPaste={handlePaste}
          className="editorial-body min-h-[26rem] max-h-[46rem] overflow-y-auto bg-neutral-950 px-4 py-4 text-sm leading-relaxed text-neutral-100 outline-none focus:ring-1 focus:ring-neutral-600 [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-neutral-500 [&_blockquote]:pl-3 [&_h2]:mt-5 [&_h2]:text-2xl [&_h2]:font-black [&_h2]:uppercase [&_h3]:mt-4 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:uppercase [&_img]:my-4 [&_img]:h-auto [&_img]:w-full [&_li]:ml-5 [&_ol]:list-decimal [&_p]:my-3 [&_ul]:list-disc"
        />
      </div>

      <p className="border-t border-neutral-800 px-3 py-2 font-mono text-[9px] uppercase leading-relaxed tracking-widest text-neutral-500">
        Write as it will appear. Images are uploaded to the media library and inserted as figures. Paste is inserted as plain text.
      </p>
    </div>
  );
});
