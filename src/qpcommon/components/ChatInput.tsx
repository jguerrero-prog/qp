import { Button, TextArea } from "@ui";
import {
  FunctionComponent,
  useCallback,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import "./ChatInput.css";

interface ChatInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  /** Locks the field, for a stopped chat, an error or a missing API key. */
  disabled?: boolean;
  /** The assistant is answering: the field stays typable and Send is off. */
  working?: boolean;
}

const ChatInput: FunctionComponent<ChatInputProps> = ({
  label,
  value,
  onChange,
  onSubmit,
  disabled = false,
  working = false,
}) => {
  const canSend = value.trim() !== "" && !disabled && !working;

  const send = useCallback(() => {
    if (canSend) onSubmit();
  }, [canSend, onSubmit]);

  const sendOnEnter = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (
        event.key !== "Enter" ||
        event.shiftKey ||
        event.nativeEvent.isComposing
      )
        return;
      event.preventDefault();
      send();
    },
    [send],
  );

  const submit = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      send();
    },
    [send],
  );

  return (
    <form className="chat-input" onSubmit={submit}>
      <TextArea
        label={label}
        hideLabel
        helper="Enter to send, Shift+Enter for a new line"
        value={value}
        onChange={onChange}
        onKeyDown={sendOnEnter}
        rows={2}
        maxRows={8}
        disabled={disabled}
      />
      <Button type="submit" variant="primary" disabled={!canSend}>
        Send
      </Button>
    </form>
  );
};

export default ChatInput;
