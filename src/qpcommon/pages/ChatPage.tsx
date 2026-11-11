import { Box } from "@mui/material";
import { Badge, Button, InlineMessage, Tooltip, useToast } from "@ui";
import { isPreview } from "../preview";
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Preferences } from "../MainWindow";
import { CHEAP_MODELS } from "../completion/cheapModels";
import AssistantMessageItem, {
  messageContentToString,
} from "../components/AssistantMessageItem";
import ChatInput from "../components/ChatInput";
import MarkdownContent from "../components/MarkdownContent";
import NewChat from "../components/NewChat";
import SettingsDialog from "../components/SettingsDialog";
import ToolPermissionPrompt from "../components/ToolPermissionPrompt";
import UsageDisplay from "../components/UsageDisplay";
import useChat from "../hooks/useChat";
import { saveChat } from "../interface/interface";
import { useJupyterConnectivity } from "../jupyter/JupyterConnectivity";
import { Chat, ChatMessage, QPTool } from "../types";
import { getStoredApiKey } from "../utils/apiKeyStorage";
import "./ChatPage.css";

interface ChatPageProps {
  chatId: string;
  getTools: (chat: Chat) => Promise<QPTool[]>;
  preferences: Preferences;
}

const ChatPage: FunctionComponent<ChatPageProps> = ({
  chatId: chatIdProp,
  getTools,
  preferences,
}) => {
  const [newChatId, setNewChatId] = useState<string | undefined>(undefined);
  const chatId = newChatId !== undefined ? newChatId : chatIdProp;
  const navigate = useNavigate();
  const location = useLocation();
  const jupyterConnectivity = useJupyterConnectivity();
  const [permissionRequest, setPermissionRequest] = useState<{
    toolName: string;
    toolDescription: string;
    resolve: (granted: boolean) => void;
  } | null>(null);

  const handleRequestPermission = useCallback(
    (toolName: string, toolDescription: string): Promise<boolean> => {
      return new Promise((resolve) => {
        setPermissionRequest({ toolName, toolDescription, resolve });
      });
    },
    [],
  );

  const handleAllowPermission = useCallback(() => {
    if (permissionRequest) {
      permissionRequest.resolve(true);
      setPermissionRequest(null);
    }
  }, [permissionRequest]);

  const handleDenyPermission = useCallback(() => {
    if (permissionRequest) {
      permissionRequest.resolve(false);
      setPermissionRequest(null);
    }
  }, [permissionRequest]);

  const setChatId = useCallback((newChatId: string) => {
    setNewChatId(newChatId);
  }, []);

  const toolExecutionContext = useMemo(() => {
    return {
      jupyterConnectivity: jupyterConnectivity,
      imageUrlsNeedToBeUser: true,
      requestPermission: handleRequestPermission,
    };
  }, [jupyterConnectivity, handleRequestPermission]);
  const {
    chat,
    submitUserMessage,
    loadingChat,
    generateInitialResponse,
    responding,
    partialResponse,
    setChatModel,
    error,
    toolsForChat,
    clearChat,
    chatDispatch,
  } = useChat(chatId, setChatId, getTools, preferences, toolExecutionContext);
  const [newPrompt, setNewPrompt] = useState<string>("");
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const conversationRef = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const emptyReasonId = useId();

  // make sure we never generate the initial response more than once
  const generatedInitialResponse = useRef(false);

  // Check if the current model requires an API key
  const requiresApiKey = useMemo(() => {
    if (!chat) return false;
    return !CHEAP_MODELS.includes(chat.model);
  }, [chat]);

  // Check if user has provided an API key
  const hasApiKey = useMemo(() => {
    return !!getStoredApiKey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSettingsOpen]); // Re-check when settings dialog closes

  // Check if chat should be disabled based on last message containing trigger phrases
  const chatDisabledInfo = useMemo(() => {
    if (!chat || chat.messages.length === 0) {
      return { isDisabled: false, reason: "" };
    }

    const lastMessage = chat.messages[chat.messages.length - 1];

    // Only check assistant messages for trigger phrases
    if (lastMessage.role !== "assistant") {
      return { isDisabled: false, reason: "" };
    }

    const content = messageContentToString(lastMessage.content).toLowerCase();

    if (content.includes("#irrelevant")) {
      return {
        isDisabled: true,
        reason:
          "This chat has been disabled because the conversation became irrelevant to the intended purpose.",
      };
    }

    if (content.includes("#personal-info")) {
      return {
        isDisabled: true,
        reason:
          "This chat has been disabled because personal information was shared that should not be made public.",
      };
    }

    if (content.includes("@manipulation")) {
      return {
        isDisabled: true,
        reason:
          "This chat has been disabled due to suspected attempt to manipulate the assistant or break its guidelines.",
      };
    }

    return { isDisabled: false, reason: "" };
  }, [chat]);

  useEffect(() => {
    if (generatedInitialResponse.current) return;
    // if chat only has one message (the initial prompt) and it is from the user, generate a response
    if (
      chat &&
      chat.messages.length === 1 &&
      chat.messages[0].role === "user" &&
      !responding
    ) {
      generatedInitialResponse.current = true;
      generateInitialResponse();
    }
  }, [chat, generateInitialResponse, responding]);

  // Auto-scroll to show new user messages at the top of visible area
  useEffect(() => {
    if (conversationRef.current && chat?.messages.length) {
      const lastMessage = chat.messages[chat.messages.length - 1];
      if (lastMessage.role === "user") {
        // Find the last user message element and scroll it into view
        const messageElements =
          conversationRef.current.querySelectorAll(".message-user");
        const lastUserMessage = messageElements[messageElements.length - 1];
        if (lastUserMessage) {
          const conversationArea = conversationRef.current;
          const availableHeight = conversationArea.clientHeight;

          // Calculate top offset based on available height
          let topOffset = 0;
          if (availableHeight > 800) {
            topOffset = 200;
          } else if (availableHeight > 500) {
            topOffset = 100;
          }

          // Get the position of the last user message relative to the conversation area
          const messageRect = lastUserMessage.getBoundingClientRect();
          const conversationRect = conversationArea.getBoundingClientRect();
          const messageTop = messageRect.top - conversationRect.top;

          // Calculate the scroll position to place the message at the desired offset from top
          const targetScrollTop =
            conversationArea.scrollTop + messageTop - topOffset;

          conversationArea.scrollTo({
            top: targetScrollTop,
            behavior: "smooth",
          });
        }
      }
    }
  }, [chat?.messages]);

  const handleSubmit = useCallback(() => {
    if (newPrompt.trim() === "" || responding) return;
    submitUserMessage(newPrompt.trim());
    setNewPrompt("");
  }, [newPrompt, submitUserMessage, responding]);

  const handleSuggestedPromptClick = useCallback(
    (prompt: string) => {
      if (responding) return;
      submitUserMessage(prompt);
    },
    [submitUserMessage, responding],
  );

  const handleNewChat = useCallback(() => {
    if (chatIdProp) {
      // Viewing a saved chat at /chat/:id — switch to the fresh /chat route.
      // The path changes, so ChatPage remounts under key="new-chat".
      navigate(`/chat${location.search}`, { replace: true });
    } else {
      // Already on the /chat route (new-chat mode). When the first message
      // creates the chat, its id is kept in local state (newChatId) and the URL
      // stays /chat, so navigating here would be a no-op. Reset in place.
      clearChat();
    }
  }, [navigate, location.search, chatIdProp, clearChat]);

  const handleDownloadTranscript = useCallback(() => {
    if (!chat || chat.messages.length === 0) return;

    // Build the transcript in Markdown format
    const lines: string[] = [];
    lines.push(`# Chat Transcript`);
    lines.push(``);
    lines.push(`**Date:** ${new Date().toLocaleString()}`);
    lines.push(`**Model:** ${chat.model}`);
    lines.push(``);
    lines.push(`---`);
    lines.push(``);

    for (const message of chat.messages) {
      if (message.role === "user") {
        lines.push(`## User`);
        lines.push(``);
        const content =
          typeof message.content === "string"
            ? message.content
            : message.content
                .map((part) => (part.type === "text" ? part.text : "[Image]"))
                .join("\n");
        lines.push(content);
        lines.push(``);
      } else if (message.role === "assistant") {
        lines.push(`## Assistant`);
        lines.push(``);
        if (message.content) {
          const content =
            typeof message.content === "string"
              ? message.content
              : message.content
                  .map((part) => (part.type === "text" ? part.text : "[Image]"))
                  .join("\n");
          lines.push(content);
        }
        if (message.tool_calls && message.tool_calls.length > 0) {
          lines.push(``);
          lines.push(`**Tool calls:**`);
          for (const toolCall of message.tool_calls) {
            lines.push(`- \`${toolCall.function.name}\``);
          }
        }
        lines.push(``);
      } else if (message.role === "tool") {
        lines.push(`### Tool Result: ${message.name || "unknown"}`);
        lines.push(``);
        lines.push("```");
        // Truncate very long tool outputs
        const content =
          message.content.length > 2000
            ? message.content.substring(0, 2000) + "\n... (truncated)"
            : message.content;
        lines.push(content);
        lines.push("```");
        lines.push(``);
      }
    }

    // Add usage information
    lines.push(`---`);
    lines.push(``);
    lines.push(`**Total Usage:**`);
    lines.push(`- Prompt tokens: ${chat.totalUsage.promptTokens}`);
    lines.push(`- Completion tokens: ${chat.totalUsage.completionTokens}`);
    lines.push(
      `- Estimated cost: $${chat.totalUsage.estimatedCost.toFixed(4)}`,
    );

    const transcript = lines.join("\n");

    // Create and trigger download
    const blob = new Blob([transcript], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-transcript-${chatId || "new"}-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.show({ status: "success", message: "Transcript downloaded" });
  }, [chat, chatId, toast]);

  const handleFeedbackUpdate = useCallback(
    (
      messageIndex: number,
      feedback: { thumbs?: "up" | "down"; comment?: string },
    ) => {
      if (chatDispatch) {
        chatDispatch({
          type: "update_message_feedback",
          messageIndex,
          feedback,
        });

        // Save to database
        if (chatId && chat) {
          // Create updated chat with the feedback
          const updatedChat = {
            ...chat,
            messages: chat.messages.map((msg, index) => {
              if (index === messageIndex && msg.role === "assistant") {
                return {
                  ...msg,
                  feedback,
                };
              }
              return msg;
            }),
          };

          saveChat(updatedChat).catch((err) => {
            console.error("Error saving feedback:", err);
          });
        }
      }
    },
    [chatDispatch, chatId, chat],
  );

  const handleDeleteMessage = useCallback(
    (messageIndex: number) => {
      if (chatDispatch) {
        chatDispatch({
          type: "delete_message_from_index",
          messageIndex,
        });

        // Save to database
        if (chatId && chat) {
          // Create updated chat with messages deleted from index
          const updatedChat = {
            ...chat,
            messages: chat.messages.slice(0, messageIndex),
          };

          saveChat(updatedChat).catch((err) => {
            console.error("Error saving deleted messages:", err);
          });
        }
      }
    },
    [chatDispatch, chatId, chat],
  );

  const allMessagesIncludingPartialResponse = useMemo(() => {
    if (!chat) return [];
    if (responding && partialResponse) {
      return [
        ...chat.messages.map((m) => ({ message: m, inProgress: false })),
        ...partialResponse.map((m) => ({ message: m, inProgress: true })),
      ];
    }
    return chat.messages.map((m) => ({ message: m, inProgress: false }));
  }, [chat, responding, partialResponse]);

  const allToolMessages = useMemo(() => {
    return allMessagesIncludingPartialResponse
      .filter((m) => m.message.role === "tool")
      .map((m) => m.message);
  }, [allMessagesIncludingPartialResponse]);

  if (!chat && loadingChat) {
    return (
      <div className="chat-container">
        <div className="loading-message">Loading chat...</div>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="chat-container">
        <div className="error-message">{error || "Chat not found."}</div>
      </div>
    );
  }

  const isEmpty = chat.messages.length === 0;
  const emptyReason = "Available after the first message";
  const headerAction = (
    label: string,
    icon: "add" | "download",
    onClick: () => void,
  ) => {
    const button = (
      <Button
        variant="secondary"
        size="sm"
        icon={icon}
        disabled={isEmpty}
        aria-describedby={isEmpty ? emptyReasonId : undefined}
        onClick={onClick}
      >
        {label}
      </Button>
    );
    return isEmpty ? <Tooltip label={emptyReason}>{button}</Tooltip> : button;
  };

  const jupyterStatus = preferences.requiresJupyter && (
    <div
      style={{
        padding: "8px 12px",
        margin: "10px 20px",
        backgroundColor: jupyterConnectivity.jupyterServerIsAvailable
          ? "#f0f9f4"
          : "#fff4e5",
        border: jupyterConnectivity.jupyterServerIsAvailable
          ? "1px solid #c6e8d5"
          : "1px solid #ffe0b2",
        borderRadius: "4px",
        color: jupyterConnectivity.jupyterServerIsAvailable
          ? "#2d5f3f"
          : "#663c00",
        fontSize: "0.85rem",
        textAlign: "center",
      }}
    >
      {jupyterConnectivity.jupyterServerIsAvailable ? (
        <>Jupyter server connected</>
      ) : (
        <>
          Jupyter server not connected. You can still chat with the assistant,
          but Python code execution will not be available until a connection is
          established. Use the ⚙️ settings button below to configure.
        </>
      )}
    </div>
  );

  const composer = (
    <div className="chat-composer">
      {error && (
        <div
          style={{
            padding: "12px",
            margin: "10px 20px",
            backgroundColor: "#fee",
            border: "2px solid #c00",
            borderRadius: "4px",
            color: "#c00",
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          ⚠️ Error: {error}
        </div>
      )}

      {chatDisabledInfo.isDisabled && (
        <div
          style={{
            padding: "12px",
            margin: "10px 20px",
            backgroundColor: "#fee",
            border: "2px solid #c00",
            borderRadius: "4px",
            color: "#c00",
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          ⚠️ {chatDisabledInfo.reason}
        </div>
      )}

      {requiresApiKey &&
        !hasApiKey &&
        !chatDisabledInfo.isDisabled &&
        !error && (
          <div
            style={{
              padding: "12px",
              margin: "10px 20px",
              backgroundColor: "#fff3cd",
              border: "2px solid #ffc107",
              borderRadius: "4px",
              color: "#856404",
              fontWeight: "bold",
              textAlign: "center",
            }}
          >
            ⚠️ This model requires an OpenRouter API key. Click the ⚙️ settings
            button below to add your key or select a less expensive model.
          </div>
        )}

      <ChatInput
        label={`Ask ${preferences.assistantName}`}
        value={newPrompt}
        onChange={setNewPrompt}
        onSubmit={handleSubmit}
        working={responding}
        disabled={
          chatDisabledInfo.isDisabled ||
          !!error ||
          (requiresApiKey && !hasApiKey)
        }
      />
      <div className="chat-notice">
        {isPreview && (
          <InlineMessage status="warning">
            This is a design preview. Sending a message won’t work here yet,
            because the chat server doesn’t accept requests from this address.
          </InlineMessage>
        )}
        <InlineMessage status="info">
          Conversations are saved to help develop {preferences.assistantName}.
          Don’t share personal or sensitive information.
        </InlineMessage>
      </div>
    </div>
  );

  return (
    <div className="chat-page">
      <div className="chat-container">
        <div className="chat-title-row">
          <div className="chat-title">
            <h1 className="chat-title-text">
              {preferences.logo && (
                <img
                  className="chat-title-logo"
                  src={`${import.meta.env.BASE_URL}${preferences.logo}`}
                  alt=""
                />
              )}
              {preferences.assistantName}
            </h1>
            <Badge status="neutral">Experimental</Badge>
          </div>
          <div className="chat-title-actions">
            {headerAction("New chat", "add", handleNewChat)}
            {headerAction("Download", "download", handleDownloadTranscript)}
            <Button
              variant="ghost"
              size="sm"
              icon="logo--github"
              href="https://github.com/magland/qp"
              target="_blank"
              rel="noopener noreferrer"
            >
              Source on GitHub
            </Button>
            {isEmpty && (
              <span id={emptyReasonId} className="ns-visually-hidden">
                {emptyReason}
              </span>
            )}
          </div>
        </div>

        {isEmpty ? (
          <main className="chat-main chat-main--new">
            {jupyterStatus}
            <NewChat
              title={
                preferences.emptyStateTitle ??
                `Ask ${preferences.assistantName}`
              }
              lead={
                preferences.emptyStateLead ?? preferences.assistantDisplayInfo
              }
              prompts={preferences.suggestedPrompts}
              onPrompt={handleSuggestedPromptClick}
            >
              {composer}
            </NewChat>
          </main>
        ) : (
          <main className="chat-main">
            <div className="conversation-area" ref={conversationRef}>
              {jupyterStatus}
              {allMessagesIncludingPartialResponse.map((xx, index) => (
                <MessageItem
                  key={index}
                  message={xx.message}
                  allToolMessages={allToolMessages}
                  tools={toolsForChat}
                  inProgress={xx.inProgress}
                  chatId={chatId}
                  messageIndex={index}
                  onFeedbackUpdate={handleFeedbackUpdate}
                  onDeleteMessage={handleDeleteMessage}
                />
              ))}

              {permissionRequest && (
                <ToolPermissionPrompt
                  toolName={permissionRequest.toolName}
                  onAllow={handleAllowPermission}
                  onDeny={handleDenyPermission}
                />
              )}

              {responding && !partialResponse && (
                <div className="message message-assistant">
                  <div className="partial-response">Thinking...</div>
                </div>
              )}

              {/* Put empty space at the bottom so last message can scroll to top of visible area */}
              <div style={{ height: "1200px" }}></div>
            </div>
            {composer}
          </main>
        )}

        <footer className="chat-footer">
          <UsageDisplay
            model={chat.model}
            setModel={setChatModel}
            totalUsage={chat.totalUsage}
          />
          <Button
            variant="ghost"
            size="sm"
            icon="settings"
            onClick={() => setIsSettingsOpen(true)}
          >
            Settings
          </Button>
        </footer>
      </div>

      <SettingsDialog
        preferences={preferences}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

const MessageItem: FunctionComponent<{
  message: ChatMessage;
  allToolMessages: ChatMessage[];
  tools: QPTool[];
  inProgress: boolean;
  chatId?: string;
  messageIndex: number;
  onFeedbackUpdate: (
    messageIndex: number,
    feedback: { thumbs?: "up" | "down"; comment?: string },
  ) => void;
  onDeleteMessage: (messageIndex: number) => void;
}> = ({
  message,
  allToolMessages,
  tools,
  inProgress,
  chatId,
  messageIndex,
  onFeedbackUpdate,
  onDeleteMessage,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  if (message.role === "user") {
    return (
      <div
        className="message message-user"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ position: "relative" }}
      >
        <div className="message-bubble message-bubble-user">
          {typeof message.content === "string" ? (
            messageContentToString(message.content)
          ) : Array.isArray(message.content) ? (
            // Handle array of content parts (e.g. text + images)
            message.content.map((part, index) => {
              if (part.type === "text") {
                return (
                  <MarkdownContent
                    key={index}
                    content={part.text}
                    // onSpecialLinkClicked={onSpecialLinkClicked}
                  />
                );
              }
              if (part.type === "image_url") {
                return (
                  <Box key={index} sx={{ mt: 1 }}>
                    <img
                      src={part.image_url.url}
                      alt="Content"
                      style={{ borderRadius: 4 }}
                    />
                  </Box>
                );
              }
              return null;
            })
          ) : (
            <>Unsupported message format</>
          )}
        </div>
        {isHovered && typeof message.content === "string" && (
          <button
            onClick={() => onDeleteMessage(messageIndex)}
            style={{
              position: "absolute",
              top: "8px",
              right: "8px",
              background: "rgba(255, 255, 255, 0.7)",
              border: "1px solid rgba(0, 0, 0, 0.1)",
              borderRadius: "4px",
              padding: "2px 6px",
              cursor: "pointer",
              fontSize: "0.75rem",
              color: "#999",
              display: "flex",
              alignItems: "center",
              gap: "3px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              transition: "all 0.2s",
              opacity: 0.6,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.background = "#fee";
              e.currentTarget.style.borderColor = "#c00";
              e.currentTarget.style.color = "#c00";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "0.6";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.7)";
              e.currentTarget.style.borderColor = "rgba(0, 0, 0, 0.1)";
              e.currentTarget.style.color = "#999";
            }}
            title="Delete this message and all messages after it"
          >
            🗑️
          </button>
        )}
      </div>
    );
  } else if (message.role === "assistant") {
    return (
      <AssistantMessageItem
        message={message}
        allToolMessages={allToolMessages}
        tools={tools}
        inProgress={inProgress}
        chatId={chatId}
        onFeedbackUpdate={(feedback) =>
          onFeedbackUpdate(messageIndex, feedback)
        }
      />
    );
  } else {
    return null;
  }
};

export default ChatPage;
