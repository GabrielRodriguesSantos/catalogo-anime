"use client";

/* eslint-disable @next/next/no-img-element */

export type CustomEmojiClient = {
  id: string;
  name: string;
  prompt: string;
  imagePath: string;
};

const COMMON_EMOJIS = [
  "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣",
  "😊", "😇", "🙂", "😉", "😍", "🥰", "😘", "😋",
  "😎", "🤩", "🥳", "😢", "😭", "😤", "😡", "🥺",
  "😳", "🤔", "🙄", "😴", "🤯", "😱", "🤗", "🤐",
  "😷", "🤒", "🤕", "🤑", "🤠", "👻", "💀", "👽",
  "🤖", "👍", "👎", "👏", "🙏", "💪", "✌️", "🤝",
  "🔥", "✨", "🎉", "🎊", "❤️", "💔", "💯", "✅",
  "❌", "⚠️", "⭐", "🎁", "🎬", "📚", "🍕", "☕",
];

export function EmojiPicker({
  customEmojis,
  onPick,
  onClose,
}: {
  customEmojis: CustomEmojiClient[];
  onPick: (payload: { unicode?: string; emojiId?: string; name?: string }) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute bottom-16 left-1 right-1 z-20 max-h-72 overflow-y-auto rounded-2xl border border-black/[.08] bg-white p-3 shadow-xl dark:border-white/[.145] dark:bg-zinc-900">
      <div className="grid grid-cols-8 gap-1">
        {COMMON_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onPick({ unicode: emoji })}
            className="flex h-9 items-center justify-center rounded-lg text-xl hover:bg-black/[.05] dark:hover:bg-white/[.08]"
            aria-label={`Enviar emoji ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
      {customEmojis.length > 0 && (
        <>
          <p className="mt-3 mb-1 px-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Seus emojis gerados
          </p>
          <div className="grid grid-cols-8 gap-1">
            {customEmojis.map((emoji) => (
              <button
                key={emoji.id}
                type="button"
                onClick={() =>
                  onPick({ emojiId: emoji.id, name: emoji.name })
                }
                title={`${emoji.name} — ${emoji.prompt}`}
                className="flex h-9 items-center justify-center rounded-lg hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                aria-label={`Enviar emoji ${emoji.name}`}
              >
                <img
                  src={emoji.imagePath}
                  alt={emoji.name}
                  className="h-7 w-7 object-contain"
                />
              </button>
            ))}
          </div>
        </>
      )}
      <div className="mt-2 flex items-center justify-between px-1">
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-zinc-500 underline dark:text-zinc-400"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}