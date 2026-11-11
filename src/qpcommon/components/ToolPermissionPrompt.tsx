import { Alert, Button } from "@ui";
import { FunctionComponent } from "react";

interface ToolPermissionPromptProps {
  assistantName: string;
  toolName: string;
  /** A script tool reads "wants to run a script". */
  isScript: boolean;
  onAllow: () => void;
  onDeny: () => void;
}

const ToolPermissionPrompt: FunctionComponent<ToolPermissionPromptProps> = ({
  assistantName,
  toolName,
  isScript,
  onAllow,
  onDeny,
}) => (
  <Alert
    status="warning"
    title={
      isScript
        ? `${assistantName} wants to run a script`
        : `${assistantName} wants to use ${toolName}`
    }
  >
    <p>
      The assistant wants to use the tool: <strong>{toolName}</strong>
    </p>
    {/* Alert's own actions are Secondary and Ghost; Allow has to be Primary. */}
    <div className="ns-alert-actions">
      <Button variant="primary" size="sm" onClick={onAllow}>
        Allow
      </Button>
      <Button variant="secondary" size="sm" onClick={onDeny}>
        Deny
      </Button>
    </div>
  </Alert>
);

export default ToolPermissionPrompt;
