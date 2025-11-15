import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Connect.css";

export function Connect() {
  const [name, setName] = useState("");
  const [step, setStep] = useState<"name" | "action">("name");
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const navigate = useNavigate();

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      localStorage.setItem("userName", name.trim());
      setStep("action");
    }
  };

  const handleCreateNew = () => {
    const newId = `spreadsheet-${Date.now()}`;
    navigate(`/spreadsheet/${newId}`);
  };

  const handleJoinExisting = (e: React.FormEvent) => {
    e.preventDefault();
    if (spreadsheetId.trim()) {
      navigate(`/spreadsheet/${spreadsheetId.trim()}`);
    }
  };

  return (
    <div className="connect-page">
      <div className="connect-card">
        {step === "name" ? (
          <>
            <h1>Join Spreadsheet</h1>
            <form onSubmit={handleNameSubmit}>
              <input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
              />
              <button type="submit" disabled={!name.trim()}>
                Continue
              </button>
            </form>
          </>
        ) : (
          <>
            <h1>Welcome, {name}!</h1>
            <div className="action-section">
              <button className="create-btn" onClick={handleCreateNew}>
                Create New Spreadsheet
              </button>
              <div className="divider">
                <span>or</span>
              </div>
              <form onSubmit={handleJoinExisting}>
                <input
                  type="text"
                  placeholder="Enter spreadsheet ID"
                  value={spreadsheetId}
                  onChange={(e) => setSpreadsheetId(e.target.value)}
                  autoFocus
                  required
                />
                <button type="submit" disabled={!spreadsheetId.trim()}>
                  Join Existing Spreadsheet
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
