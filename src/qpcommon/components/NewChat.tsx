import { Button } from "@ui";
import "@ui/EmptyState/EmptyState.css";
import { FunctionComponent, ReactNode, useId } from "react";
import "./NewChat.css";

const MAX_PROMPTS = 4;

interface NewChatProps {
  title: string;
  description: ReactNode;
  prompts: string[];
  onPrompt: (prompt: string) => void;
  disabled?: boolean;
}

/** The Empty state's anatomy, with a block description and several prompts, which EmptyState can't hold. */
const NewChat: FunctionComponent<NewChatProps> = ({
  title,
  description,
  prompts,
  onPrompt,
  disabled = false,
}) => {
  const titleId = useId();
  const shown = prompts.slice(0, MAX_PROMPTS);
  return (
    <section className="ns-empty" aria-labelledby={titleId}>
      <h2 id={titleId} className="ns-empty-title">
        {title}
      </h2>
      <div className="ns-empty-reason new-chat-description">{description}</div>
      {shown.length > 0 && (
        <ul
          className="ns-empty-actions new-chat-prompts"
          aria-label="Suggested prompts"
        >
          {shown.map((prompt) => (
            <li key={prompt}>
              <Button
                variant="secondary"
                disabled={disabled}
                onClick={() => onPrompt(prompt)}
              >
                {prompt}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default NewChat;
