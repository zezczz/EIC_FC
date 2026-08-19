import { Mark, mergeAttributes } from "@tiptap/core";
import { TEXT_COLOR_TOKENS, type TextColorToken } from "@/lib/text-colors";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    textColor: {
      setTextColor: (color: TextColorToken) => ReturnType;
      unsetTextColor: () => ReturnType;
    };
  }
}

export const TextColor = Mark.create({
  name: "textColor",
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) => {
          const value = element.getAttribute("data-text-color");
          return TEXT_COLOR_TOKENS.includes(value as TextColorToken) ? value : null;
        },
        renderHTML: (attributes) => {
          if (!TEXT_COLOR_TOKENS.includes(attributes.color as TextColorToken)) return {};
          return {
            "data-text-color": attributes.color,
            class: `text-color-${attributes.color}`,
          };
        },
      },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-text-color]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes), 0];
  },
  addCommands() {
    return {
      setTextColor:
        (color) =>
        ({ commands }) =>
          commands.setMark(this.name, { color }),
      unsetTextColor:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});
