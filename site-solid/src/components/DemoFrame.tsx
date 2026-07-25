import { JSXElement } from "solid-js";

export default function DemoFrame(props: {
  title: string;
  description: string;
  children: JSXElement;
  code: string;
}) {
  return (
    <div class="space-y-4">
      <div class="space-y-1">
        <h3 class="text-lg font-medium">{props.title}</h3>
        <p class="max-w-2xl text-sm text-[var(--color-muted)]">{props.description}</p>
      </div>
      <div class="overflow-hidden rounded-lg border border-[var(--color-line)]">{props.children}</div>
      <pre class="overflow-x-auto rounded-lg border border-[var(--color-line)] bg-black/40 p-4 text-xs leading-relaxed text-[var(--color-muted)]">
        <code>{props.code}</code>
      </pre>
    </div>
  );
}
